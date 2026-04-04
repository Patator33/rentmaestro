import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { cycleTaskStatusForTravaux } from '@/actions/tasks';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
    TODO: 'À traiter',
    IN_PROGRESS: 'En cours',
    DONE: 'Résolu',
};

const STATUS_COLORS: Record<string, string> = {
    TODO: '#ef4444',
    IN_PROGRESS: '#f59e0b',
    DONE: '#22c55e',
};

export default async function TravauxPage({
    searchParams,
}: {
    searchParams: Promise<{ all?: string }>;
}) {
    const { all } = await searchParams;
    const showAll = all === '1';

    const tasks = await prisma.task.findMany({
        where: showAll ? {} : { status: { in: ['TODO', 'IN_PROGRESS'] } },
        include: {
            tenant: { select: { id: true, firstName: true, lastName: true } },
            apartment: { select: { id: true, address: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    const incidents = tasks.filter(t => t.tenantId !== null);
    const travaux = tasks.filter(t => t.tenantId === null);

    const renderCard = (task: typeof tasks[0]) => {
        const nextLabel = task.status === 'TODO' ? 'En cours →' : task.status === 'IN_PROGRESS' ? '✓ Résolu' : 'Réouvrir';
        return (
            <div key={task.id} style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>{task.title}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', background: `${STATUS_COLORS[task.status]}20`, color: STATUS_COLORS[task.status] }}>
                            {STATUS_LABELS[task.status]}
                        </span>
                    </div>
                    {task.description && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{task.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <Link href={`/apartments/${task.apartment.id}`} style={{ color: 'var(--primary-color)' }}>
                            🏠 {task.apartment.name || task.apartment.address}
                        </Link>
                        {task.tenant && (
                            <Link href={`/tenants/${task.tenant.id}`} style={{ color: 'var(--text-secondary)' }}>
                                👤 {task.tenant.firstName} {task.tenant.lastName}
                            </Link>
                        )}
                        {task.dueDate && <span>📅 {formatDate(task.dueDate)}</span>}
                        {(task as any).scheduledAt && <span>🔧 {formatDate((task as any).scheduledAt)}</span>}
                        {task.cost != null && <span>💰 {task.cost.toFixed(2)} €</span>}
                        {!task.dueDate && !(task as any).scheduledAt && <span>{formatDate(task.createdAt)}</span>}
                    </div>
                </div>
                {task.status !== 'DONE' && (
                    <form action={cycleTaskStatusForTravaux.bind(null, task.id, task.status)}>
                        <button
                            type="submit"
                            style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary-color)', background: 'rgba(43,140,238,0.1)', color: 'var(--primary-color)', cursor: 'pointer' }}
                        >
                            {nextLabel}
                        </button>
                    </form>
                )}
            </div>
        );
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>🔧 Travaux & Incidents</h1>
                <Link
                    href={showAll ? '/travaux' : '/travaux?all=1'}
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', textDecoration: 'none' }}
                >
                    {showAll ? 'Ouverts seulement' : 'Tout afficher'}
                </Link>
            </div>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Incidents locataires — {incidents.length}
                </h2>
                {incidents.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                        Aucun incident{showAll ? '' : ' ouvert'}.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {incidents.map(renderCard)}
                    </div>
                )}
            </section>

            <section>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Travaux & entretien — {travaux.length}
                </h2>
                {travaux.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                        Aucun travail{showAll ? '' : ' en cours'}.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {travaux.map(renderCard)}
                    </div>
                )}
            </section>
        </div>
    );
}
