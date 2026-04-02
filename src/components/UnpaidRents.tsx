import { prisma } from "@/lib/prisma";
import Link from "next/link";
import styles from "./UnpaidRents.module.css";
import { formatDate } from "@/lib/utils";

export default async function UnpaidRents() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const allUnpaid = await prisma.rentPayment.findMany({
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

    const currentDay = now.getDate();
    // Don't alert before the tenant's usual payment day for the current month
    const unpaidPayments = allUnpaid.filter(payment => {
        const paymentDay = payment.lease.tenant.paymentDay || 5;
        const isPastPeriod = new Date(payment.period).getTime() < currentMonthStart.getTime();
        return isPastPeriod || currentDay >= paymentDay;
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
                    const paymentDay = payment.lease.tenant.paymentDay || 5;
                    const currentDay = now.getDate();
                    const daysOverdue = currentDay - paymentDay;
                    const isLate = daysOverdue > 4;

                    return (
                        <div key={payment.id} className={`${styles.item} ${isLate ? styles.itemLate : ''}`}>
                            <div className={styles.itemInfo}>
                                <div className={styles.itemName}>
                                    {payment.lease.tenant.firstName} {payment.lease.tenant.lastName}
                                </div>
                                <div className={styles.itemApartment}>
                                    🏠 {payment.lease.apartment.name || payment.lease.apartment.address}
                                </div>
                                {isLate ? (
                                    <div className={styles.itemDays}>
                                        {daysOverdue} jours de retard
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.15rem' }}>
                                        À régler
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
