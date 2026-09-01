import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ACTION_LABELS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }> }) {
    const session = await getSession();
    if (!session.userId) redirect('/login');

    const params = await searchParams;
    const q = params.q?.trim() || '';
    const from = params.from || '';
    const to = params.to || '';
    const page = Math.max(1, parseInt(params.page || '1'));

    const where: any = {};
    if (q) {
        where.OR = [
            { action: { contains: q } },
            { userEmail: { contains: q } },
            { entity: { contains: q } },
            { details: { contains: q } },
        ];
    }
    if (from) {
        where.createdAt = { ...where.createdAt, gte: new Date(from) };
    }
    if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt = { ...where.createdAt, lte: toDate };
    }

    const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
    ]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const buildUrl = (overrides: Record<string, string | number>) => {
        const p: Record<string, string> = {};
        if (q) p.q = q;
        if (from) p.from = from;
        if (to) p.to = to;
        p.page = String(page);
        Object.entries(overrides).forEach(([k, v]) => { p[k] = String(v); });
        return `/settings/logs?${new URLSearchParams(p).toString()}`;
    };

    const actionBadgeColor = (action: string) => {
        if (action.startsWith('DELETE') || action === 'LOGIN_FAILED') return '#ef4444';
        if (action.startsWith('CREATE') || action === 'LOGIN_SUCCESS') return '#22c55e';
        if (action === 'LOGOUT') return '#94a3b8';
        if (action.startsWith('MARK_RENT') || action.startsWith('SEND')) return '#3b82f6';
        return '#f59e0b';
    };

    return (
        <div style={{ maxWidth: '1400px', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <Link href="/settings/security" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>← Sécurité</Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>📋 Journal d'activité</h1>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{total} entrée{total !== 1 ? 's' : ''}</span>
            </div>

            {/* Filters */}
            <form method="GET" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Recherche</label>
                    <input
                        name="q"
                        defaultValue={q}
                        placeholder="action, utilisateur, détails…"
                        style={{
                            padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)', background: 'var(--surface)',
                            color: 'var(--text-main)', fontSize: '0.85rem', width: '220px', fontFamily: 'inherit',
                        }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Du</label>
                    <input
                        type="date"
                        name="from"
                        defaultValue={from}
                        style={{
                            padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)', background: 'var(--surface)',
                            color: 'var(--text-main)', fontSize: '0.85rem', fontFamily: 'inherit',
                        }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Au</label>
                    <input
                        type="date"
                        name="to"
                        defaultValue={to}
                        style={{
                            padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)', background: 'var(--surface)',
                            color: 'var(--text-main)', fontSize: '0.85rem', fontFamily: 'inherit',
                        }}
                    />
                </div>
                <button type="submit" style={{
                    padding: '0.45rem 1.2rem', borderRadius: 'var(--radius-md)',
                    background: 'var(--primary)', color: '#fff', fontWeight: 600,
                    border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                }}>
                    Filtrer
                </button>
                {(q || from || to) && (
                    <Link href="/settings/logs" style={{
                        padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)', color: 'var(--text-muted)',
                        fontSize: '0.85rem', textDecoration: 'none',
                    }}>
                        Réinitialiser
                    </Link>
                )}
            </form>

            {/* Table */}
            {logs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>Aucun log trouvé.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--surface-hover)' }}>
                                {['Date / Heure', 'Utilisateur', 'Action', 'Entité', 'Détails', 'IP'].map(h => (
                                    <th key={h} style={{
                                        padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 700,
                                        color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase',
                                        letterSpacing: '0.06em', borderBottom: '2px solid var(--border-color)',
                                        whiteSpace: 'nowrap',
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log, i) => (
                                <tr key={log.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface-hover)' }}>
                                    <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-color)' }}>
                                        {log.createdAt.toLocaleDateString('fr-FR')} {log.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>
                                        {log.userEmail || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                                        <span style={{
                                            display: 'inline-block', padding: '0.2rem 0.6rem',
                                            borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
                                            background: actionBadgeColor(log.action) + '22',
                                            color: actionBadgeColor(log.action),
                                        }}>
                                            {ACTION_LABELS[log.action] ?? log.action}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                                        {log.entity || '—'}
                                    </td>
                                    <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {log.details || '—'}
                                    </td>
                                    <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                                        {log.ip || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    {page > 1 && (
                        <Link href={buildUrl({ page: page - 1 })} style={{ padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-main)', textDecoration: 'none', fontSize: '0.85rem' }}>← Précédent</Link>
                    )}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Page {page} / {totalPages}</span>
                    {page < totalPages && (
                        <Link href={buildUrl({ page: page + 1 })} style={{ padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-main)', textDecoration: 'none', fontSize: '0.85rem' }}>Suivant →</Link>
                    )}
                </div>
            )}
        </div>
    );
}
