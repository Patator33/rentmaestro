import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'payments';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const companyId = searchParams.get('companyId');

    try {
        if (type === 'payments') {
            const whereClause: any = {
                period: {
                    gte: new Date(year, 0, 1),
                    lte: new Date(year, 11, 31),
                }
            };
            if (companyId) {
                whereClause.lease = { apartment: { companyId } };
            }

            const payments = await prisma.rentPayment.findMany({
                where: whereClause,
                include: {
                    lease: {
                        include: {
                            apartment: true,
                            tenant: true,
                        }
                    }
                },
                orderBy: { period: 'asc' }
            });

            const headers = ['Période', 'Appartement', 'Locataire', 'Montant', 'Statut', 'Date de paiement', 'Date de relance'];
            const rows = payments.map((p: any) => [
                p.period.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                p.lease.apartment.address,
                `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`,
                p.amount.toFixed(2),
                p.status,
                p.paidAt ? p.paidAt.toLocaleDateString('fr-FR') : '',
                p.sentAt ? p.sentAt.toLocaleDateString('fr-FR') : '',
            ]);

            const csv = [headers.join(';'), ...rows.map((r: any) => r.join(';'))].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename=loyers_${year}.csv`,
                },
            });
        }

        if (type === 'annual') {
            const whereClause: any = {
                period: {
                    gte: new Date(year, 0, 1),
                    lte: new Date(year, 11, 31),
                },
                status: 'PAID',
            };
            if (companyId) {
                whereClause.lease = { apartment: { companyId } };
            }

            const payments = await prisma.rentPayment.findMany({
                where: whereClause,
                include: {
                    lease: {
                        include: {
                            apartment: true,
                            tenant: true,
                        }
                    }
                },
            });

            // Group by apartment
            const byApartment = new Map<string, { address: string; city: string; total: number; count: number }>();
            payments.forEach((p: any) => {
                const key = p.lease.apartmentId;
                const existing = byApartment.get(key) || { address: p.lease.apartment.address, city: p.lease.apartment.city, total: 0, count: 0 };
                existing.total += p.amount;
                existing.count += 1;
                byApartment.set(key, existing);
            });

            const headers = ['Appartement', 'Ville', 'Revenus encaissés', 'Nombre de loyers payés'];
            const rows = Array.from(byApartment.values()).map(apt => [
                apt.address,
                apt.city,
                apt.total.toFixed(2),
                apt.count.toString(),
            ]);

            // Add total row
            const totalRevenue = Array.from(byApartment.values()).reduce((s, a) => s + a.total, 0);
            const totalCount = Array.from(byApartment.values()).reduce((s, a) => s + a.count, 0);
            rows.push(['TOTAL', '', totalRevenue.toFixed(2), totalCount.toString()]);

            const csv = [headers.join(';'), ...rows.map((r: any) => r.join(';'))].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename=recap_annuel_${year}.csv`,
                },
            });
        }

        if (type === 'tax') {
            const paymentWhere: any = {
                period: {
                    gte: new Date(year, 0, 1),
                    lte: new Date(year, 11, 31),
                },
                status: 'PAID',
            };
            if (companyId) paymentWhere.lease = { apartment: { companyId } };

            const payments = await prisma.rentPayment.findMany({
                where: paymentWhere,
                include: { lease: { include: { apartment: true } } },
            });

            const expenseWhere: any = {
                date: {
                    gte: new Date(year, 0, 1),
                    lte: new Date(year, 11, 31),
                },
            };
            if (companyId) expenseWhere.apartment = { companyId };

            const expenses = await prisma.expense.findMany({
                where: expenseWhere,
                include: { apartment: true }
            });

            // Group by apartment
            interface TaxData {
                address: string;
                city: string;
                grossRent: number;
                recoveredCharges: number;
                expManagement: number;
                expMaintenance: number;
                expInsurance: number;
                expTax: number;
                expOther: number;
            }

            const byApartment = new Map<string, TaxData>();

            // Aggregate Payments
            payments.forEach((p: any) => {
                const key = p.lease.apartmentId;
                const existing = byApartment.get(key) || {
                    address: p.lease.apartment.address, city: p.lease.apartment.city,
                    grossRent: 0, recoveredCharges: 0,
                    expManagement: 0, expMaintenance: 0, expInsurance: 0, expTax: 0, expOther: 0
                };

                const totalLeaseAmount = p.lease.rentAmount + p.lease.chargesAmount;
                const rentRatio = totalLeaseAmount > 0 ? p.lease.rentAmount / totalLeaseAmount : 1;

                existing.grossRent += p.amount * rentRatio;
                existing.recoveredCharges += p.amount * (1 - rentRatio);

                byApartment.set(key, existing);
            });

            // Aggregate Expenses
            expenses.forEach((e: any) => {
                const key = e.apartmentId;
                const existing = byApartment.get(key) || {
                    address: e.apartment.address, city: e.apartment.city,
                    grossRent: 0, recoveredCharges: 0,
                    expManagement: 0, expMaintenance: 0, expInsurance: 0, expTax: 0, expOther: 0
                };

                if (e.category === 'MANAGEMENT') existing.expManagement += e.amount;
                else if (e.category === 'MAINTENANCE') existing.expMaintenance += e.amount;
                else if (e.category === 'INSURANCE') existing.expInsurance += e.amount;
                else if (e.category === 'TAX') existing.expTax += e.amount;
                else existing.expOther += e.amount;

                byApartment.set(key, existing);
            });

            const headers = [
                'Appartement', 'Ville', 'Loyers nets encaissés', 'Provisions charges perçues',
                'Total Dépenses Gestion', 'Total Dépenses Entretien/Réparations',
                'Total Assurances (PNO)', 'Total Impôts (Foncier)', 'Total Autres Frais'
            ];

            const rows = Array.from(byApartment.values()).map((apt: any) => [
                apt.address,
                apt.city,
                apt.grossRent.toFixed(2),
                apt.recoveredCharges.toFixed(2),
                apt.expManagement.toFixed(2),
                apt.expMaintenance.toFixed(2),
                apt.expInsurance.toFixed(2),
                apt.expTax.toFixed(2),
                apt.expOther.toFixed(2),
            ]);

            const csv = [headers.join(';'), ...rows.map((r: any) => r.join(';'))].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename=liasse_fiscale_2044_${year}.csv`,
                },
            });
        }

        return NextResponse.json({ error: 'Type inconnu' }, { status: 400 });
    } catch (error) {
        console.error('Erreur export:', error);
        return NextResponse.json({ error: 'Erreur lors de l\'export' }, { status: 500 });
    }
}
