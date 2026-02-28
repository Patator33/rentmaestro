import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function TenantPortalPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    // Find the tenant by their unique portal token
    const tenant = await prisma.tenant.findUnique({
        where: { portalToken: token },
        include: {
            leases: {
                include: {
                    apartment: true,
                    payments: {
                        orderBy: { period: 'desc' }
                    }
                },
                orderBy: { startDate: 'desc' }
            }
        }
    });

    if (!tenant) {
        notFound();
    }

    // Only show active or past leases
    const currentLease = tenant.leases[0];

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '0.5rem' }}>Espace Locataire</h1>
                <p style={{ color: '#64748b' }}>Bienvenue, {tenant.firstName} {tenant.lastName}</p>
            </header>

            {!currentLease ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '12px' }}>
                    <p style={{ color: '#64748b' }}>Aucun bail actif trouvé.</p>
                </div>
            ) : (
                <>
                    <section style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '1rem' }}>Votre Logement</h2>
                        <div style={{ display: 'grid', gap: '0.5rem', color: '#475569' }}>
                            <p><strong>Adresse :</strong> {currentLease.apartment.address}</p>
                            {currentLease.apartment.complement && <p><strong>Complément :</strong> {currentLease.apartment.complement}</p>}
                            <p><strong>Ville :</strong> {currentLease.apartment.zipCode} {currentLease.apartment.city}</p>
                            <p><strong>Loyer mensuel :</strong> {(currentLease.rentAmount + currentLease.chargesAmount).toFixed(2)} € (charges comprises)</p>
                            <p><strong>Début du bail :</strong> {formatDate(currentLease.startDate)}</p>
                        </div>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '1rem' }}>Historique des Loyers & Quittances</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {currentLease.payments.length === 0 ? (
                                <p style={{ color: '#64748b', fontStyle: 'italic' }}>Aucun historique de paiement pour le moment.</p>
                            ) : (
                                currentLease.payments.map((payment) => {
                                    const isPaid = payment.status === 'PAID';
                                    const monthName = format(new Date(payment.period), 'MMMM yyyy', { locale: fr });

                                    return (
                                        <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div>
                                                <p style={{ fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>
                                                    {monthName}
                                                </p>
                                                <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                                    {payment.amount.toFixed(2)} €
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                {isPaid ? (
                                                    <span style={{ padding: '0.3rem 0.8rem', background: '#ecfdf5', color: '#059669', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 500 }}>
                                                        Payé
                                                    </span>
                                                ) : (
                                                    <span style={{ padding: '0.3rem 0.8rem', background: '#fffbeb', color: '#d97706', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 500 }}>
                                                        En attente
                                                    </span>
                                                )}

                                                {isPaid ? (
                                                    <a
                                                        href={`/api/quittance/${payment.id}/pdf`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ display: 'inline-block', padding: '0.5rem 1rem', background: '#f8fafc', color: '#475569', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', transition: 'background 0.2s' }}
                                                    >
                                                        ⬇️ Télécharger Quittance
                                                    </a>
                                                ) : (
                                                    <div style={{ width: '175px', textAlign: 'center', fontSize: '0.85rem', color: '#cbd5e1' }}>
                                                        Quittance indisponible
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
