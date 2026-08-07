import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import DeleteBuildingButton from '@/components/DeleteBuildingButton';
import { buildingExpensesTotal, buildingFixedCostsTotal } from '@/lib/building-expenses';

export const dynamic = 'force-dynamic';

export default async function BuildingsPage() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buildings = await prisma.building.findMany({
        include: {
            company: true,
            apartments: {
                include: {
                    leases: {
                        where: { isActive: true },
                        include: { payments: { where: { status: 'PAID' }, orderBy: { period: 'desc' }, take: 12 } }
                    }
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>🏢 Immeubles</h1>
                <Link href="/buildings/new" className="std-add-button">+ Ajouter un immeuble</Link>
            </div>

            {buildings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>🏗️ Aucun immeuble créé</p>
                    <p style={{ fontSize: '0.9rem' }}>Créez un immeuble pour regrouper vos appartements.</p>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {buildings.map(building => {
                    const apts = building.apartments;
                    const totalApts = apts.length;
                    const occupied = apts.filter(a => a.leases.length > 0).length;
                    const vacant = totalApts - occupied;

                    // Monthly expected income from active leases
                    const monthlyIncome = apts.reduce((sum, a) => {
                        const lease = a.leases[0];
                        return sum + (lease ? lease.rentAmount + lease.chargesAmount : 0);
                    }, 0);

                    // Monthly costs : crédit/assurance/taxe et charges communes se saisissent
                    // désormais au niveau immeuble (hérités par tous ses appartements), les
                    // champs propres à chaque appartement ne sont donc plus utilisés ici.
                    const monthlyCosts = buildingFixedCostsTotal(building) + buildingExpensesTotal(building);

                    const cashflow = monthlyIncome - monthlyCosts;

                    return (
                        <div key={building.id} style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>🏢 {building.name}</h2>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📍 {building.address}{(building as any).complement ? `, ${(building as any).complement}` : ''}{(building as any).zipCode ? ` ${(building as any).zipCode}` : ''}{(building as any).city ? ` ${(building as any).city}` : ''}</p>
                                    {building.company && (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                            🏢 <Link href={`/companies/${building.company.id}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>{building.company.name}</Link>
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                    <Link href={`/buildings/${building.id}/edit`} style={{ padding: '0.35rem 0.75rem', background: 'var(--surface-active)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.8rem', textDecoration: 'none' }}>
                                        ✏️ Modifier
                                    </Link>
                                    <DeleteBuildingButton id={building.id} name={building.name} hasApartments={totalApts > 0} />
                                </div>
                            </div>

                            {/* Stats row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                                <StatCell label="Appartements" value={`${totalApts}`} color="var(--text-main)" />
                                <StatCell label="Occupés" value={`${occupied}`} color="#22c55e" />
                                <StatCell label="Vacants" value={`${vacant}`} color={vacant > 0 ? '#ef4444' : 'var(--text-muted)'} />
                                <StatCell label="Loyers/mois" value={monthlyIncome > 0 ? `${monthlyIncome.toFixed(0)} €` : '—'} color="#3b82f6" />
                                <StatCell label="Charges/mois" value={monthlyCosts > 0 ? `${monthlyCosts.toFixed(0)} €` : '—'} color="#f59e0b" />
                                <StatCell label="Cashflow net" value={monthlyIncome > 0 || monthlyCosts > 0 ? `${cashflow.toFixed(0)} €` : '—'} color={cashflow >= 0 ? '#22c55e' : '#ef4444'} />
                            </div>

                            {/* Apartments list */}
                            {totalApts > 0 && (
                                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Appartements</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                        {apts.map(apt => (
                                            <Link
                                                key={apt.id}
                                                href={`/apartments/${apt.id}`}
                                                style={{
                                                    padding: '0.25rem 0.6rem',
                                                    background: apt.leases.length > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                                    border: `1px solid ${apt.leases.length > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                                    borderRadius: '20px',
                                                    fontSize: '0.8rem',
                                                    color: apt.leases.length > 0 ? '#22c55e' : '#ef4444',
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                {apt.name || apt.address}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{ background: 'var(--surface-active)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</p>
            <p style={{ fontSize: '1rem', fontWeight: 700, color }}>{value}</p>
        </div>
    );
}
