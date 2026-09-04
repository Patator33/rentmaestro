import Link from "next/link";
import { getCafEligibleLeases } from "@/actions/caf";
import CafBatchForm from "@/components/CafBatchForm";
import PageTitleIcon from "@/components/PageTitleIcon";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function CafPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string }>;
}) {
    const { month: monthParam } = await searchParams;

    let currentDate = new Date();
    if (monthParam) {
        const [year, month] = monthParam.split('-').map(Number);
        if (!isNaN(year) && !isNaN(month)) currentDate = new Date(year, month - 1, 1);
    }

    const startOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));
    const nextMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const periodStr = startOfMonth.toISOString().slice(0, 7);
    const prevMonthStr = prevMonth.toISOString().slice(0, 7);
    const nextMonthStr = nextMonth.toISOString().slice(0, 7);

    const leases = await getCafEligibleLeases(periodStr);
    const totalExpected = leases.reduce((s, l) => s + l.cafMonthlyAmount, 0);
    const totalReceived = leases.reduce((s, l) => s + l.alreadyReceivedCaf, 0);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}><PageTitleIcon />Versements CAF</h1>
                <div className={styles.periodSelector}>
                    <Link href={`/caf?month=${prevMonthStr}`} className={styles.navButton}>←</Link>
                    <span className={styles.currentPeriod}>
                        {startOfMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </span>
                    <Link href={`/caf?month=${nextMonthStr}`} className={styles.navButton}>→</Link>
                </div>
            </header>

            <div className={styles.infoBox}>
                <p>
                    La CAF verse en général un seul virement groupé qui couvre plusieurs locataires. Saisissez-le
                    ici une fois : répartissez le montant total sur les baux concernés, le système suit la part CAF
                    et la part locataire séparément sur chaque loyer, avec l&apos;historique par bail.
                </p>
            </div>

            {leases.length > 0 && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Attendu CAF ce mois</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>{totalExpected.toFixed(0)} €</p>
                    </div>
                    <div style={{ width: '1px', background: 'var(--border-color)' }} />
                    <div style={{ flex: 1, minWidth: 120 }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Déjà reçu ce mois</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0891b2' }}>{totalReceived.toFixed(0)} €</p>
                    </div>
                    <div style={{ width: '1px', background: 'var(--border-color)' }} />
                    <div style={{ flex: 1, minWidth: 120 }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Bénéficiaires</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>{leases.length}</p>
                    </div>
                </div>
            )}

            {leases.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Aucun bail marqué comme bénéficiaire CAF pour ce mois. Renseignez le montant CAF/APL mensuel
                    attendu sur la fiche d&apos;un bail (page Modifier le contrat) pour qu&apos;il apparaisse ici.
                </p>
            ) : (
                <CafBatchForm leases={leases} periodStr={periodStr} />
            )}
        </div>
    );
}
