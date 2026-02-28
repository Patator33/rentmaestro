import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Auto-generate RentPayment entries for all active leases for the current month.
 * This endpoint can be called manually from the dashboard or via a cron job.
 * It only creates payments that don't already exist for the current period.
 */
export async function POST() {
    try {
        const now = new Date();
        const period = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

        // Find all active leases that should have rent for this month
        const activeLeases = await prisma.lease.findMany({
            where: {
                startDate: { lte: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)) },
                OR: [
                    { endDate: null },
                    { endDate: { gte: period } }
                ],
                isActive: true,
            },
            include: {
                payments: {
                    where: { period }
                }
            }
        });

        let created = 0;
        let skipped = 0;
        let lateMarked = 0;

        for (const lease of activeLeases) {
            // Skip if payment already exists
            if (lease.payments.length > 0) {
                // Mark as LATE if still PENDING and past the 10th
                const payment = lease.payments[0];
                if (payment.status === 'PENDING' && now.getDate() > 10) {
                    await prisma.rentPayment.update({
                        where: { id: payment.id },
                        data: { status: 'LATE' }
                    });
                    lateMarked++;
                }
                skipped++;
                continue;
            }

            // Create PENDING payment for this month
            const totalAmount = lease.rentAmount + lease.chargesAmount;
            await prisma.rentPayment.create({
                data: {
                    leaseId: lease.id,
                    period,
                    amount: totalAmount,
                    status: 'PENDING',
                }
            });
            created++;
        }

        return NextResponse.json({
            success: true,
            message: `${created} loyer(s) généré(s), ${skipped} ignoré(s), ${lateMarked} marqué(s) en retard`,
            created,
            skipped,
            lateMarked,
            month: period.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        });
    } catch (error) {
        console.error('Erreur génération loyers:', error);
        return NextResponse.json({ error: 'Erreur lors de la génération des loyers' }, { status: 500 });
    }
}
