import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import TravauxClient from '@/components/TravauxClient';
import PageTitleIcon from '@/components/PageTitleIcon';

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
            documents: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div style={{ maxWidth: 1400, padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}><PageTitleIcon />Travaux &amp; Incidents</h1>
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
