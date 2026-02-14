import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DateFilters from "@/components/DateFilters";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface SearchParams {
    start?: string;
    end?: string;
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams;

    // Parse dates from query params or use defaults (last 6 months)
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (params.start && params.end) {
        startDate = new Date(params.start);
        endDate = new Date(params.end);
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        endDate = now;
    }

    // Revenue calculation
    const payments = await prisma.rentPayment.findMany({
        where: {
            period: { gte: startDate, lte: endDate },
            status: 'PAID'
        },
        orderBy: { period: 'asc' }
    });

    const monthlyRevenue = new Map<string, number>();

    // Calculate months between dates
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;

    // Initialize with 0
    for (let i = 0; i < Math.min(monthsDiff, 12); i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        monthlyRevenue.set(key, 0);
    }

    // Aggregate
    payments.forEach(p => {
        const key = p.period.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        const current = monthlyRevenue.get(key) || 0;
        monthlyRevenue.set(key, current + p.amount);
    });

    const chartData = Array.from(monthlyRevenue.entries()).map(([label, value]) => ({ label, value }));
    const maxVal = Math.max(...chartData.map(d => d.value), 100);

    // KPIs
    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
    const paidCount = payments.length;

    // Vacancy days calculation
    const apartments = await prisma.apartment.findMany({
        include: {
            leases: {
                where: {
                    OR: [
                        { startDate: { lte: endDate } },
                        { endDate: { gte: startDate } }
                    ]
                },
                orderBy: { startDate: 'asc' }
            }
        }
    });

    let totalVacancyDays = 0;
    let totalPossibleDays = 0;

    apartments.forEach(apt => {
        const aptStart = startDate > new Date(apt.createdAt) ? startDate : new Date(apt.createdAt);
        const aptEnd = endDate;
        const daysInPeriod = Math.ceil((aptEnd.getTime() - aptStart.getTime()) / (1000 * 60 * 60 * 24));
        totalPossibleDays += daysInPeriod;

        let occupiedDays = 0;
        apt.leases.forEach(lease => {
            const leaseStart = new Date(lease.startDate) > aptStart ? new Date(lease.startDate) : aptStart;
            const leaseEnd = lease.endDate ? (new Date(lease.endDate) < aptEnd ? new Date(lease.endDate) : aptEnd) : aptEnd;

            if (leaseStart <= leaseEnd) {
                const days = Math.ceil((leaseEnd.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24));
                occupiedDays += days;
            }
        });

        totalVacancyDays += (daysInPeriod - occupiedDays);
    });

    const vacancyRate = totalPossibleDays > 0 ? ((totalVacancyDays / totalPossibleDays) * 100).toFixed(1) : 0;

    // Average rent
    const activeLeases = await prisma.lease.findMany({
        where: { isActive: true }
    });
    const averageRent = activeLeases.length > 0
        ? (activeLeases.reduce((sum, l) => sum + l.rentAmount, 0) / activeLeases.length).toFixed(2)
        : 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 className={styles.title}>Statistiques</h1>
                    <Link href="/" style={{ color: 'var(--primary-color)' }}>Retour Dashboard</Link>
                </div>
            </header>

            <DateFilters />

            <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                    <div className={styles.kpiTitle}>Revenus Encaissés</div>
                    <div className={styles.kpiValue}>{totalRevenue.toFixed(2)} €</div>
                </div>
                <div className={styles.kpiCard}>
                    <div className={styles.kpiTitle}>Loyers Payés</div>
                    <div className={styles.kpiValue}>{paidCount}</div>
                </div>
                <div className={styles.kpiCard}>
                    <div className={styles.kpiTitle}>Loyer Moyen</div>
                    <div className={styles.kpiValue}>{averageRent} €</div>
                </div>
                <div className={styles.kpiCard}>
                    <div className={styles.kpiTitle}>🏖️ Taux de Vacance</div>
                    <div className={styles.kpiValue}>{vacancyRate}%</div>
                    <div className={styles.kpiSubtext}>{totalVacancyDays} jours non loués</div>
                </div>
            </div>

            <h2 className={styles.sectionTitle}>Évolution des Revenus</h2>
            <div className={styles.chartContainer}>
                {chartData.map((d, i) => (
                    <div key={i} className={styles.barGroup}>
                        <span className={styles.barValue}>{d.value > 0 ? d.value.toFixed(0) : ''}</span>
                        <div
                            className={styles.bar}
                            style={{ height: `${(d.value / maxVal) * 80}%`, opacity: d.value > 0 ? 1 : 0.2 }}
                        ></div>
                        <span className={styles.barLabel}>{d.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
