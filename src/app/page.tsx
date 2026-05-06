import Link from "next/link";
import styles from "./page.module.css";
import { prisma } from "@/lib/prisma";
import { markRentReviewAsSent } from "@/actions/leases";
import { RentPayment, Expense, Apartment } from "@prisma/client";

export const dynamic = "force-dynamic";

function fmtEur(n: number) {
  return Math.round(n).toLocaleString('fr-FR') + ' €';
}

async function getCashflowData() {
  const now = new Date();
  const year = now.getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: startDate, lte: endDate } }
  });
  const payments = await prisma.rentPayment.findMany({
    where: { period: { gte: startDate, lte: endDate } }
  });
  const apartments = await prisma.apartment.findMany();

  const months = ['JAN','FÉV','MAR','AVR','MAI','JUI','JUI','AOÛ','SEP','OCT','NOV','DÉC'];
  const monthlyData = [];
  for (let m = 0; m < 12; m++) {
    const monthStart = new Date(year, m, 1);
    const monthEnd = new Date(year, m + 1, 0);
    const income = payments
      .filter((p: RentPayment) => p.period >= monthStart && p.period <= monthEnd)
      .reduce((s: number, p: RentPayment) => s + p.amount, 0);
    const varExp = expenses
      .filter((e: Expense) => e.date >= monthStart && e.date <= monthEnd)
      .reduce((s: number, e: Expense) => s + e.amount, 0);
    let fixedExp = 0;
    apartments.forEach((apt: Apartment) => {
      if (new Date(apt.createdAt) <= monthEnd)
        fixedExp += (apt.mortgageAmount || 0) + (apt.insuranceAmount || 0) + (apt.taxAmount || 0);
    });
    monthlyData.push({ m: months[m], v: Math.max(0, income - varExp - fixedExp) });
  }
  return monthlyData;
}

async function getStats() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const currentMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));

  const [apartmentCount, tenantCount, leaseCount] = await Promise.all([
    prisma.apartment.count({ where: { soldAt: null, OR: [{ availableFrom: null }, { availableFrom: { lte: today } }] } }),
    prisma.tenant.count({ where: { leases: { some: { startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] } } } }),
    prisma.lease.count({ where: { startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] } }),
  ]);

  const occupancyRate = apartmentCount > 0 ? Math.round((leaseCount / apartmentCount) * 100) : 0;
  const vacantCount = apartmentCount - leaseCount;

  const activeLeasesThisMonth = await prisma.lease.count({
    where: { startDate: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: currentMonthStart } }] }
  });
  const paymentsThisMonth = await prisma.rentPayment.findMany({
    where: { period: { gte: currentMonthStart, lt: nextMonthStart } }
  });
  const paidPayments = paymentsThisMonth.filter((p: RentPayment) => p.status === 'PAID').length;
  const paymentRate = activeLeasesThisMonth > 0
    ? Math.round((paidPayments / activeLeasesThisMonth) * 100) : 0;

  const totalRevenue = paymentsThisMonth
    .filter((p: RentPayment) => p.status === 'PAID')
    .reduce((s: number, p: RentPayment) => s + p.amount, 0);
  const expectedRevenue = paymentsThisMonth.reduce((s: number, p: RentPayment) => s + p.amount, 0);
  const latePayments = paymentsThisMonth.filter((p: RentPayment) => p.status === 'LATE').length;

  return {
    apartmentCount, tenantCount, occupancyRate, vacantCount,
    paymentRate, totalRevenue, expectedRevenue, latePayments,
  };
}

async function getRecentAlerts() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const currentMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

  const activeLeases = await prisma.lease.findMany({
    where: { isActive: true },
    include: { tenant: true, apartment: true, documents: true }
  });

  const rentReviews = activeLeases.filter((lease: any) => {
    const start = new Date(lease.startDate);
    const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const isTime = monthsDiff >= 10 && monthsDiff % 12 === 10;
    const lastReview = lease.lastRentReviewDate ? new Date(lease.lastRentReviewDate) : null;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return isTime && !(lastReview && lastReview > sixMonthsAgo);
  });

  const partialPayments = await prisma.rentPayment.findMany({
    where: { period: currentMonthStart, status: 'PARTIAL' },
    include: { lease: { include: { tenant: true, apartment: true } } },
  });

  const openIncidents = await prisma.task.findMany({
    where: { tenantId: { not: null }, status: { not: 'DONE' } },
    include: { apartment: true, tenant: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const unreadMessages = await prisma.message.findMany({
    where: { fromTenant: true, readAt: null },
    include: { tenant: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const lateLeases = await prisma.rentPayment.findMany({
    where: { period: currentMonthStart, status: 'LATE' },
    include: { lease: { include: { tenant: true, apartment: true } } },
    take: 5,
  });

  return { rentReviews, partialPayments, openIncidents, unreadMessages, lateLeases };
}

async function getUpcomingEvents() {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcoming = await prisma.lease.findMany({
    where: {
      isActive: true,
      endDate: { gte: now, lte: in30 },
    },
    include: { tenant: true, apartment: true },
    take: 4,
    orderBy: { endDate: 'asc' },
  });
  return upcoming;
}

const MONTHS_SHORT = ['JAN','FÉV','MAR','AVR','MAI','JUI','JUI','AOÛ','SEP','OCT','NOV','DÉC'];

export default async function Home() {
  const [stats, cashflow, alerts, upcoming] = await Promise.all([
    getStats(),
    getCashflowData(),
    getRecentAlerts(),
    getUpcomingEvents(),
  ]);

  const now = new Date();
  const monthYear = `${MONTHS_SHORT[now.getMonth()]} · ${now.getFullYear()}`;

  const maxCashflow = Math.max(...cashflow.map(d => d.v), 1);
  const lastCashflow = cashflow[cashflow.length - 1]?.v ?? 0;
  const prevCashflow = cashflow[cashflow.length - 2]?.v ?? 1;
  const delta = ((lastCashflow - prevCashflow) / prevCashflow) * 100;

  const totalExpensesMonth = alerts.partialPayments.reduce((s: number, p: any) => s + (p.amount - (p.paidAmount ?? 0)), 0);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <div className={styles.dateLabel}>{monthYear}</div>
          <h1 className={styles.pageTitle}>
            Tableau de bord
            <span className={styles.pageTitleAccent}>—</span>
          </h1>
        </div>
        <div className={styles.headerActions}>
          <Link href="/rents" className={styles.iconButton} title="Loyers">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 6.5A6 6 0 0 0 7 12a6 6 0 0 0 10 5.5"/><path d="M5 10h8M5 13.5h8"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Alert banners */}
      {alerts.rentReviews.length > 0 && (
        <div className={`${styles.alertBanner} ${styles.info}`}>
          <div style={{ width: '100%' }}>
            <div className={styles.alertTitle}>Révisions de loyer — {alerts.rentReviews.length}</div>
            {alerts.rentReviews.map((lease: any) => (
              <div key={lease.id} className={styles.alertItem}>
                <span>
                  <strong>{lease.tenant.firstName} {lease.tenant.lastName}</strong>
                  {' · '}
                  <Link href={`/apartments/${lease.apartment.id}`} style={{ color: 'var(--accent-color)' }}>
                    {lease.apartment.name || lease.apartment.address}
                  </Link>
                </span>
                <form action={markRentReviewAsSent.bind(null, lease.id)}>
                  <button type="submit" className={styles.alertDismissButton}>Marquer envoyé</button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.openIncidents.length > 0 && (
        <div className={`${styles.alertBanner} ${styles.warn}`}>
          <div style={{ width: '100%' }}>
            <div className={styles.alertTitle}>Signalements en cours — {alerts.openIncidents.length}</div>
            {alerts.openIncidents.map((task: any) => (
              <div key={task.id} className={styles.alertItem}>
                <span>
                  <strong>{task.tenant.firstName} {task.tenant.lastName}</strong>
                  {' · '}
                  <Link href={`/apartments/${task.apartmentId}`} style={{ color: 'var(--warning)' }}>
                    {task.apartment.name || task.apartment.address}
                  </Link>
                  {task.title && <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: 12 }}>{task.title}</span>}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {task.status === 'TODO' ? 'À TRAITER' : 'EN COURS'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.unreadMessages.length > 0 && (
        <div className={`${styles.alertBanner} ${styles.info}`}>
          <div style={{ width: '100%' }}>
            <div className={styles.alertTitle}>Messages non lus — {alerts.unreadMessages.length}</div>
            {alerts.unreadMessages.map((msg: any) => (
              <div key={msg.id} className={styles.alertItem}>
                <Link href={`/tenants/${msg.tenantId}`} style={{ color: 'var(--accent-color)', fontWeight: 500 }}>
                  {msg.tenant.firstName} {msg.tenant.lastName}
                </Link>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', flex: 1, padding: '0 12px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  "{msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content}"
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className={styles.kpiGrid}>
        <Link href="/rents" className={styles.kpiCard}>
          <div className={styles.kpiHalo} style={{ background: 'radial-gradient(circle, rgba(163,230,53,.28), transparent 70%)' }} />
          <div className={styles.kpiLabel}>Cash Flow</div>
          <div className={styles.kpiValue}>{fmtEur(lastCashflow)}</div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiDelta} style={{ color: delta >= 0 ? '#a3e635' : '#f87171' }}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)} %
            </span>
            <span className={styles.kpiSub}>vs mois préc.</span>
          </div>
        </Link>

        <Link href="/rents" className={styles.kpiCard}>
          <div className={styles.kpiHalo} style={{ background: 'radial-gradient(circle, rgba(103,232,249,.22), transparent 70%)' }} />
          <div className={styles.kpiLabel}>Loyers reçus</div>
          <div className={styles.kpiValue}>{fmtEur(stats.totalRevenue)}</div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiSub}>{stats.paymentRate} % · {fmtEur(stats.expectedRevenue)} attendus</span>
          </div>
        </Link>

        <Link href="/apartments" className={styles.kpiCard}>
          <div className={styles.kpiHalo} style={{ background: 'radial-gradient(circle, rgba(251,191,36,.18), transparent 70%)' }} />
          <div className={styles.kpiLabel}>Taux d'occupation</div>
          <div className={styles.kpiValue}>{stats.occupancyRate} %</div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiSub}>{stats.apartmentCount - stats.vacantCount} loués · {stats.vacantCount} vacant</span>
          </div>
        </Link>

        <Link href="/rents" className={styles.kpiCard}>
          <div className={styles.kpiHalo} style={{ background: 'radial-gradient(circle, rgba(248,113,113,.18), transparent 70%)' }} />
          <div className={styles.kpiLabel}>En attente</div>
          <div className={styles.kpiValue} style={{ color: stats.latePayments > 0 ? '#f87171' : 'var(--text-main)' }}>
            {stats.latePayments}
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiSub}>retard{stats.latePayments !== 1 ? 's' : ''} ce mois</span>
          </div>
        </Link>
      </div>

      {/* Middle: chart + upcoming events */}
      <div className={styles.midRow}>
        {/* Cash flow chart */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>Flux 12 mois</div>
              <div className={styles.chartBig}>
                {fmtEur(lastCashflow)}
                <span className={styles.chartBigDelta}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(1)} %
                </span>
              </div>
            </div>
          </div>
          <div className={styles.chartWrap}>
            {cashflow.map((d, i) => {
              const hPct = Math.max(2, (d.v / maxCashflow) * 100);
              const isLast = i === cashflow.length - 1;
              return (
                <div
                  key={i}
                  className={styles.chartBar}
                  style={{
                    height: `${hPct}%`,
                    background: isLast ? '#a3e635' : 'rgba(163,230,53,.35)',
                    animationDelay: `${i * 40}ms`,
                  }}
                  title={`${d.m}: ${fmtEur(d.v)}`}
                />
              );
            })}
          </div>
          <div className={styles.chartXLabels}>
            {cashflow.filter((_, i) => i % 2 === 0).map(d => (
              <span key={d.m}>{d.m}</span>
            ))}
          </div>
        </div>

        {/* Upcoming events */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>À venir</span>
            <Link href="/agenda" className={styles.sectionLink}>Tout voir</Link>
          </div>
          {upcoming.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucune échéance prochaine.</p>
          ) : (
            <div className={styles.eventList}>
              {upcoming.map((lease: any) => {
                const end = new Date(lease.endDate);
                const day = end.getDate();
                const month = MONTHS_SHORT[end.getMonth()];
                return (
                  <Link key={lease.id} href={`/leases/${lease.id}`} className={styles.eventRow}>
                    <div className={styles.eventDate}>
                      <div className={styles.eventDay} style={{ color: '#fbbf24' }}>{day}</div>
                      <div className={styles.eventMonth}>{month}</div>
                    </div>
                    <div className={styles.eventDivider} />
                    <div className={styles.eventContent}>
                      <div className={styles.eventLabel}>Bail — {lease.tenant.firstName} {lease.tenant.lastName}</div>
                      <div className={styles.eventSub}>{lease.apartment.name || lease.apartment.address}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: late payments + occupancy */}
      <div className={styles.bottomRow}>
        {/* Late payments */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Retards</span>
            <Link href="/rents" className={styles.sectionLink}>Suivi</Link>
          </div>
          {alerts.lateLeases.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucun retard ce mois. 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.lateLeases.map((p: any) => {
                const t = p.lease.tenant;
                const initials = `${t.firstName?.[0] ?? ''}${t.lastName?.[0] ?? ''}`.toUpperCase();
                return (
                  <Link key={p.id} href={`/tenants/${t.id}`} className={styles.lateRow}>
                    <div className={styles.lateAvatar}>{initials}</div>
                    <div className={styles.lateInfo}>
                      <div className={styles.lateName}>{t.firstName} {t.lastName}</div>
                      <div className={styles.lateSub}>{p.lease.apartment.name || p.lease.apartment.address}</div>
                    </div>
                    <div className={styles.lateAmount}>{fmtEur(p.amount)}</div>
                    <span className="pill pill-err" style={{ marginLeft: 8, flexShrink: 0 }}>RETARD</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Occupancy */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle} style={{ marginBottom: 12 }}>Occupation</div>
          <div className={styles.occupancyBig}>
            {stats.occupancyRate}
            <span style={{ fontSize: 24, color: 'var(--text-muted)' }}>%</span>
          </div>
          <div className={styles.occupancySub}>
            {stats.apartmentCount - stats.vacantCount} LOUÉS · {stats.vacantCount} VACANT{stats.vacantCount !== 1 ? 'S' : ''}
          </div>
          <div className={styles.occupancyBar}>
            {Array.from({ length: stats.apartmentCount }).map((_, i) => (
              <div
                key={i}
                className={styles.occupancySlot}
                style={{
                  background: i < stats.latePayments
                    ? '#f87171'
                    : i < stats.apartmentCount - stats.vacantCount
                    ? '#a3e635'
                    : '#fbbf24'
                }}
              />
            ))}
          </div>
          <div className={styles.occupancyLegend}>
            <span style={{ color: '#a3e635' }}>OK {stats.apartmentCount - stats.vacantCount - stats.latePayments}</span>
            {stats.latePayments > 0 && <span style={{ color: '#f87171' }}>RET. {stats.latePayments}</span>}
            {stats.vacantCount > 0 && <span style={{ color: '#fbbf24' }}>VAC. {stats.vacantCount}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
