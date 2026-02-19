import Link from "next/link";
import Logo from "@/components/Logo";
import UnpaidRents from "@/components/UnpaidRents";
import styles from "./page.module.css";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getStats() {
  const apartmentCount = await prisma.apartment.count();
  const tenantCount = await prisma.tenant.count();
  const leaseCount = await prisma.lease.count({ where: { isActive: true } });

  // Occupancy rate
  const occupancyRate = apartmentCount > 0 ? ((leaseCount / apartmentCount) * 100).toFixed(0) : 0;

  // Current month payment rate
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const paymentsThisMonth = await prisma.rentPayment.findMany({
    where: {
      period: {
        gte: currentMonthStart
      }
    }
  });

  const paidPayments = paymentsThisMonth.filter(p => p.status === 'PAID').length;
  const totalPayments = paymentsThisMonth.length;
  const paymentRate = totalPayments > 0 ? ((paidPayments / totalPayments) * 100).toFixed(0) : 0;

  // Total revenue this month
  const totalRevenue = paymentsThisMonth
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  // Expected revenue this month
  const expectedRevenue = paymentsThisMonth.reduce((sum, p) => sum + p.amount, 0);

  // Late payments count
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
    // Check if tenure is 10 months, 22 months, 34 months... (10 months + N years)
    return monthsDiff >= 10 && monthsDiff % 12 === 10;
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
        <section style={{
          marginBottom: '3rem',
          padding: '1.5rem',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '1rem',
          animation: 'fadeIn 0.8s ease-out'
        }}>
          <h2 style={{ color: '#22c55e', fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📈 Révisions de Loyer à prévoir
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rentReviews.map(lease => (
              <div key={lease.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#dcfce7' }}>
                <span>
                  <strong>{lease.tenant.firstName} {lease.tenant.lastName}</strong> ({lease.apartment.address})
                </span>
                <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                  En place depuis le {formatDate(lease.startDate)}
                </span>
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
    </div>
  );
}
