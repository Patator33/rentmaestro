import { prisma } from '@/lib/prisma';
import { addMonths, differenceInDays } from 'date-fns';

export type AgendaEventType = 'LEASE_END' | 'RENT_REVIEW' | 'TASK_DUE' | 'LEASE_START';
export type AgendaUrgency = 'low' | 'medium' | 'high';

export interface AgendaEvent {
    date: Date;
    type: AgendaEventType;
    label: string;
    sublabel?: string;
    href: string;
    urgency: AgendaUrgency;
}

/**
 * Échéances à venir : fins de bail, révisions de loyer, entrées de locataire et
 * tâches datées. Partagé entre la page Agenda (horizon long) et l'encart
 * « À venir » du dashboard, qui ne montrait auparavant que les fins de bail et
 * paraissait donc vide alors que l'agenda listait des événements.
 */
export async function getAgendaEvents(horizonMonths: number): Promise<AgendaEvent[]> {
    const now = new Date();
    const horizon = addMonths(now, horizonMonths);

    const [activeLeases, upcomingLeases, tasks] = await Promise.all([
        prisma.lease.findMany({
            where: { isActive: true },
            include: { tenant: true, apartment: true },
        }),
        prisma.lease.findMany({
            where: { startDate: { gt: now, lte: horizon } },
            include: { tenant: true, apartment: true },
        }),
        prisma.task.findMany({
            where: {
                dueDate: { not: null, lte: horizon },
                status: { not: 'DONE' },
            },
            include: { apartment: true, tenant: true },
            orderBy: { dueDate: 'asc' },
        }),
    ]);

    const events: AgendaEvent[] = [];
    const byDaysLeft = (d: number): AgendaUrgency => (d <= 30 ? 'high' : d <= 60 ? 'medium' : 'low');

    for (const lease of activeLeases) {
        if (lease.endDate) {
            const end = new Date(lease.endDate);
            if (end >= now && end <= horizon) {
                events.push({
                    date: end,
                    type: 'LEASE_END',
                    label: `Fin de bail — ${lease.tenant.firstName} ${lease.tenant.lastName}`,
                    sublabel: lease.apartment.name || lease.apartment.address,
                    href: `/apartments/${lease.apartmentId}`,
                    urgency: byDaysLeft(differenceInDays(end, now)),
                });
            }
        }

        // Révision annuelle : un an après la dernière révision, ou après le début du bail.
        const refDate = lease.lastRentReviewDate
            ? new Date(lease.lastRentReviewDate)
            : new Date(lease.startDate);
        const nextReview = new Date(refDate);
        nextReview.setFullYear(nextReview.getFullYear() + 1);

        const leaseEndDate = lease.endDate ? new Date(lease.endDate) : null;
        if (nextReview >= now && nextReview <= horizon && (!leaseEndDate || leaseEndDate >= nextReview)) {
            events.push({
                date: nextReview,
                type: 'RENT_REVIEW',
                label: `Révision de loyer — ${lease.tenant.firstName} ${lease.tenant.lastName}`,
                sublabel: `${lease.apartment.name || lease.apartment.address} · ${(lease.rentAmount + lease.chargesAmount).toFixed(0)} €/mois`,
                href: `/leases/${lease.id}`,
                urgency: byDaysLeft(differenceInDays(nextReview, now)),
            });
        }
    }

    for (const lease of upcomingLeases) {
        events.push({
            date: new Date(lease.startDate),
            type: 'LEASE_START',
            label: `Entrée — ${lease.tenant.firstName} ${lease.tenant.lastName}`,
            sublabel: lease.apartment.name || lease.apartment.address,
            href: `/apartments/${lease.apartmentId}`,
            urgency: 'low',
        });
    }

    for (const task of tasks) {
        if (!task.dueDate) continue;
        const due = new Date(task.dueDate);
        const daysLeft = differenceInDays(due, now);
        events.push({
            date: due,
            type: 'TASK_DUE',
            label: `Tâche — ${task.title}`,
            sublabel: (task.apartment.name || task.apartment.address) + (task.tenant ? ` · ${task.tenant.firstName} ${task.tenant.lastName}` : ''),
            href: `/apartments/${task.apartmentId}`,
            urgency: daysLeft <= 0 ? 'high' : daysLeft <= 14 ? 'medium' : 'low',
        });
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    return events;
}
