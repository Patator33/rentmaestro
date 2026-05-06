import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import styles from "./UpcomingExpirations.module.css";

export default async function UpcomingExpirations() {
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const expiringLeases = await prisma.lease.findMany({
        where: {
            isActive: true,
            endDate: {
                gte: now,
                lte: threeMonthsFromNow,
            }
        },
        include: {
            apartment: true,
            tenant: true,
        },
        orderBy: { endDate: 'asc' }
    });

    if (expiringLeases.length === 0) return null;

    return (
        <section className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>📅 Échéances à venir (3 mois)</h2>
                <Link href="/leases" className={styles.link}>Voir les baux →</Link>
            </div>
            <div className={styles.list}>
                {expiringLeases.map(lease => {
                    const daysLeft = Math.ceil(
                        (new Date(lease.endDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const isUrgent = daysLeft <= 30;

                    return (
                        <div key={lease.id} className={`${styles.item} ${isUrgent ? styles.itemUrgent : ''}`}>
                            <div className={styles.itemInfo}>
                                <div className={styles.itemName}>
                                    {lease.tenant.firstName} {lease.tenant.lastName}
                                </div>
                                <div className={styles.itemApartment}>
                                    🏠 {lease.apartment.name || lease.apartment.address}
                                </div>
                            </div>
                            <div className={styles.itemDate}>
                                <span className={styles.daysLeft}>
                                    {isUrgent ? '🔴' : '🟡'} {daysLeft}j
                                </span>
                                <span className={styles.endDate}>
                                    Fin : {formatDate(lease.endDate)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
