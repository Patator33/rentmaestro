import { prisma } from '@/lib/prisma';
import { calculateFutureProrata } from '@/lib/utils';

/**
 * Crée les RentPayment du mois en cours pour les baux actifs qui n'en ont pas
 * encore, et marque LATE les PENDING encore impayés après le 10. Appelée à la
 * fois par le bouton manuel (/api/generate-rents) et par le cron quotidien
 * (/api/cron/daily) — sans ce dernier appel automatique, les loyers en retard
 * n'apparaissent plus nulle part tant que personne n'a cliqué le bouton.
 */
export async function generateRentsForCurrentMonth() {
    const now = new Date();
    const period = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

    const activeLeases = await prisma.lease.findMany({
        where: {
            startDate: { lt: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)) },
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
        if (lease.payments.length > 0) {
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

        const totalAmount = lease.rentAmount + lease.chargesAmount;
        const leaseStart = new Date(lease.startDate);
        const nextPeriod = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
        const isFirstMonth = leaseStart >= period && leaseStart < nextPeriod;
        const prorata = isFirstMonth ? calculateFutureProrata(totalAmount, leaseStart) : null;
        const amount = prorata ? Math.round(prorata.amount * 100) / 100 : totalAmount;
        await prisma.rentPayment.create({
            data: {
                leaseId: lease.id,
                period,
                amount,
                status: 'PENDING',
            }
        });
        created++;
    }

    return {
        created,
        skipped,
        lateMarked,
        month: period.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    };
}
