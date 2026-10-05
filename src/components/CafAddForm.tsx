'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCafMonthlyAmount } from '@/actions/caf'
import styles from '@/app/caf/page.module.css'

export interface CafCandidate {
    leaseId: string
    label: string
}

export default function CafAddForm({ candidates }: { candidates: CafCandidate[] }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [open, setOpen] = useState(false)
    const [leaseId, setLeaseId] = useState('')
    const [amount, setAmount] = useState('')
    const [error, setError] = useState<string | null>(null)

    function reset() {
        setOpen(false)
        setLeaseId('')
        setAmount('')
        setError(null)
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const value = parseFloat(amount)
        if (!leaseId) {
            setError('Choisissez un bail.')
            return
        }
        if (isNaN(value) || value <= 0) {
            setError('Montant CAF mensuel invalide.')
            return
        }
        setError(null)
        startTransition(async () => {
            try {
                await updateCafMonthlyAmount(leaseId, value)
                reset()
                router.refresh()
            } catch (err: any) {
                setError(err?.message || "Impossible d'ajouter la CAF sur ce bail.")
            }
        })
    }

    return (
        <div>
            <button
                type="button"
                className="std-add-button"
                disabled={candidates.length === 0}
                title={candidates.length === 0 ? 'Tous les baux actifs ont déjà une CAF' : undefined}
                onClick={() => setOpen(o => !o)}
            >
                + Ajouter
            </button>

            {open && (
                <form onSubmit={handleSubmit} className={styles.batchHeader} style={{ marginTop: '1rem' }}>
                    <div className={styles.formGroup} style={{ flex: 2, minWidth: 220 }}>
                        <label className={styles.label}>Bail</label>
                        <select className={styles.input} value={leaseId} onChange={e => setLeaseId(e.target.value)}>
                            <option value="">— Choisir un bail —</option>
                            {candidates.map(c => (
                                <option key={c.leaseId} value={c.leaseId}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.formGroup} style={{ flex: 1, minWidth: 160 }}>
                        <label className={styles.label}>CAF/APL mensuelle (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={styles.input}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="ex. 180"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <button type="submit" className="std-add-button" disabled={isPending}>
                            {isPending ? 'Enregistrement…' : 'Enregistrer sur le bail'}
                        </button>
                        <button type="button" className="pill-btn pill-btn-secondary" onClick={reset}>Annuler</button>
                    </div>
                    {error && <p className={styles.errorText} style={{ width: '100%', marginTop: 0 }}>{error}</p>}
                </form>
            )}
        </div>
    )
}
