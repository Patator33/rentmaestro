import Link from "next/link";
import Logo from "@/components/Logo";
import UnpaidRents from "@/components/UnpaidRents";
import styles from "./page.module.css";
import { prisma } from "@/lib/prisma";

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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <Logo size={80} />
        </div>
        <h1 className={styles.title}>Rentmaestro</h1>
        <p className={styles.subtitle}>Gérez vos investissements locatifs avec élégance.</p>
      </header>

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
