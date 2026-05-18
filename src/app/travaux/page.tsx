import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import TravauxClient from '@/components/TravauxClient';

export const dynamic = 'force-dynamic';

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
            notes: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
    });

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

            <TravauxClient initialTasks={tasks} showAll={showAll} />
        </div>
    );
}
