import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DateFilters from "@/components/DateFilters";
import RevenueChart from "@/components/RevenueChart";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface SearchParams {
    start?: string;
    end?: string;
    companyId?: string;
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

    const companyId = params.companyId;

    // Fetch companies for the filter
    const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } });

    // Revenue calculation
    const payments = await prisma.rentPayment.findMany({
        where: {
            period: { gte: startDate, lte: endDate },
            status: 'PAID',
            ...(companyId ? { lease: { apartment: { companyId } } } : {})
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

    const rechartsData = Array.from(monthlyRevenue.entries()).map(([label, value]) => ({ month: label, revenus: value, depenses: 0 }));

    // Expenses by month
    const expenses = await prisma.expense.findMany({
        where: {
            date: { gte: startDate, lte: endDate },
            ...(companyId ? { apartment: { companyId } } : {})
        }
    });

    expenses.forEach(expense => {
        const key = expense.date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        const item = rechartsData.find(d => d.month === key);
        if (item) item.depenses += expense.amount;
    });

    let totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // KPIs
    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
    const paidCount = payments.length;

    // Vacancy days calculation
    const apartments = await prisma.apartment.findMany({
        where: companyId ? { companyId } : undefined,
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

        // Add mortgage, insurance, and tax expenses
        const fixedCosts = (apt.mortgageAmount || 0) + (apt.insuranceAmount || 0) + (apt.taxAmount || 0);

        if (fixedCosts > 0) {
            for (let i = 0; i < Math.min(monthsDiff, 12); i++) {
                const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
                const endOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0);

                if (new Date(apt.createdAt) <= endOfMonth && monthDate <= endDate) {
                    const key = monthDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
                    const item = rechartsData.find(d => d.month === key);
                    if (item) {
                        item.depenses += fixedCosts;
                        totalExpenses += fixedCosts;
                    }
                }
            }
        }
    });

    const vacancyRate = totalPossibleDays > 0 ? ((totalVacancyDays / totalPossibleDays) * 100).toFixed(1) : 0;

    // Average rent
    const activeLeases = await prisma.lease.findMany({
        where: {
            isActive: true,
            ...(companyId ? { apartment: { companyId } } : {})
        }
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

            <DateFilters companies={companies} />

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <a
                    href={`/api/export?type=payments&year=${startDate.getFullYear()}${companyId ? `&companyId=${companyId}` : ''}`}
                    className="std-add-button"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    download
                >
                    📥 Export Loyers (CSV)
                </a>
                <a
                    href={`/api/export?type=annual&year=${startDate.getFullYear()}${companyId ? `&companyId=${companyId}` : ''}`}
                    className="std-add-button"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    download
                >
                    📊 Récapitulatif Annuel (CSV)
                </a>
                <a
                    href={`/api/export?type=tax&year=${startDate.getFullYear()}${companyId ? `&companyId=${companyId}` : ''}`}
                    className="std-add-button"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', background: 'var(--text-color)', color: 'var(--bg-color)' }}
                    download
                >
                    🏛️ Liasse Fiscale (CSV)
                </a>
            </div>

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

            <h2 className={styles.sectionTitle}>Évolution des Revenus vs Dépenses</h2>
            <div className={styles.chartContainer}>
                <RevenueChart data={rechartsData} />
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className={styles.kpiCard}>
                    <div className={styles.kpiTitle}>📉 Dépenses Totales</div>
                    <div className={styles.kpiValue} style={{ color: 'var(--error)' }}>{totalExpenses.toFixed(2)} €</div>
                </div>
                <div className={styles.kpiCard}>
                    <div className={styles.kpiTitle}>📈 Bénéfice Net</div>
                    <div className={styles.kpiValue} style={{ color: (totalRevenue - totalExpenses) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                        {(totalRevenue - totalExpenses).toFixed(2)} €
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>🔄 Calculateur IRL</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Calculez la révision de loyer selon l&apos;Indice de Référence des Loyers :
                </p>
                <code style={{ fontSize: '0.8rem', color: 'var(--primary-color)' }}>
                    /api/irl?oldRent=800&amp;oldIRL=130.57&amp;newIRL=132.42
                </code>
            </div>
        </div>
    );
}
