import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { format, addMonths, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

interface AgendaEvent {
    date: Date;
    type: 'LEASE_END' | 'RENT_REVIEW' | 'TASK_DUE' | 'LEASE_START';
    label: string;
    sublabel?: string;
    href: string;
    urgency: 'low' | 'medium' | 'high';
}

export default async function AgendaPage() {
    const now = new Date();
    const horizon = addMonths(now, 6);

    const [activeLeases, upcomingLeases, tasks] = await Promise.all([
        prisma.lease.findMany({
            where: { isActive: true },
            include: { tenant: true, apartment: true },
        }),
        prisma.lease.findMany({
            where: {
                startDate: { gt: now, lte: horizon },
            },
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

    // Lease expirations
    for (const lease of activeLeases) {
        if (lease.endDate) {
            const end = new Date(lease.endDate);
            if (end >= now && end <= horizon) {
                const daysLeft = differenceInDays(end, now);
                events.push({
                    date: end,
                    type: 'LEASE_END',
                    label: `Fin de bail — ${lease.tenant.firstName} ${lease.tenant.lastName}`,
                    sublabel: lease.apartment.address,
                    href: `/apartments/${lease.apartmentId}`,
                    urgency: daysLeft <= 30 ? 'high' : daysLeft <= 60 ? 'medium' : 'low',
                });
            }
        }

        // Rent reviews (every 12 months from start or last review)
        const refDate = lease.lastRentReviewDate
            ? new Date(lease.lastRentReviewDate)
            : new Date(lease.startDate);
        const nextReview = new Date(refDate);
        nextReview.setFullYear(nextReview.getFullYear() + 1);

        if (nextReview >= now && nextReview <= horizon) {
            const daysLeft = differenceInDays(nextReview, now);
            events.push({
                date: nextReview,
                type: 'RENT_REVIEW',
                label: `Révision de loyer — ${lease.tenant.firstName} ${lease.tenant.lastName}`,
                sublabel: `${lease.apartment.address} · ${(lease.rentAmount + lease.chargesAmount).toFixed(0)} €/mois`,
                href: `/apartments/${lease.apartmentId}`,
                urgency: daysLeft <= 30 ? 'high' : daysLeft <= 60 ? 'medium' : 'low',
            });
        }
    }

    // Upcoming lease starts
    for (const lease of upcomingLeases) {
        events.push({
            date: new Date(lease.startDate),
            type: 'LEASE_START',
            label: `Entrée — ${lease.tenant.firstName} ${lease.tenant.lastName}`,
            sublabel: lease.apartment.address,
            href: `/apartments/${lease.apartmentId}`,
            urgency: 'low',
        });
    }

    // Task due dates
    for (const task of tasks) {
        if (task.dueDate) {
            const due = new Date(task.dueDate);
            const daysLeft = differenceInDays(due, now);
            events.push({
                date: due,
                type: 'TASK_DUE',
                label: `Tâche — ${task.title}`,
                sublabel: task.apartment.address + (task.tenant ? ` · ${task.tenant.firstName} ${task.tenant.lastName}` : ''),
                href: `/apartments/${task.apartmentId}`,
                urgency: daysLeft <= 0 ? 'high' : daysLeft <= 14 ? 'medium' : 'low',
            });
        }
    }

    // Sort by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group by month
    const grouped: Record<string, AgendaEvent[]> = {};
    for (const ev of events) {
        const key = format(ev.date, 'MMMM yyyy', { locale: fr });
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(ev);
    }

    const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
        LEASE_END:   { icon: '📤', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
        RENT_REVIEW: { icon: '📈', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
        TASK_DUE:    { icon: '🔧', color: '#fb923c', bg: 'rgba(251,146,60,0.08)' },
        LEASE_START: { icon: '📥', color: '#2b8cee', bg: 'rgba(43,140,238,0.08)' },
    };

    const urgencyBorder: Record<string, string> = {
        high:   '2px solid #ef4444',
        medium: '2px solid #f59e0b',
        low:    '1px solid var(--border-color)',
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
            <header style={{ marginBottom: '2rem' }}>
                <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>← Accueil</Link>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>
                    📅 Agenda & Échéancier
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Événements des 6 prochains mois
                </p>
            </header>

            {events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '1.1rem' }}>Aucun événement à venir dans les 6 prochains mois.</p>
                </div>
            ) : (
                Object.entries(grouped).map(([month, monthEvents]) => (
                    <section key={month} style={{ marginBottom: '2.5rem' }}>
                        <h2 style={{
                            fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.08em', color: 'var(--text-muted)',
                            marginBottom: '1rem', paddingBottom: '0.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            textTransform: 'capitalize' as any,
                        }}>
                            {month}
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {monthEvents.map((ev, i) => {
                                const cfg = typeConfig[ev.type];
                                const daysLeft = differenceInDays(ev.date, now);
                                return (
                                    <Link key={i} href={ev.href} style={{
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        padding: '1rem 1.25rem',
                                        background: cfg.bg,
                                        border: urgencyBorder[ev.urgency],
                                        borderRadius: 'var(--radius-md)',
                                        textDecoration: 'none', color: 'inherit',
                                        transition: 'opacity 0.2s',
                                    }}>
                                        <div style={{
                                            width: '48px', textAlign: 'center', flexShrink: 0,
                                        }}>
                                            <div style={{ fontSize: '1.4rem' }}>{cfg.icon}</div>
                                            <div style={{ fontSize: '0.7rem', color: cfg.color, fontWeight: 700 }}>
                                                {format(ev.date, 'd MMM', { locale: fr })}
                                            </div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                                {ev.label}
                                            </div>
                                            {ev.sublabel && (
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                                                    {ev.sublabel}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                            <span style={{
                                                fontSize: '0.8rem', fontWeight: 600,
                                                color: daysLeft <= 0 ? '#ef4444' : daysLeft <= 30 ? '#f59e0b' : 'var(--text-muted)',
                                            }}>
                                                {daysLeft <= 0 ? 'En retard' : daysLeft === 0 ? "Aujourd'hui" : `J−${daysLeft}`}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
}
