import Link from "next/link";
import Logo from "@/components/Logo";
import UnpaidRents from "@/components/UnpaidRents";
import UpcomingExpirations from "@/components/UpcomingExpirations";
import styles from "./page.module.css";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { markRentReviewAsSent } from "@/actions/leases";

export const dynamic = "force-dynamic";

async function getStats() {
  const apartmentCount = await prisma.apartment.count();
  const tenantCount = await prisma.tenant.count();
  const leaseCount = await prisma.lease.count({ where: { isActive: true } });

  const occupancyRate = apartmentCount > 0 ? ((leaseCount / apartmentCount) * 100).toFixed(0) : 0;

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const paymentsThisMonth = await prisma.rentPayment.findMany({
    where: { period: { gte: currentMonthStart } }
  });

  const paidPayments = paymentsThisMonth.filter(p => p.status === 'PAID').length;
  const totalPayments = paymentsThisMonth.length;
  const paymentRate = totalPayments > 0 ? ((paidPayments / totalPayments) * 100).toFixed(0) : 0;

  const totalRevenue = paymentsThisMonth
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  const expectedRevenue = paymentsThisMonth.reduce((sum, p) => sum + p.amount, 0);

  const latePayments = paymentsThisMonth.filter(p => p.status === 'LATE').length;

  return {
    apartmentCount,
    tenantCount,
    occupancyRate,
    paymentRate,
    totalRevenue,
    expectedRevenue,
    latePayments
  };
}

export default async function Home() {
  const stats = await getStats();

  // Rent Review Alerts Logic
  const activeLeases = await prisma.lease.findMany({
    where: { isActive: true },
    include: { tenant: true, apartment: true }
  });

  const now = new Date();

  const rentReviews = activeLeases.filter(lease => {
    const start = new Date(lease.startDate);
    const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const isTimeForReview = monthsDiff >= 10 && monthsDiff % 12 === 10;
    const lastReview = lease.lastRentReviewDate ? new Date(lease.lastRentReviewDate) : null;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const wasSentRecently = lastReview && lastReview > sixMonthsAgo;
    return isTimeForReview && !wasSentRecently;
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <Logo size={80} />
        </div>
        <h1 className={styles.title}>Rentmaestro</h1>
        <p className={styles.subtitle}>Gérez vos investissements locatifs avec élégance.</p>
      </header>

      {/* Rent Review Alert Section */}
      {rentReviews.length > 0 && (
        <section className={styles.alertSection}>
          <h2 className={styles.alertTitle}>
            📈 Révisions de Loyer à prévoir
          </h2>
          <div className={styles.alertList}>
            {rentReviews.map(lease => (
              <div key={lease.id} className={styles.alertItem}>
                <span>
                  <strong>{lease.tenant.firstName} {lease.tenant.lastName}</strong> ({lease.apartment.address})
                  <span className={styles.alertItemDetail}>
                    En place depuis le {formatDate(lease.startDate)}
                  </span>
                </span>
                <form action={markRentReviewAsSent.bind(null, lease.id)}>
                  <button
                    type="submit"
                    className={styles.alertDismissButton}
                    title="Cliquez pour faire disparaître l'alerte"
                  >
                    Marquer comme envoyé
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.grid}>
        <Link href="/rents" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>💰 Loyers reçus ce mois</span>
          </div>
          <div className={styles.cardValue}>{stats.paymentRate}%</div>
          <div className={styles.cardSubtext}>{stats.totalRevenue.toFixed(0)} € / {stats.expectedRevenue.toFixed(0)} €</div>
        </Link>
        <Link href="/apartments" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Appartements</span>
          </div>
          <div className={styles.cardValue}>{stats.apartmentCount}</div>
        </Link>
        <Link href="/tenants" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Locataires Actifs</span>
          </div>
          <div className={styles.cardValue}>{stats.tenantCount}</div>
        </Link>
        <Link href="/stats" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Taux d'occupation</span>
          </div>
          <div className={styles.cardValue}>{stats.occupancyRate}%</div>
        </Link>
        <Link href="/rents" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>⚠️ Retards de paiement</span>
          </div>
          <div className={styles.cardValue}>{stats.latePayments}</div>
        </Link>
      </section>

      <UnpaidRents />
      <UpcomingExpirations />
    </div>
  );
}
