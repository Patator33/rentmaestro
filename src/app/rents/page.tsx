import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import { markRentAsPaid, sendRentReminder } from "@/actions/rents";

export const dynamic = "force-dynamic";

export default async function RentsPage({
    searchParams,
}: {
    searchParams: { month?: string };
}) {
    const now = new Date();
    const monthParam = searchParams.month; // YYYY-MM

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
    const leases = await prisma.lease.findMany({
        where: {
            startDate: { lte: nextMonth },
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

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Appartement</th>
                            <th>Locataire</th>
                            <th>Montant</th>
                            <th>Statut</th>
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

                                return (
                                    <tr key={lease.id}>
                                        <td>{lease.apartment.address}</td>
                                        <td>{lease.tenant.firstName} {lease.tenant.lastName}</td>
                                        <td>{totalAmount.toFixed(2)} €</td>
                                        <td>
                                            {isPaid ? (
                                                <span className={styles.statusPaid}>✓ Payé {payment.paidAt?.toLocaleDateString()}</span>
                                            ) : payment ? (
                                                <span className={styles.statusPending}>
                                                    ⚠ En attente
                                                    {payment.sentAt && (
                                                        <span style={{ display: 'block', fontSize: '0.8em', fontWeight: 'normal', color: 'var(--warning)' }}>
                                                            (Relancé le {payment.sentAt.toLocaleDateString()})
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
                                                    <form action={markRentAsPaid.bind(null, lease.id, currentMonthStr, totalAmount)}>
                                                        <button type="submit" className={`${styles.actionButton} ${styles.paidButton}`}>
                                                            Marquer Payé
                                                        </button>
                                                    </form>
                                                )}

                                                {!isPaid && (
                                                    <form action={sendRentReminder.bind(null, lease.id, currentMonthStr)}>
                                                        <button type="submit" className={`${styles.actionButton} ${styles.reminderButton}`}>
                                                            Relancer
                                                        </button>
                                                    </form>
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
