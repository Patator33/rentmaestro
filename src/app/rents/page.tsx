
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import { formatDate } from "@/lib/utils";
import { expectedRentForPeriod, isRentSettled, isRentLate } from "@/lib/rent-period";
import { sendRentReminder } from "@/actions/rents";
import PaymentEmailActions from "@/components/PaymentEmailActions";
import MarkRentPaidButton from "@/components/MarkRentPaidButton";
import UnmarkRentPaidButton from "@/components/UnmarkRentPaidButton";

export const dynamic = "force-dynamic";

export default async function RentsPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string; sort?: string; dir?: string }>;
}) {
    const now = new Date();
    const { month: monthParam, sort: sortParam, dir: dirParam } = await searchParams; // YYYY-MM
    const sort = sortParam || 'apartment';
    const dir = dirParam === 'desc' ? 'desc' : 'asc';

    let currentDate = now;
    if (monthParam) {
        const [year, month] = monthParam.split('-').map(Number);
        if (!isNaN(year) && !isNaN(month)) {
            currentDate = new Date(year, month - 1, 1);
        }
    }

    // Normalize to 1st of month UTC for comparison
    const startOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));
    const nextMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

    const prevMonthStr = prevMonth.toISOString().slice(0, 7); // YYYY-MM
    const nextMonthStr = nextMonth.toISOString().slice(0, 7);
    const currentMonthStr = startOfMonth.toISOString().slice(0, 10); // YYYY-MM-DD (full date for consistency)
    const prevMonthPeriodStr = prevMonth.toISOString().slice(0, 10);

    // Find active leases for this period
    // Active if startDate <= today (or end of month for past months) AND (no endDate OR endDate >= start of month)
    const isCurrentMonth = startOfMonth.getFullYear() === now.getFullYear() && startOfMonth.getMonth() === now.getMonth();

    // On remonte aussi les baux terminés le mois précédent : ils peuvent encore
    // avoir un impayé à reporter, même s'ils ne figurent plus dans la liste du mois.
    const fetchedLeases = await prisma.lease.findMany({
        where: {
            // `lt` et non `lte` : un bail qui démarre le 1er du mois suivant
            // ne doit aucun loyer sur le mois affiché.
            startDate: { lt: nextMonth },
            OR: [
                { endDate: null },
                { endDate: { gte: prevMonth } }
            ]
        },
        include: {
            apartment: true,
            tenant: true,
            payments: {
                where: {
                    period: { in: [prevMonth, startOfMonth] }
                }
            }
        }
    });

    const sameTime = (a: Date, b: Date) => new Date(a).getTime() === b.getTime();
    const rawLeases = fetchedLeases
        .filter(l => !l.endDate || new Date(l.endDate) >= startOfMonth)
        .map(l => ({ ...l, payments: l.payments.filter(p => sameTime(p.period, startOfMonth)) }));

    // Report : impayé du mois précédent, affiché en plus dans le mois courant.
    // Volontairement exclu de tous les totaux — il a déjà été compté le mois passé.
    // Piloté par le bail et non par les RentPayment existants : un loyer jamais
    // généré est tout aussi impayé qu'un loyer généré et non réglé.
    const carriedOver = fetchedLeases
        .map(lease => {
            // Le bail devait-il un loyer le mois précédent ?
            const startedBefore = new Date(lease.startDate) < startOfMonth;
            const notEndedBefore = !lease.endDate || new Date(lease.endDate) >= prevMonth;
            if (!startedBefore || !notEndedBefore) return null;

            const expected = expectedRentForPeriod(lease, prevMonth);
            if (expected <= 0) return null;

            const payment = lease.payments.find(p => sameTime(p.period, prevMonth)) ?? null;
            if (isRentSettled(payment, expected)) return null;
            return { lease, payment, expected };
        })
        .filter((r): r is { lease: typeof fetchedLeases[0]; payment: typeof fetchedLeases[0]['payments'][0] | null; expected: number } => r !== null);

    const leases = [...rawLeases].sort((a, b) => {
        const pa = a.payments[0], pb = b.payments[0];
        let av: string | number = '', bv: string | number = '';
        switch (sort) {
            case 'tenant':
                av = `${a.tenant.lastName} ${a.tenant.firstName}`.toLowerCase();
                bv = `${b.tenant.lastName} ${b.tenant.firstName}`.toLowerCase();
                break;
            case 'amount':
                av = a.rentAmount + a.chargesAmount;
                bv = b.rentAmount + b.chargesAmount;
                break;
            case 'status': {
                const rank = (p: typeof pa) => p?.status === 'PAID' ? 0 : p ? 1 : 2;
                av = rank(pa); bv = rank(pb);
                break;
            }
            default:
                av = (a.apartment.name || a.apartment.address).toLowerCase();
                bv = (b.apartment.name || b.apartment.address).toLowerCase();
        }
        if (typeof av === 'string' && typeof bv === 'string')
            return dir === 'asc' ? av.localeCompare(bv, 'fr') : bv.localeCompare(av, 'fr');
        return dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    const unpaidLeases = leases.filter(l => !isRentSettled(l.payments[0], expectedRentForPeriod(l, startOfMonth)));
    const paidLeases = leases.filter(l => isRentSettled(l.payments[0], expectedRentForPeriod(l, startOfMonth)));

    // Summary totals — le report du mois précédent n'entre dans aucun de ces calculs.
    let totalReceived = 0;
    let totalExpected = 0;
    const seenApartments = new Set<string>();
    let totalMonthlyCosts = 0;
    for (const lease of leases) {
        const payment = lease.payments[0];
        const fallbackAmount = expectedRentForPeriod(lease, startOfMonth);
        totalExpected += payment ? payment.amount : fallbackAmount;
        if (payment?.status === 'PAID') totalReceived += payment.amount;
        else if (payment?.status === 'PARTIAL' && (payment as any).paidAmount != null) totalReceived += (payment as any).paidAmount;
        // Charges fixes par appartement, déjà saisies mensuellement dans le formulaire
        if (!seenApartments.has(lease.apartment.id)) {
            seenApartments.add(lease.apartment.id);
            totalMonthlyCosts +=
                (lease.apartment.mortgageAmount ?? 0) +
                (lease.apartment.insuranceAmount ?? 0) +
                (lease.apartment.taxAmount ?? 0);
        }
    }
    const netCashflow = totalReceived - totalMonthlyCosts;

    const renderRow = (lease: typeof leases[0]) => {
        const payment = lease.payments[0];
        const leaseStart = new Date(lease.startDate);
        const isFirstMonth = leaseStart >= startOfMonth && leaseStart < nextMonth;
        const fallbackAmount = expectedRentForPeriod(lease, startOfMonth);
        const isPaid = isRentSettled(payment, fallbackAmount);
        const displayAmount = fallbackAmount;
        const leaveDate = lease.endDate ? new Date(lease.endDate) : null;
        const isLastMonth = leaveDate != null && leaveDate >= startOfMonth && leaveDate < nextMonth;

        return (
            <tr key={lease.id}>
                <td>
                    <Link href={`/leases/${lease.id}`} style={{ color: 'var(--text-main)' }}>
                        {lease.apartment.name || lease.apartment.address}
                    </Link>
                </td>
                <td>
                    <Link href={`/tenants/${lease.tenant.id}`} style={{ color: 'var(--text-main)' }}>
                        {lease.tenant.firstName} {lease.tenant.lastName}
                    </Link>
                </td>
                <td>
                    {displayAmount.toFixed(2)} €
                    {(isFirstMonth || isLastMonth) && (
                        <span style={{ display: 'block', fontSize: '0.75em', color: 'var(--text-muted)' }}>
                            prorata {isLastMonth ? `départ ${formatDate(lease.endDate)}` : `entrée ${formatDate(lease.startDate)}`}
                        </span>
                    )}
                </td>
                <td>
                    {isPaid ? (
                        <span className={styles.statusPaid}>✓ Payé {formatDate(payment.paidAt)}</span>
                    ) : payment?.status === 'PARTIAL' ? (
                        <span>
                            <span style={{ display: 'inline-block', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>💰 Partiel</span>
                            {payment.paidAmount != null && (
                                <span style={{ display: 'block', fontSize: '0.8em', color: '#f59e0b', marginTop: '0.15rem' }}>
                                    Reçu : {(payment.paidAmount as number).toFixed(2)} € — Solde : {Math.max(0, fallbackAmount - (payment.paidAmount as number)).toFixed(2)} €
                                </span>
                            )}
                        </span>
                    ) : payment ? (() => {
                        const daysOverdue = now.getDate() - (lease.tenant.paymentDay || 5);
                        const isLate = isRentLate(startOfMonth, lease.tenant.paymentDay, lease.startDate, now);
                        return isLate ? (
                            <span className={styles.statusPending}>
                                ⚠ En retard ({daysOverdue}j)
                                {payment.sentAt && (
                                    <span style={{ display: 'block', fontSize: '0.8em', fontWeight: 'normal', color: 'var(--warning)' }}>
                                        (Relancé le {formatDate(payment.sentAt)})
                                    </span>
                                )}
                            </span>
                        ) : (
                            <span className={styles.statusUnpaid}>
                                À régler
                                {payment.sentAt && (
                                    <span style={{ display: 'block', fontSize: '0.8em', fontWeight: 'normal', color: 'var(--warning)' }}>
                                        (Relancé le {formatDate(payment.sentAt)})
                                    </span>
                                )}
                            </span>
                        );
                    })() : (
                        <span className={styles.statusUnpaid}>À régler</span>
                    )}
                </td>
                <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {!isPaid && (
                            <MarkRentPaidButton
                                leaseId={lease.id}
                                periodStr={currentMonthStr}
                                defaultAmount={fallbackAmount}
                                existingPaidAmount={payment?.status === 'PARTIAL' && payment?.paidAmount != null ? (payment.paidAmount as number) : undefined}
                                buttonStyle={`${styles.actionButton} ${styles.paidButton}`}
                            />
                        )}

                        {isPaid && payment?.id && (
                            <UnmarkRentPaidButton
                                paymentId={payment.id}
                                buttonStyle={styles.actionButton}
                            />
                        )}

                        {!isPaid && (
                            <form action={sendRentReminder.bind(null, lease.id, currentMonthStr)}>
                                <button type="submit" className={`${styles.actionButton} ${styles.reminderButton}`} style={{ opacity: 0.6 }}>
                                    Marquer Relancé (Manuel)
                                </button>
                            </form>
                        )}

                        <PaymentEmailActions
                            paymentId={payment?.id || null}
                            leaseId={lease.id}
                            periodStr={currentMonthStr}
                            isPaid={!!isPaid}
                            hasEmail={!!lease.tenant.email}
                            buttonStyle={styles.actionButton}
                        />

                        {isPaid && payment?.id && (
                            <a
                                href={`/api/quittance/${payment.id}/pdf`}
                                download
                                className={`${styles.actionButton}`}
                                style={{ textDecoration: 'none', background: 'var(--pill-ok-bg)', borderColor: 'var(--pill-ok-border)', color: 'var(--pill-ok-color)' }}
                            >
                                📄 Quittance
                            </a>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    const renderCarriedRow = ({ lease, payment, expected }: typeof carriedOver[0]) => {
        const alreadyPaid = payment?.status === 'PARTIAL' && payment.paidAmount != null ? payment.paidAmount : 0;
        const remaining = Math.max(0, expected - alreadyPaid);
        const prevLabel = prevMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

        return (
            <tr key={`carried-${lease.id}`} style={{ background: 'rgba(245,158,11,0.05)' }}>
                <td>
                    <Link href={`/leases/${lease.id}`} style={{ color: 'var(--text-main)' }}>
                        {lease.apartment.name || lease.apartment.address}
                    </Link>
                </td>
                <td>
                    <Link href={`/tenants/${lease.tenant.id}`} style={{ color: 'var(--text-main)' }}>
                        {lease.tenant.firstName} {lease.tenant.lastName}
                    </Link>
                </td>
                <td>
                    {remaining.toFixed(2)} €
                    {alreadyPaid > 0 && (
                        <span style={{ display: 'block', fontSize: '0.75em', color: 'var(--text-muted)' }}>
                            solde sur {expected.toFixed(2)} €
                        </span>
                    )}
                </td>
                <td>
                    <span style={{ display: 'inline-block', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                        ↩ Report {prevLabel}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.75em', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Impayé du mois précédent — non compté dans les totaux
                    </span>
                </td>
                <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <MarkRentPaidButton
                            leaseId={lease.id}
                            periodStr={prevMonthPeriodStr}
                            defaultAmount={expected}
                            existingPaidAmount={alreadyPaid > 0 ? alreadyPaid : undefined}
                            buttonStyle={`${styles.actionButton} ${styles.paidButton}`}
                        />
                        <PaymentEmailActions
                            paymentId={payment?.id ?? null}
                            leaseId={lease.id}
                            periodStr={prevMonthPeriodStr}
                            isPaid={false}
                            hasEmail={!!lease.tenant.email}
                            buttonStyle={styles.actionButton}
                        />
                    </div>
                </td>
            </tr>
        );
    };

    const Th = (field: string, label: string) => {
        const isActive = sort === field;
        const nextDir = isActive && dir === 'asc' ? 'desc' : 'asc';
        const p = new URLSearchParams();
        if (monthParam) p.set('month', monthParam);
        p.set('sort', field);
        p.set('dir', nextDir);
        return (
            <th>
                <a href={`?${p.toString()}`} style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                    {label} <span style={{ fontSize: '0.65rem', opacity: isActive ? 1 : 0.3 }}>{isActive ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                </a>
            </th>
        );
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Suivi des Loyers</h1>

                <div className={styles.periodSelector}>
                    <Link href={`/rents?month=${prevMonthStr}`} className={styles.navButton}>←</Link>
                    <span className={styles.currentPeriod}>
                        {startOfMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </span>
                    <Link href={`/rents?month=${nextMonthStr}`} className={styles.navButton}>→</Link>
                </div>

            </header>

            {leases.length > 0 && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Perçu ce mois</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#22c55e' }}>{totalReceived.toFixed(0)} €</p>
                    </div>
                    <div style={{ width: '1px', background: 'var(--border-color)' }} />
                    <div style={{ flex: 1, minWidth: 120 }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Attendu</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>{totalExpected.toFixed(0)} €</p>
                    </div>
                    <div style={{ width: '1px', background: 'var(--border-color)' }} />
                    <div style={{ flex: 1, minWidth: 120 }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Taux de collecte</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 700, color: totalExpected > 0 && totalReceived >= totalExpected ? '#22c55e' : 'var(--warning)' }}>
                            {totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0} %
                        </p>
                    </div>
                    <div style={{ width: '1px', background: 'var(--border-color)' }} />
                    <div style={{ flex: 1, minWidth: 120 }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Cashflow net</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 700, color: netCashflow >= 0 ? '#22c55e' : '#ef4444' }}>{netCashflow.toFixed(0)} €</p>
                        {totalMonthlyCosts > 0 && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>− {totalMonthlyCosts.toFixed(0)} € charges fixes</p>
                        )}
                    </div>
                </div>
            )}

            <div className="table-container">
                <table className="std-table">
                    <thead>
                        <tr>
                            {Th('apartment', 'Appartement')}
                            {Th('tenant', 'Locataire')}
                            {Th('amount', 'Montant')}
                            {Th('status', 'Statut')}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leases.length === 0 && carriedOver.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Aucun contrat actif pour cette période.</td>
                            </tr>
                        ) : (
                            <>
                                {carriedOver.length > 0 && (
                                    <>
                                        <tr>
                                            <td colSpan={5} style={{ background: 'rgba(245,158,11,0.08)', padding: '0.4rem 0.75rem', fontWeight: 700, fontSize: '0.8rem', color: '#f59e0b', borderBottom: '1px solid rgba(245,158,11,0.25)' }}>
                                                ↩ Reports du mois précédent — {carriedOver.length} {carriedOver.length > 1 ? 'impayés' : 'impayé'} (hors totaux)
                                            </td>
                                        </tr>
                                        {carriedOver.map(renderCarriedRow)}
                                    </>
                                )}
                                <tr>
                                    <td colSpan={5} style={{ background: 'rgba(239,68,68,0.06)', padding: '0.4rem 0.75rem', fontWeight: 700, fontSize: '0.8rem', color: '#ef4444', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
                                        ⚠ Non payés — {unpaidLeases.length} {unpaidLeases.length > 1 ? 'baux' : 'bail'}
                                    </td>
                                </tr>
                                {unpaidLeases.length === 0 ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.75rem' }}>✓ Tous les loyers du mois sont réglés</td></tr>
                                ) : (
                                    unpaidLeases.map(renderRow)
                                )}
                                {paidLeases.length > 0 && (
                                    <>
                                        <tr>
                                            <td colSpan={5} style={{ background: 'rgba(34,197,94,0.06)', padding: '0.4rem 0.75rem', fontWeight: 700, fontSize: '0.8rem', color: '#22c55e', borderBottom: '1px solid rgba(34,197,94,0.2)', borderTop: '2px solid rgba(34,197,94,0.1)' }}>
                                                ✓ Payés — {paidLeases.length} {paidLeases.length > 1 ? 'baux' : 'bail'}
                                            </td>
                                        </tr>
                                        {paidLeases.map(renderRow)}
                                    </>
                                )}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
