'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { recordCafBatch, getCafHistoryForLease, updateCafMonthlyAmount } from '@/actions/caf'
import styles from '@/app/caf/page.module.css'

export interface CafLeaseRow {
    leaseId: string
    apartmentLabel: string
    tenantLabel: string
    cafMonthlyAmount: number
    expected: number
    alreadyReceivedCaf: number
    status: string
}

type HistoryEntry = {
    period: Date | string
    cafAmount: number
    cafReference: string | null
    paidAt: Date | string | null
    status: string
}

function todayStr() {
    return new Date().toISOString().slice(0, 10)
}

export default function CafBatchForm({ leases, periodStr }: { leases: CafLeaseRow[]; periodStr: string }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [reference, setReference] = useState(`CAF ${periodStr}`)
    const [dateStr, setDateStr] = useState(todayStr())
    const [amounts, setAmounts] = useState<Record<string, string>>(() =>
        Object.fromEntries(
            leases.map(l => [l.leaseId, Math.max(0, l.cafMonthlyAmount - l.alreadyReceivedCaf).toFixed(2)])
        )
    )
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)
    const [openHistory, setOpenHistory] = useState<Record<string, HistoryEntry[] | 'loading' | undefined>>({})
    const [expectedAmounts, setExpectedAmounts] = useState<Record<string, string>>(() =>
        Object.fromEntries(leases.map(l => [l.leaseId, l.cafMonthlyAmount.toFixed(2)]))
    )
    const [savingExpected, setSavingExpected] = useState<Record<string, boolean>>({})

    function saveExpected(leaseId: string) {
        const value = parseFloat(expectedAmounts[leaseId] || '0')
        if (isNaN(value) || value <= 0) {
            setError("Montant CAF/mois invalide.")
            return
        }
        setError(null)
        setSavingExpected(prev => ({ ...prev, [leaseId]: true }))
        startTransition(async () => {
            try {
                await updateCafMonthlyAmount(leaseId, value)
                router.refresh()
            } catch (err: any) {
                setError(err?.message || "Impossible de modifier le montant CAF.")
            } finally {
                setSavingExpected(prev => ({ ...prev, [leaseId]: false }))
            }
        })
    }

    const total = useMemo(
        () => Object.values(amounts).reduce((s, v) => s + (parseFloat(v) || 0), 0),
        [amounts]
    )

    function toggleHistory(leaseId: string) {
        if (openHistory[leaseId] !== undefined) {
            setOpenHistory(prev => { const n = { ...prev }; delete n[leaseId]; return n })
            return
        }
        setOpenHistory(prev => ({ ...prev, [leaseId]: 'loading' }))
        startTransition(async () => {
            const history = await getCafHistoryForLease(leaseId)
            setOpenHistory(prev => ({ ...prev, [leaseId]: history }))
        })
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setDone(false)
        const entries = leases
            .map(l => ({ leaseId: l.leaseId, amount: parseFloat(amounts[l.leaseId] || '0') }))
            .filter(e => !isNaN(e.amount) && e.amount > 0)

        if (entries.length === 0) {
            setError("Aucun montant saisi.")
            return
        }
        if (!reference.trim()) {
            setError("Merci d'indiquer une référence pour ce virement.")
            return
        }

        startTransition(async () => {
            try {
                await recordCafBatch(reference, dateStr, periodStr, entries)
                setDone(true)
                router.refresh()
            } catch (err: any) {
                setError(err?.message || "Impossible d'enregistrer le virement CAF.")
            }
        })
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className={styles.batchHeader}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Référence du virement</label>
                    <input
                        type="text"
                        className={styles.input}
                        value={reference}
                        onChange={e => setReference(e.target.value)}
                        placeholder="ex. Virement CAF 05/09/2026"
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Date de réception</label>
                    <input
                        type="date"
                        className={styles.input}
                        value={dateStr}
                        onChange={e => setDateStr(e.target.value)}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Total réparti</label>
                    <div className={styles.totalDisplay}>{total.toFixed(2)} €</div>
                </div>
            </div>

            <div className="table-container">
                <table className="std-table">
                    <thead>
                        <tr>
                            <th>Logement</th>
                            <th>Locataire</th>
                            <th>Attendu CAF/mois (éditable)</th>
                            <th>Déjà reçu ce mois</th>
                            <th>Montant à saisir</th>
                            <th>Historique</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leases.map(l => (
                            <Fragment key={l.leaseId}>
                                <tr>
                                    <td>{l.apartmentLabel}</td>
                                    <td>{l.tenantLabel}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className={styles.input}
                                                style={{ width: '6.5rem' }}
                                                value={expectedAmounts[l.leaseId] ?? ''}
                                                onChange={e => setExpectedAmounts(prev => ({ ...prev, [l.leaseId]: e.target.value }))}
                                            />
                                            <button
                                                type="button"
                                                className={styles.historyToggle}
                                                disabled={!!savingExpected[l.leaseId] || expectedAmounts[l.leaseId] === l.cafMonthlyAmount.toFixed(2)}
                                                onClick={() => saveExpected(l.leaseId)}
                                            >
                                                {savingExpected[l.leaseId] ? '…' : '✓'}
                                            </button>
                                        </div>
                                    </td>
                                    <td>{l.alreadyReceivedCaf > 0 ? `${l.alreadyReceivedCaf.toFixed(2)} €` : '—'}</td>
                                    <td>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className={styles.input}
                                            style={{ width: '9rem' }}
                                            value={amounts[l.leaseId] ?? ''}
                                            onChange={e => setAmounts(prev => ({ ...prev, [l.leaseId]: e.target.value }))}
                                        />
                                    </td>
                                    <td>
                                        <button type="button" className={styles.historyToggle} onClick={() => toggleHistory(l.leaseId)}>
                                            {openHistory[l.leaseId] !== undefined ? 'Masquer' : 'Voir'}
                                        </button>
                                    </td>
                                </tr>
                                {openHistory[l.leaseId] !== undefined && (
                                    <tr>
                                        <td colSpan={6} className={styles.historyCell}>
                                            {openHistory[l.leaseId] === 'loading' ? (
                                                'Chargement…'
                                            ) : (openHistory[l.leaseId] as HistoryEntry[]).length === 0 ? (
                                                'Aucun versement CAF enregistré pour ce bail.'
                                            ) : (
                                                <table className={styles.historyTable}>
                                                    <thead>
                                                        <tr><th>Période</th><th>Part CAF</th><th>Reçu le</th><th>Référence</th><th>Statut du loyer</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {(openHistory[l.leaseId] as HistoryEntry[]).map((h, i) => (
                                                            <tr key={i}>
                                                                <td>{new Date(h.period).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</td>
                                                                <td>{h.cafAmount.toFixed(2)} €</td>
                                                                <td>{h.paidAt ? new Date(h.paidAt).toLocaleDateString('fr-FR') : '—'}</td>
                                                                <td>{h.cafReference || '—'}</td>
                                                                <td>{h.status === 'PAID' ? 'Payé' : h.status === 'PARTIAL' ? 'Partiel' : h.status}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {error && <p className={styles.errorText}>{error}</p>}
            {done && !error && <p className={styles.successText}>Virement CAF enregistré.</p>}

            <button type="submit" className="std-add-button" disabled={isPending} style={{ marginTop: '1rem' }}>
                {isPending ? 'Enregistrement…' : 'Enregistrer le virement CAF'}
            </button>
        </form>
    )
}
