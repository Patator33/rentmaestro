import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'payments';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    try {
        if (type === 'payments') {
            const payments = await prisma.rentPayment.findMany({
                where: {
                    period: {
                        gte: new Date(year, 0, 1),
                        lte: new Date(year, 11, 31),
                    }
                },
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
            const rows = payments.map(p => [
                p.period.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                p.lease.apartment.address,
                `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`,
                p.amount.toFixed(2),
                p.status,
                p.paidAt ? p.paidAt.toLocaleDateString('fr-FR') : '',
                p.sentAt ? p.sentAt.toLocaleDateString('fr-FR') : '',
            ]);

            const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename=loyers_${year}.csv`,
                },
            });
        }

        if (type === 'annual') {
            const payments = await prisma.rentPayment.findMany({
                where: {
                    period: {
                        gte: new Date(year, 0, 1),
                        lte: new Date(year, 11, 31),
                    },
                    status: 'PAID'
                },
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
            payments.forEach(p => {
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

            const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename=recap_annuel_${year}.csv`,
                },
            });
        }

        return NextResponse.json({ error: 'Type inconnu' }, { status: 400 });
    } catch (error) {
        console.error('Erreur export:', error);
        return NextResponse.json({ error: 'Erreur lors de l\'export' }, { status: 500 });
    }
}
