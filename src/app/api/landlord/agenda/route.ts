import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

type EventType = 'LEASE_END' | 'RENT_REVIEW' | 'TASK_DUE' | 'LEASE_START';
type Urgency = 'low' | 'medium' | 'high';

interface AgendaEvent {
    date: Date;
    type: EventType;
    label: string;
    sublabel?: string;
    daysUntil: number;
    urgency: Urgency;
    leaseId?: string;
}

function diffDays(a: Date, b: Date) {
    return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function monthKey(d: Date) {
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const horizon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, 1));

    const [activeLeases, upcomingLeases, tasks] = await Promise.all([
        prisma.lease.findMany({
            where: { isActive: true },
            include: { tenant: true, apartment: true },
        }),
        prisma.lease.findMany({
            where: { startDate: { gte: today, lte: horizon } },
            include: { tenant: true, apartment: true },
        }),
        prisma.task.findMany({
            where: { dueDate: { not: null, lte: horizon }, status: { not: 'DONE' } },
            include: { apartment: true, tenant: true },
            orderBy: { dueDate: 'asc' },
        }),
    ]);

    const events: AgendaEvent[] = [];

    for (const lease of activeLeases) {
        // Fin de bail
        if (lease.endDate) {
            const end = new Date(lease.endDate);
            if (end >= today && end <= horizon) {
                const days = diffDays(end, now);
                events.push({
                    date: end,
                    type: 'LEASE_END',
                    label: `Fin de bail — ${lease.tenant.firstName} ${lease.tenant.lastName}`,
                    sublabel: lease.apartment.name || lease.apartment.address,
                    daysUntil: days,
                    urgency: days <= 30 ? 'high' : days <= 60 ? 'medium' : 'low',
                    leaseId: lease.id,
                });
            }
        }

        // Révision de loyer (tous les 12 mois)
        const refDate = lease.lastRentReviewDate
            ? new Date(lease.lastRentReviewDate)
            : new Date(lease.startDate);
        const nextReview = new Date(refDate);
        nextReview.setFullYear(nextReview.getFullYear() + 1);

        if (nextReview >= today && nextReview <= horizon) {
            const days = diffDays(nextReview, now);
            events.push({
                date: nextReview,
                type: 'RENT_REVIEW',
                label: `Révision de loyer — ${lease.tenant.firstName} ${lease.tenant.lastName}`,
                sublabel: `${lease.apartment.name || lease.apartment.address} · ${(lease.rentAmount + lease.chargesAmount).toFixed(0)} €/mois`,
                daysUntil: days,
                urgency: days <= 30 ? 'high' : days <= 60 ? 'medium' : 'low',
                leaseId: lease.id,
            });
        }
    }

    // Entrées locataires
    for (const lease of upcomingLeases) {
        events.push({
            date: new Date(lease.startDate),
            type: 'LEASE_START',
            label: `Entrée — ${lease.tenant.firstName} ${lease.tenant.lastName}`,
            sublabel: lease.apartment.name || lease.apartment.address,
            daysUntil: diffDays(new Date(lease.startDate), now),
            urgency: 'low',
            leaseId: lease.id,
        });
    }

    // Tâches
    for (const task of tasks) {
        if (task.dueDate) {
            const due = new Date(task.dueDate);
            const days = diffDays(due, now);
            events.push({
                date: due,
                type: 'TASK_DUE',
                label: `Tâche — ${task.title}`,
                sublabel: (task.apartment.name || task.apartment.address) + (task.tenant ? ` · ${task.tenant.firstName} ${task.tenant.lastName}` : ''),
                daysUntil: days,
                urgency: days <= 0 ? 'high' : days <= 14 ? 'medium' : 'low',
            });
        }
    }

    // Exclude past events (daysUntil < 0) — today's events (daysUntil == 0) are kept
    const filteredEvents = events.filter(ev => ev.daysUntil >= 0);
    filteredEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group by month
    const grouped: Record<string, Array<{
        type: EventType;
        label: string;
        sublabel?: string;
        date: string;
        daysUntil: number;
        urgency: Urgency;
        leaseId?: string;
    }>> = {};

    for (const ev of filteredEvents) {
        const key = monthKey(ev.date);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
            type: ev.type,
            label: ev.label,
            sublabel: ev.sublabel,
            date: ev.date.toISOString().split('T')[0],
            daysUntil: ev.daysUntil,
            urgency: ev.urgency,
            leaseId: ev.leaseId,
        });
    }

    return NextResponse.json({ grouped, total: filteredEvents.length });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
