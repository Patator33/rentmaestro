import Link from "next/link";
import styles from "./page.module.css";
import { prisma } from "@/lib/prisma";
import { markRentReviewAsSent } from "@/actions/leases";
import { expectedRentForPeriod, isRentSettled, isRentLate, unsettledPastRents, PAST_MONTHS_SCANNED } from "@/lib/rent-period";
import { getAgendaEvents } from "@/lib/agenda-events";
import { occupancyBreakdown, type ApartmentStateCode } from "@/lib/apartment-state";
import { buildingExpensesTotal } from "@/lib/building-expenses";
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
  const buildings = await prisma.building.findMany();
  const buildingsFixedExp = buildings.reduce((s, b) => s + buildingExpensesTotal(b), 0);

  const months = ['JAN','FÉV','MAR','AVR','MAI','JUI','JUI','AOÛ','SEP','OCT','NOV','DÉC'];
  const monthlyData = [];
  for (let m = 0; m < 12; m++) {
    const monthStart = new Date(year, m, 1);
    const monthEnd = new Date(year, m + 1, 0);
    // Encaissements réels : un loyer simplement attendu n'est pas un flux.
    const income = payments
      .filter((p: RentPayment) => p.period >= monthStart && p.period <= monthEnd)
      .reduce((s: number, p: any) => {
        if (p.status === 'PAID') return s + p.amount;
        if (p.status === 'PARTIAL') return s + (p.paidAmount ?? 0);
        return s;
      }, 0);
    const varExp = expenses
      .filter((e: Expense) => e.date >= monthStart && e.date <= monthEnd)
      .reduce((s: number, e: Expense) => s + e.amount, 0);
    let fixedExp = buildingsFixedExp;
    apartments.forEach((apt: Apartment) => {
      if (new Date(apt.createdAt) <= monthEnd)
        fixedExp += (apt.mortgageAmount || 0) + (apt.insuranceAmount || 0) + (apt.taxAmount || 0);
    });
    // Valeur réelle, y compris négative : la plafonner à 0 affichait un cash
    // flow nul là où les charges dépassent les encaissements.
    monthlyData.push({ m: months[m], v: income - varExp - fixedExp });
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

  // Chiffres du mois calculés depuis les baux : tant que la génération mensuelle
  // n'a pas créé les RentPayment, se baser sur eux affichait 0 partout.
  const leasesThisMonth = await prisma.lease.findMany({
    where: {
      startDate: { lt: nextMonthStart },
      OR: [{ endDate: null }, { endDate: { gte: currentMonthStart } }],
    },
    include: { payments: { where: { period: currentMonthStart } } },
  });

  const monthRows = leasesThisMonth.map(lease => {
    const payment = lease.payments[0] ?? null;
    const expected = expectedRentForPeriod(lease, currentMonthStart);
    const received = payment?.status === 'PAID'
      ? payment.amount
      : payment?.status === 'PARTIAL' ? (payment.paidAmount ?? 0) : 0;
    return { expected, received, settled: isRentSettled(payment, expected) };
  }).filter(r => r.expected > 0);

  const activeLeasesThisMonth = monthRows.length;
  const paidPayments = monthRows.filter(r => r.settled).length;
  const paymentRate = activeLeasesThisMonth > 0
    ? Math.round((paidPayments / activeLeasesThisMonth) * 100) : 0;

  const totalRevenue = monthRows.reduce((s, r) => s + r.received, 0);
  const expectedRevenue = monthRows.reduce((s, r) => s + r.expected, 0);

  const unsettledRows = monthRows.filter(r => !r.settled);
  const pendingCount = unsettledRows.length;
  const pendingAmount = unsettledRows.reduce((s, r) => s + Math.max(0, r.expected - r.received), 0);

  // Même logique dynamique que la liste des retards : ne pas dépendre du statut LATE stocké.
  const scanFrom = new Date(Date.UTC(now.getFullYear(), now.getMonth() - PAST_MONTHS_SCANNED, 1));
  const leasesForLateCount = await prisma.lease.findMany({
    where: {
      startDate: { lte: today },
      OR: [{ endDate: null }, { endDate: { gte: scanFrom } }],
    },
    include: { tenant: true, payments: { where: { period: { gte: scanFrom } } } },
  });

  const currentLateCount = leasesForLateCount.filter(lease => {
    if (lease.endDate && new Date(lease.endDate) < currentMonthStart) return false;
    const payment = lease.payments.find(p => p.period.getTime() === currentMonthStart.getTime()) ?? null;
    if (isRentSettled(payment, expectedRentForPeriod(lease, currentMonthStart))) return false;
    return isRentLate(currentMonthStart, lease.tenant.paymentDay, lease.startDate);
  }).length;

  const latePayments = currentLateCount + unsettledPastRents(leasesForLateCount, currentMonthStart).length;

  // Barre d'occupation : un état par logement. Compter les baux donnait un total
  // supérieur au parc (changement de locataire en cours de mois = deux baux).
  const occupancyApartments = await prisma.apartment.findMany({
    where: { soldAt: null, OR: [{ availableFrom: null }, { availableFrom: { lte: today } }] },
    include: {
      leases: {
        include: {
          tenant: { select: { paymentDay: true } },
          payments: { where: { period: { gte: scanFrom } }, orderBy: { period: 'desc' } },
        },
      },
    },
  });
  const occupancy = occupancyBreakdown(occupancyApartments, currentMonthStart, now);

  return {
    apartmentCount, tenantCount, occupancyRate, vacantCount,
    paymentRate, totalRevenue, expectedRevenue, latePayments,
    pendingCount, pendingAmount,
    occupancy,
  };
}

async function getRecentAlerts() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const currentMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

  // isActive seul ne suffit pas : un bail dont la date de fin est passée peut
  // l'avoir gardé à true et continuait donc à déclencher des alertes.
  const activeLeases = await prisma.lease.findMany({
    where: {
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gte: today } }],
    },
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

  // Retard calculé ici plutôt que lu depuis le statut LATE stocké : ce statut
  // n'est posé que par la génération des loyers, donc un impayé restait absent
  // du dashboard tant que ce traitement n'avait pas tourné.
  const scanFrom = new Date(Date.UTC(now.getFullYear(), now.getMonth() - PAST_MONTHS_SCANNED, 1));
  const leasesForLate = await prisma.lease.findMany({
    where: {
      startDate: { lte: today },
      OR: [{ endDate: null }, { endDate: { gte: scanFrom } }],
    },
    include: {
      tenant: true,
      apartment: true,
      payments: { where: { period: { gte: scanFrom } } },
    },
  });

  const currentMonthLate = leasesForLate
    .map(lease => {
      // Bail déjà terminé avant ce mois : plus rien dû, même si endDate reste
      // dans la fenêtre de scan (utile pour les impayés passés uniquement).
      if (lease.endDate && new Date(lease.endDate) < currentMonthStart) return null;
      const payment = lease.payments.find(p => p.period.getTime() === currentMonthStart.getTime()) ?? null;
      const expected = expectedRentForPeriod(lease, currentMonthStart);
      if (isRentSettled(payment, expected)) return null;
      if (!isRentLate(currentMonthStart, lease.tenant.paymentDay, lease.startDate)) return null;
      const paid = payment?.status === 'PARTIAL' ? (payment.paidAmount ?? 0) : 0;
      return {
        id: payment?.id ?? lease.id,
        amount: Math.max(0, expected - paid),
        period: currentMonthStart,
        lease,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Impayés des mois passés, en retard par définition. Calculés depuis les baux
  // et non depuis les RentPayment existants : quand la génération mensuelle n'a
  // pas tourné, il n'y a aucune ligne en base et le loyer est pourtant bien dû.
  const pastLate = unsettledPastRents(leasesForLate, currentMonthStart);

  const lateLeases = [...pastLate, ...currentMonthLate].slice(0, 5);

  const incompleteGed = activeLeases
    .filter((lease: any) => {
      // Pas d'alerte GED sur un bail qui n'a pas encore commencé.
      if (new Date(lease.startDate) > today) return false;
      const types = lease.documents.map((d: any) => d.docType);
      return !types.includes('BAIL') || !types.includes('EDL');
    })
    .map((lease: any) => {
      const types = lease.documents.map((d: any) => d.docType);
      const missing = [!types.includes('BAIL') && 'bail', !types.includes('EDL') && 'état des lieux'].filter(Boolean);
      return { leaseId: lease.id, tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`, apartmentName: lease.apartment.name || lease.apartment.address, missing };
    });

  return { rentReviews, partialPayments, openIncidents, unreadMessages, lateLeases, incompleteGed };
}

// Deux mois d'horizon, tous types d'échéances confondus : l'encart ne montrait
// que les fins de bail à 30 jours et paraissait vide alors que l'agenda listait
// bien des événements sur la période.
async function getUpcomingEvents() {
  const events = await getAgendaEvents(2);
  return events.slice(0, 5);
}

const MONTHS_SHORT = ['JAN','FÉV','MAR','AVR','MAI','JUI','JUI','AOÛ','SEP','OCT','NOV','DÉC'];

// Palette de statut unique, partagée par la barre d'occupation et les dates
// « À venir » pour que l'ensemble du dashboard parle le même langage couleur.
const STATUS_COLORS: Record<ApartmentStateCode, string> = {
  ok: '#a3e635',      // vert   — payé / à jour
  late: '#ef4444',    // rouge  — en retard
  pending: '#fbbf24', // jaune  — pas encore payé
  vacant: '#fb923c',  // orange — logement vacant
  soon: '#67e8f9',    // cyan   — bail signé, pas encore commencé
};

const OCCUPANCY_LABELS: Record<ApartmentStateCode, string> = {
  ok: 'Loyer payé',
  late: 'Loyer en retard',
  pending: 'Loyer pas encore payé',
  vacant: 'Logement vacant',
  soon: 'Bail à venir',
};

const EVENT_COLORS: Record<string, string> = {
  LEASE_END: STATUS_COLORS.late,
  RENT_REVIEW: STATUS_COLORS.pending,
  TASK_DUE: STATUS_COLORS.vacant,
  LEASE_START: STATUS_COLORS.ok,
};

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
  const currentMonthIdx = now.getMonth();
  const lastCashflow = cashflow[currentMonthIdx]?.v ?? 0;
  const prevCashflow = currentMonthIdx > 0 ? (cashflow[currentMonthIdx - 1]?.v ?? 0) : 0;
  const delta = prevCashflow > 0
    ? ((lastCashflow - prevCashflow) / prevCashflow) * 100
    : lastCashflow > 0 ? 100 : 0;

  const totalExpensesMonth = alerts.partialPayments.reduce((s: number, p: any) => s + (p.amount - (p.paidAmount ?? 0)), 0);

  // Calculée logement par logement côté serveur : la somme des états
  // correspond donc toujours exactement au nombre de créneaux affichés.
  const occupancy = stats.occupancy;

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

      {alerts.incompleteGed.length > 0 && (
        <div className={`${styles.alertBanner} ${styles.warn}`}>
          <div style={{ width: '100%' }}>
            <div className={styles.alertTitle}>GED incomplète — {alerts.incompleteGed.length} bail(s)</div>
            {alerts.incompleteGed.map((item: any) => (
              <div key={item.leaseId} className={styles.alertItem}>
                <span>
                  <strong>{item.tenantName}</strong>
                  {' · '}
                  <Link href={`/leases/${item.leaseId}`} style={{ color: 'var(--warning)' }}>{item.apartmentName}</Link>
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {item.missing.join(', ').toUpperCase()} manquant
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
            <span className={styles.kpiDelta} style={{ color: delta >= 0 ? STATUS_COLORS.ok : STATUS_COLORS.late }}>
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
          <div className={styles.kpiValue} style={{ color: stats.pendingCount > 0 ? STATUS_COLORS.late : 'var(--text-main)' }}>
            {stats.pendingCount}
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiSub}>
              {fmtEur(stats.pendingAmount)} · {stats.latePayments} en retard
            </span>
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
              // Les mois négatifs restent lisibles : barre au minimum, en rouge.
              const hPct = Math.max(2, (Math.max(0, d.v) / maxCashflow) * 100);
              const isLast = i === currentMonthIdx;
              const negative = d.v < 0;
              return (
                <div
                  key={i}
                  className={styles.chartBar}
                  style={{
                    height: `${hPct}%`,
                    background: negative ? STATUS_COLORS.late : isLast ? STATUS_COLORS.ok : 'rgba(163,230,53,.35)',
                    animationDelay: `${i * 40}ms`,
                  }}
                  title={`${d.m}: ${fmtEur(d.v)}`}
                />
              );
            })}
          </div>
          {/* Une case par barre (même largeur, même gap) : le libellé tombe
              exactement sous sa barre. Un mois sur deux seulement, pour la lisibilité. */}
          <div className={styles.chartXLabels}>
            {cashflow.map((d, i) => (
              <span key={d.m} className={styles.chartXLabel}>{i % 2 === 0 ? d.m : ''}</span>
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
              {upcoming.map((ev, i) => {
                const d = new Date(ev.date);
                const color = EVENT_COLORS[ev.type] ?? STATUS_COLORS.pending;
                return (
                  <Link key={`${ev.type}-${ev.href}-${i}`} href={ev.href} className={styles.eventRow}>
                    <div className={styles.eventDate}>
                      <div className={styles.eventDay} style={{ color }}>{d.getDate()}</div>
                      <div className={styles.eventMonth}>{MONTHS_SHORT[d.getMonth()]}</div>
                    </div>
                    <div className={styles.eventDivider} />
                    <div className={styles.eventContent}>
                      <div className={styles.eventLabel}>{ev.label}</div>
                      {ev.sublabel && <div className={styles.eventSub}>{ev.sublabel}</div>}
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
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucun retard. 🎉</p>
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
                      <div className={styles.lateSub}>
                        {p.lease.apartment.name || p.lease.apartment.address}
                        {' · '}
                        {new Date(p.period).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </div>
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
            {occupancy.total - occupancy.vacant} LOUÉS · {occupancy.vacant} VACANT{occupancy.vacant !== 1 ? 'S' : ''}
          </div>
          {/* Un créneau par logement, coloré selon l'état réel du loyer du mois. */}
          <div className={styles.occupancyBar}>
            {occupancy.slots.map((state, i) => (
              <div
                key={i}
                className={styles.occupancySlot}
                style={{ background: STATUS_COLORS[state] }}
                title={OCCUPANCY_LABELS[state]}
              />
            ))}
          </div>
          <div className={styles.occupancyLegend}>
            {occupancy.ok > 0 && <span style={{ color: STATUS_COLORS.ok }}>PAYÉ {occupancy.ok}</span>}
            {occupancy.late > 0 && <span style={{ color: STATUS_COLORS.late }}>RETARD {occupancy.late}</span>}
            {occupancy.pending > 0 && <span style={{ color: STATUS_COLORS.pending }}>ATTENTE {occupancy.pending}</span>}
            {occupancy.soon > 0 && <span style={{ color: STATUS_COLORS.soon }}>À VENIR {occupancy.soon}</span>}
            {occupancy.vacant > 0 && <span style={{ color: STATUS_COLORS.vacant }}>VACANT {occupancy.vacant}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
