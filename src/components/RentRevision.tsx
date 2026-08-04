'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { applyRentRevision } from '@/actions/leases';
import { computeRevision, quarterLabel, type IrlIndex } from '@/lib/irl';

interface Props {
    leaseId: string;
    rentAmount: number;
    chargesAmount: number;
    startDate: string;
    lastRentReviewDate: string | null;
    irlBaseQuarter: string | null;
    irlBaseIndex: number | null;
    indices: IrlIndex[];
    letterSubjectTpl: string;
    letterBodyTpl: string;
    letterVars: Record<string, string>;
}

const inputStyle: React.CSSProperties = {
    background: 'var(--bg)', border: '1px solid var(--border-color)', borderRadius: '8px',
    padding: '0.45rem 0.6rem', color: 'var(--text-main)', fontSize: '0.9rem',
};

function applyVars(tpl: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v ?? ''), tpl);
}

export default function RentRevision({
    leaseId, rentAmount, chargesAmount, startDate, lastRentReviewDate,
    irlBaseQuarter, irlBaseIndex, indices, letterSubjectTpl, letterBodyTpl, letterVars,
}: Props) {
    const router = useRouter();
    const sorted = useMemo(() => [...indices].sort((a, b) => a.quarter.localeCompare(b.quarter)), [indices]);

    const [baseQuarter, setBaseQuarter] = useState(irlBaseQuarter ?? sorted[0]?.quarter ?? '');
    const [newQuarter, setNewQuarter] = useState(sorted[sorted.length - 1]?.quarter ?? '');
    const [effectiveDate, setEffectiveDate] = useState(() => {
        // Par défaut, le mois de la prochaine échéance de révision (référence + 1 an),
        // pas le mois en cours — sinon le courrier annonce la mauvaise date d'effet.
        const ref = lastRentReviewDate ? new Date(lastRentReviewDate) : new Date(startDate);
        const next = new Date(ref);
        next.setFullYear(next.getFullYear() + 1);
        return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    });
    const [applying, setApplying] = useState(false);
    const [done, setDone] = useState(false);
    const [showLetter, setShowLetter] = useState(false);

    const baseIdx = irlBaseQuarter === baseQuarter && irlBaseIndex != null
        ? irlBaseIndex
        : sorted.find(i => i.quarter === baseQuarter)?.value ?? 0;
    const newIdx = sorted.find(i => i.quarter === newQuarter)?.value ?? 0;

    const result = (baseIdx > 0 && newIdx > 0)
        ? computeRevision(rentAmount, baseQuarter, baseIdx, newQuarter, newIdx)
        : null;

    const fullVars: Record<string, string> = result ? {
        ...letterVars,
        ancien_loyer: result.oldRent.toFixed(2),
        nouveau_loyer: result.newRent.toFixed(2),
        loyer_cc: (result.newRent + chargesAmount).toFixed(2),
        augmentation: result.increase.toFixed(2),
        irl_ancien: String(baseIdx),
        irl_nouveau: String(newIdx),
        trimestre_ancien: quarterLabel(baseQuarter),
        trimestre_nouveau: quarterLabel(newQuarter),
        date_effet: effectiveDate ? new Date(effectiveDate + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '',
    } : letterVars;

    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [emailResult, setEmailResult] = useState<{ success: boolean; error?: string; revisionApplied?: boolean } | null>(null);
    const [sending, setSending] = useState(false);

    const openLetter = () => {
        setSubject(applyVars(letterSubjectTpl, fullVars));
        setBody(applyVars(letterBodyTpl, fullVars));
        setEmailResult(null);
        setShowLetter(true);
    };

    const handleApply = async () => {
        if (!result) return;
        setApplying(true);
        const res = await applyRentRevision(leaseId, {
            newRent: result.newRent,
            baseQuarter, baseIndex: baseIdx,
            newQuarter, newIndex: newIdx,
            effectiveDate,
        });
        setApplying(false);
        if (res.success) { setDone(true); router.refresh(); }
        else alert(res.error);
    };

    const sendEmail = async () => {
        setSending(true);
        setEmailResult(null);
        try {
            const res = await fetch(`/api/leases/${leaseId}/irl-letter/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject,
                    body,
                    // Informer le locataire acte la révision : le loyer est mis à jour à l'envoi.
                    revision: result ? {
                        newRent: result.newRent,
                        baseQuarter, baseIndex: baseIdx,
                        newQuarter, newIndex: newIdx,
                        effectiveDate,
                    } : null,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setEmailResult({ success: false, error: data.error });
            } else {
                setEmailResult({ success: true, revisionApplied: data.revisionApplied });
                if (data.revisionApplied) { setDone(true); router.refresh(); }
            }
        } catch {
            setEmailResult({ success: false, error: 'Erreur réseau' });
        } finally {
            setSending(false);
        }
    };

    const pdfUrl = result
        ? `/api/leases/${leaseId}/irl-letter/pdf?baseQuarter=${baseQuarter}&baseIndex=${baseIdx}&newQuarter=${newQuarter}&newIndex=${newIdx}&newRent=${result.newRent}&effective=${effectiveDate}`
        : '#';

    return (
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>📈 Révision annuelle du loyer (IRL)</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Dernière révision : {lastRentReviewDate ? new Date(lastRentReviewDate).toLocaleDateString('fr-FR') : 'jamais'}.
                {' '}Loyer HC actuel : <strong>{rentAmount.toFixed(2)} €</strong>.
            </p>

            {sorted.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#f97316' }}>
                    Aucun indice IRL configuré. Renseignez-les dans Paramètres → Indices IRL.
                </p>
            ) : (
                <>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>IRL de référence</label>
                            <select value={baseQuarter} onChange={e => setBaseQuarter(e.target.value)} style={inputStyle}>
                                {sorted.map(i => <option key={i.quarter} value={i.quarter}>{quarterLabel(i.quarter)} — {i.value}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Nouvel IRL</label>
                            <select value={newQuarter} onChange={e => setNewQuarter(e.target.value)} style={inputStyle}>
                                {sorted.map(i => <option key={i.quarter} value={i.quarter}>{quarterLabel(i.quarter)} — {i.value}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Prise d'effet</label>
                            <input type="month" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} style={inputStyle} />
                        </div>
                    </div>

                    {result && (
                        <div style={{ background: 'var(--bg)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            <div>Calcul : {result.oldRent.toFixed(2)} € × {newIdx} / {baseIdx}</div>
                            <div style={{ marginTop: '0.4rem', fontSize: '1.05rem' }}>
                                Nouveau loyer HC : <strong style={{ color: 'var(--primary-color)' }}>{result.newRent.toFixed(2)} €</strong>
                                {' '}<span style={{ color: result.increase >= 0 ? '#22c55e' : '#ef4444' }}>
                                    ({result.increase >= 0 ? '+' : ''}{result.increase.toFixed(2)} €, {result.increasePercent.toFixed(2)} %)
                                </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                Loyer CC : {(result.newRent + chargesAmount).toFixed(2)} €
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button onClick={handleApply} disabled={!result || applying || done}
                            style={{ background: done ? 'rgba(34,197,94,0.15)' : 'var(--primary-color)', color: done ? '#22c55e' : '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', fontWeight: 600, cursor: applying || done ? 'default' : 'pointer' }}>
                            {done ? '✓ Révision appliquée' : applying ? '⏳…' : 'Appliquer la révision'}
                        </button>
                        <button onClick={openLetter} disabled={!result} className="std-add-button" style={{ fontSize: '0.9rem' }}>
                            ✉️ Courrier au locataire
                        </button>
                        <a href={pdfUrl} target="_blank" rel="noopener" className="std-add-button" style={{ fontSize: '0.9rem', pointerEvents: result ? 'auto' : 'none', opacity: result ? 1 : 0.5 }}>
                            📄 PDF
                        </a>
                    </div>

                    {showLetter && (
                        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            {emailResult?.success ? (
                                <p style={{ color: '#22c55e', fontWeight: 600 }}>
                                    ✅ Courrier envoyé au locataire.
                                    {emailResult.revisionApplied && ' Nouveau loyer appliqué.'}
                                </p>
                            ) : (
                                <>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Objet</label>
                                    <input value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '0.75rem' }} />
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Message</label>
                                    <textarea value={body} onChange={e => setBody(e.target.value)} rows={12}
                                        style={{ ...inputStyle, width: '100%', fontFamily: 'inherit', resize: 'vertical' }} />
                                    {emailResult?.error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>⚠ {emailResult.error}</p>}
                                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.6rem' }}>
                                        <button onClick={sendEmail} disabled={sending} className="std-add-button" style={{ fontSize: '0.9rem' }}>
                                            {sending ? '⏳ Envoi…' : '✉️ Envoyer'}
                                        </button>
                                        <button onClick={() => setShowLetter(false)} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.45rem 0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                            Fermer
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
