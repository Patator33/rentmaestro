
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import { formatDate } from "@/lib/utils";
import { sendRentReminder } from "@/actions/rents";
import GenerateRentsButton from "@/components/GenerateRentsButton";
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

                <GenerateRentsButton />
            </header>

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
                            leases.map(lease => {
                                const payment = lease.payments[0];
                                const isPaid = payment?.status === 'PAID';
                                const totalAmount = lease.rentAmount + lease.chargesAmount;

                                // Prorata for first month
                                const leaseStart = new Date(lease.startDate);
                                const startDay = leaseStart.getUTCDate();
                                const isFirstMonth = leaseStart >= startOfMonth && leaseStart < nextMonth;
                                const daysInMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)).getUTCDate();
                                const daysRemaining = daysInMonth - startDay;
                                const displayAmount = isFirstMonth && startDay > 1
                                    ? Math.round((totalAmount / daysInMonth) * daysRemaining * 100) / 100
                                    : totalAmount;

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
                                            ) : payment ? (
                                                <span className={styles.statusPending}>
                                                    ⚠ En attente
                                                    {payment.sentAt && (
                                                        <span style={{ display: 'block', fontSize: '0.8em', fontWeight: 'normal', color: 'var(--warning)' }}>
                                                            (Relancé le {formatDate(payment.sentAt)})
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className={styles.statusUnpaid}>À régler</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                {!isPaid && (
                                                    <MarkRentPaidButton
                                                        leaseId={lease.id}
                                                        periodStr={currentMonthStr}
                                                        defaultAmount={displayAmount}
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
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
