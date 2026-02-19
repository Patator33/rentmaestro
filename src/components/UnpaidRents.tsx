import { prisma } from "@/lib/prisma";
import Link from "next/link";
import styles from "./UnpaidRents.module.css";
import { formatDate } from "@/lib/utils";

export default async function UnpaidRents() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const unpaidPayments = await prisma.rentPayment.findMany({
        where: {
            period: { gte: currentMonthStart },
            status: { in: ['PENDING', 'LATE'] }
        },
        include: {
            lease: {
                include: {
                    tenant: true,
                    apartment: true
                }
            }
        },
        orderBy: { period: 'asc' }
    });

    if (unpaidPayments.length === 0) {
        return null;
    }

    return (
        <section className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>⚠️ Loyers non perçus ce mois</h2>
                <Link href="/rents" className={styles.link}>Voir tout →</Link>
            </div>

            <div className={styles.list}>
                {unpaidPayments.map((payment) => {
                    const daysSincePeriod = Math.floor((now.getTime() - payment.period.getTime()) / (1000 * 60 * 60 * 24));
                    // Check if current day of month is > tenant's preferred payment day
                    const paymentDay = payment.lease.tenant.paymentDay || 5;
                    const currentDay = now.getDate();
                    // Just simple check: if we are past the payment day in the current month
                    const isLate = currentDay > paymentDay;

                    return (
                        <div key={payment.id} className={`${styles.item} ${isLate ? styles.itemLate : ''}`}>
                            <div className={styles.itemInfo}>
                                <div className={styles.itemName}>
                                    {payment.lease.tenant.firstName} {payment.lease.tenant.lastName}
                                </div>
                                <div className={styles.itemApartment}>
                                    🏠 {payment.lease.apartment.name || payment.lease.apartment.address}
                                </div>
                                {isLate && (
                                    <div className={styles.itemDays}>
                                        {daysSincePeriod} jours de retard
                                    </div>
                                )}
                                {payment.sentAt && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.25rem' }}>
                                        📩 Relancé le {formatDate(payment.sentAt)}
                                    </div>
                                )}
                            </div>
                            <div className={styles.itemAmount}>
                                {payment.amount.toFixed(2)} €
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
