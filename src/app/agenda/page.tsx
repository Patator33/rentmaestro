import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAgendaEvents, type AgendaEvent } from '@/lib/agenda-events';
import PageTitleIcon from '@/components/PageTitleIcon';

export const dynamic = 'force-dynamic';

export default async function AgendaPage() {
    const now = new Date();
    const events = await getAgendaEvents(6);

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
        <div style={{ maxWidth: '1400px', padding: '2rem' }}>
            <header style={{ marginBottom: '2rem' }}>
                <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>← Accueil</Link>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>
                    <PageTitleIcon />Agenda &amp; Échéancier
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
                            fontSize: '1rem', fontWeight: 700,
                            letterSpacing: '0.08em', color: 'var(--text-muted)',
                            marginBottom: '1rem', paddingBottom: '0.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            textTransform: 'capitalize',
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
