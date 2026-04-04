
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import { formatDate } from "@/lib/utils";
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

    // Find active leases for this period
    // Active if startDate < end of this month AND (no endDate OR endDate > start of this month)
    const rawLeases = await prisma.lease.findMany({
        where: {
            startDate: { lt: nextMonth },
            OR: [
                { endDate: null },
                { endDate: { gte: startOfMonth } }
            ]
        },
        include: {
            apartment: true,
            tenant: true,
            payments: {
                where: {
                    period: startOfMonth
                }
            }
        }
    });

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

    const unpaidLeases = leases.filter(l => l.payments[0]?.status !== 'PAID');
    const paidLeases = leases.filter(l => l.payments[0]?.status === 'PAID');

    // Summary totals
    let totalReceived = 0;
    let totalExpected = 0;
    const daysInMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)).getUTCDate();
    const seenApartments = new Set<string>();
    let totalMonthlyCosts = 0;
    for (const lease of leases) {
        const payment = lease.payments[0];
        const totalAmount = lease.rentAmount + lease.chargesAmount;
        const leaseStart = new Date(lease.startDate);
        const startDay = leaseStart.getUTCDate();
        const isFirstMonth = leaseStart >= startOfMonth && leaseStart < nextMonth;
        const daysRemaining = daysInMonth - startDay;
        const fallbackAmount = isFirstMonth && startDay > 1
            ? Math.round((totalAmount / daysInMonth) * daysRemaining * 100) / 100
            : totalAmount;
        totalExpected += payment ? payment.amount : fallbackAmount;
        if (payment?.status === 'PAID') totalReceived += payment.amount;
        else if (payment?.status === 'PARTIAL' && (payment as any).paidAmount != null) totalReceived += (payment as any).paidAmount;
        // Monthly costs per unique apartment (taxe foncière is annual → /12)
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
        const isPaid = payment?.status === 'PAID';
        const totalAmount = lease.rentAmount + lease.chargesAmount;
        const leaseStart = new Date(lease.startDate);
        const startDay = leaseStart.getUTCDate();
        const isFirstMonth = leaseStart >= startOfMonth && leaseStart < nextMonth;
        const daysInMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)).getUTCDate();
        const daysRemaining = daysInMonth - startDay;
        const fallbackAmount = isFirstMonth && startDay > 1
            ? Math.round((totalAmount / daysInMonth) * daysRemaining * 100) / 100
            : totalAmount;
        const displayAmount = payment ? payment.amount : fallbackAmount;

        return (
            <tr key={lease.id}>
                <td>
                    <Link href={`/apartments/${lease.apartment.id}`} style={{ color: 'var(--text-main)' }}>
                        {lease.apartment.name || lease.apartment.address}
                    </Link>
                </td>
                <td>
                    <Link href={`/tenants/${lease.tenant.id}`} style={{ color: 'var(--text-main)' }}>
                        {lease.tenant.firstName} {lease.tenant.lastName}
                    </Link>
                </td>
                <td>{displayAmount.toFixed(2)} €</td>
                <td>
                    {isPaid ? (
                        <span className={styles.statusPaid}>✓ Payé {formatDate(payment.paidAt)}</span>
                    ) : payment?.status === 'PARTIAL' ? (
                        <span>
                            <span style={{ display: 'inline-block', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>💰 Partiel</span>
                            {payment.paidAmount != null && (
                                <span style={{ display: 'block', fontSize: '0.8em', color: '#f59e0b', marginTop: '0.15rem' }}>
                                    Reçu : {payment.paidAmount.toFixed(2)} € — Solde : {(payment.amount - payment.paidAmount).toFixed(2)} €
                                </span>
                            )}
                        </span>
                    ) : payment ? (() => {
                        const paymentDay = lease.tenant.paymentDay || 5;
                        const daysOverdue = now.getDate() - paymentDay;
                        const isLate = daysOverdue > 4;
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
                                defaultAmount={payment?.amount ?? fallbackAmount}
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

                        {isPaid && (
                            <a
                                href={`/api/quittance?leaseId=${lease.id}&period=${currentMonthStr}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${styles.actionButton}`}
                                style={{ textDecoration: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                            >
                                📄 Quittance
                            </a>
                        )}
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
                        {leases.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Aucun contrat actif pour cette période.</td>
                            </tr>
                        ) : (
                            <>
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
