import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/landlord';
import PullToRefresh from '../components/PullToRefresh';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

interface CafLease {
  leaseId: string;
  apartmentLabel: string;
  tenantLabel: string;
  cafMonthlyAmount: number;
  expected: number;
  alreadyReceivedCaf: number;
  status: string;
}

interface Candidate {
  leaseId: string;
  label: string;
}

interface HistoryEntry {
  period: string;
  cafAmount: number;
  cafReference: string | null;
  paidAt: string | null;
  status: string;
}

function getMonthStr(offset: number): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const eur = (n: number) => `${n.toFixed(2)} €`;

export default function Caf() {
  const [month, setMonth] = useState(getMonthStr(0));
  const [leases, setLeases] = useState<CafLease[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const [reference, setReference] = useState('');
  const [dateStr, setDateStr] = useState(todayStr());
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [expectedAmounts, setExpectedAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savingExpected, setSavingExpected] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryEntry[] | 'loading'>>({});

  const [addOpen, setAddOpen] = useState(false);
  const [addLeaseId, setAddLeaseId] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addMsg, setAddMsg] = useState('');
  const [adding, setAdding] = useState(false);

  const load = (m: string) => {
    setLoading(true);
    api.getCaf(m)
      .then((data: { leases: CafLease[]; candidates: Candidate[] }) => {
        setLeases(data.leases);
        setCandidates(data.candidates);
        setAmounts(Object.fromEntries(
          data.leases.map(l => [l.leaseId, Math.max(0, l.cafMonthlyAmount - l.alreadyReceivedCaf).toFixed(2)])
        ));
        setExpectedAmounts(Object.fromEntries(data.leases.map(l => [l.leaseId, l.cafMonthlyAmount.toFixed(2)])));
        setReference(`CAF ${m}`);
        setHistory({});
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(month); }, [month]);
  useAutoRefresh(() => load(month));

  const navigateMonth = (dir: number) => {
    const [y, m] = month.split('-').map(Number);
    setMonth(new Date(Date.UTC(y, m - 1 + dir, 1)).toISOString().slice(0, 7));
    setMessage(null);
  };

  const monthLabel = new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const totalExpected = leases.reduce((s, l) => s + l.cafMonthlyAmount, 0);
  const totalReceived = leases.reduce((s, l) => s + l.alreadyReceivedCaf, 0);
  const totalToRecord = useMemo(
    () => Object.values(amounts).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [amounts]
  );

  const handleSaveBatch = async () => {
    const entries = leases
      .map(l => ({ leaseId: l.leaseId, amount: parseFloat(amounts[l.leaseId] || '0') }))
      .filter(e => !isNaN(e.amount) && e.amount > 0);
    if (entries.length === 0) { setMessage({ ok: false, text: 'Aucun montant saisi.' }); return; }
    if (!reference.trim()) { setMessage({ ok: false, text: 'Indiquez une référence pour ce virement.' }); return; }

    setSaving(true);
    setMessage(null);
    try {
      await api.recordCafBatch(reference, dateStr, month, entries);
      setMessage({ ok: true, text: 'Virement CAF enregistré.' });
      load(month);
    } catch (e: any) {
      setMessage({ ok: false, text: e.message || "Impossible d'enregistrer le virement." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExpected = async (leaseId: string) => {
    const value = parseFloat(expectedAmounts[leaseId] || '0');
    if (isNaN(value) || value <= 0) { setMessage({ ok: false, text: 'Montant CAF/mois invalide.' }); return; }
    setSavingExpected(leaseId);
    setMessage(null);
    try {
      await api.setCafAmount(leaseId, value);
      load(month);
    } catch (e: any) {
      setMessage({ ok: false, text: e.message || 'Impossible de modifier le montant.' });
    } finally {
      setSavingExpected(null);
    }
  };

  const toggleHistory = async (leaseId: string) => {
    if (history[leaseId] !== undefined) {
      setHistory(prev => { const n = { ...prev }; delete n[leaseId]; return n; });
      return;
    }
    setHistory(prev => ({ ...prev, [leaseId]: 'loading' }));
    const data = await api.getCafHistory(leaseId);
    setHistory(prev => ({ ...prev, [leaseId]: data }));
  };

  const handleAdd = async () => {
    const value = parseFloat(addAmount);
    if (!addLeaseId) { setAddMsg('Choisissez un bail.'); return; }
    if (isNaN(value) || value <= 0) { setAddMsg('Montant CAF mensuel invalide.'); return; }
    setAdding(true);
    setAddMsg('');
    try {
      await api.setCafAmount(addLeaseId, value);
      setAddOpen(false);
      setAddLeaseId('');
      setAddAmount('');
      load(month);
    } catch (e: any) {
      setAddMsg(e.message || "Impossible d'ajouter la CAF.");
    } finally {
      setAdding(false);
    }
  };

  const inputClass = 'px-3 py-2 rounded-xl border border-border bg-surface text-text-main text-sm w-full';

  return (
    <>
      <PullToRefresh onRefresh={() => load(month)}>
        <div className="pb-nav safe-top" style={{ minHeight: '100%' }}>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => navigateMonth(-1)} className="text-text-muted px-3 py-1.5 border border-border rounded-lg text-sm">←</button>
              <div className="text-center">
                <h1 className="text-base font-bold text-text-main capitalize">{monthLabel}</h1>
                <p className="text-text-muted text-xs">Versements CAF</p>
              </div>
              <button onClick={() => navigateMonth(1)} className="text-text-muted px-3 py-1.5 border border-border rounded-lg text-sm">→</button>
            </div>

            <button
              onClick={() => { setAddOpen(true); setAddMsg(''); }}
              disabled={candidates.length === 0}
              className="w-full mb-4 py-2.5 rounded-xl text-sm font-semibold border border-paid/30 bg-paid/20 text-paid disabled:opacity-40"
            >
              {candidates.length === 0 && !loading ? 'Tous les baux ont déjà une CAF' : '+ Ajouter une CAF sur un bail'}
            </button>

            {loading ? (
              <p className="text-text-muted text-sm text-center py-8">Chargement...</p>
            ) : leases.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-8 italic">
                Aucun bail bénéficiaire CAF ce mois. Utilisez « Ajouter » pour renseigner le montant sur un bail.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-surface rounded-xl border border-border p-2.5 text-center">
                    <p className="text-text-muted text-xs mb-0.5">Attendu</p>
                    <p className="font-bold text-sm text-text-main">{totalExpected.toFixed(0)} €</p>
                  </div>
                  <div className="bg-surface rounded-xl border border-border p-2.5 text-center">
                    <p className="text-text-muted text-xs mb-0.5">Reçu</p>
                    <p className="font-bold text-sm" style={{ color: '#22c55e' }}>{totalReceived.toFixed(0)} €</p>
                  </div>
                  <div className="bg-surface rounded-xl border border-border p-2.5 text-center">
                    <p className="text-text-muted text-xs mb-0.5">Bénéficiaires</p>
                    <p className="font-bold text-sm text-text-main">{leases.length}</p>
                  </div>
                </div>

                <p className="text-text-muted text-xs mb-3">
                  La CAF verse en général un seul virement groupé : répartissez-le sur les baux concernés.
                </p>

                <div className="bg-surface rounded-xl border border-border p-3 mb-3 space-y-3">
                  <div>
                    <label className="text-text-muted text-xs block mb-1">Référence du virement</label>
                    <input className={inputClass} value={reference} onChange={e => setReference(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-text-muted text-xs block mb-1">Date de réception</label>
                    <input type="date" className={inputClass} value={dateStr} onChange={e => setDateStr(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  {leases.map(l => (
                    <div key={l.leaseId} className="bg-surface rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-text-main font-medium text-sm">{l.tenantLabel}</p>
                          <p className="text-text-muted text-xs">{l.apartmentLabel}</p>
                        </div>
                        <p className="text-xs text-text-muted text-right">
                          Déjà reçu<br />
                          <span className="text-text-main font-semibold">{l.alreadyReceivedCaf > 0 ? eur(l.alreadyReceivedCaf) : '—'}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-text-muted text-xs block mb-1">CAF attendue / mois</label>
                          <div className="flex gap-1">
                            <input
                              type="number" step="0.01" inputMode="decimal" className={inputClass}
                              value={expectedAmounts[l.leaseId] ?? ''}
                              onChange={e => setExpectedAmounts(prev => ({ ...prev, [l.leaseId]: e.target.value }))}
                            />
                            <button
                              onClick={() => handleSaveExpected(l.leaseId)}
                              disabled={savingExpected === l.leaseId || expectedAmounts[l.leaseId] === l.cafMonthlyAmount.toFixed(2)}
                              className="px-2.5 rounded-xl border border-border text-text-secondary text-sm disabled:opacity-30"
                            >
                              {savingExpected === l.leaseId ? '…' : '✓'}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-text-muted text-xs block mb-1">Montant à saisir</label>
                          <input
                            type="number" step="0.01" inputMode="decimal" className={inputClass}
                            value={amounts[l.leaseId] ?? ''}
                            onChange={e => setAmounts(prev => ({ ...prev, [l.leaseId]: e.target.value }))}
                          />
                        </div>
                      </div>

                      <button onClick={() => toggleHistory(l.leaseId)} className="text-xs text-text-secondary underline">
                        {history[l.leaseId] !== undefined ? "Masquer l'historique" : "Voir l'historique"}
                      </button>
                      {history[l.leaseId] === 'loading' && <p className="text-text-muted text-xs mt-2">Chargement…</p>}
                      {Array.isArray(history[l.leaseId]) && (
                        (history[l.leaseId] as HistoryEntry[]).length === 0 ? (
                          <p className="text-text-muted text-xs mt-2 italic">Aucun versement CAF enregistré.</p>
                        ) : (
                          <div className="mt-2 space-y-1">
                            {(history[l.leaseId] as HistoryEntry[]).map((h, i) => (
                              <div key={i} className="flex justify-between text-xs border-t border-border pt-1">
                                <span className="text-text-secondary capitalize">
                                  {new Date(h.period).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                                  {h.cafReference ? ` · ${h.cafReference}` : ''}
                                </span>
                                <span className="text-text-main font-semibold">{eur(h.cafAmount)}</span>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 mb-2 px-1">
                  <span className="text-text-muted text-sm">Total réparti</span>
                  <span className="font-bold text-text-main">{eur(totalToRecord)}</span>
                </div>
                {message && (
                  <p className="text-sm text-center mb-2" style={{ color: message.ok ? '#22c55e' : '#ef4444' }}>{message.text}</p>
                )}
                <button
                  onClick={handleSaveBatch}
                  disabled={saving}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                  style={{ background: '#22c55e' }}
                >
                  {saving ? '...' : 'Enregistrer le virement CAF'}
                </button>
              </>
            )}
          </div>
        </div>
      </PullToRefresh>

      {addOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}
          onClick={e => e.target === e.currentTarget && setAddOpen(false)}
        >
          <div style={{ background: '#1e293b', borderRadius: '20px 20px 0 0', padding: '1.5rem', paddingBottom: 'calc(1.5rem + 72px)', width: '100%' }}>
            <h3 className="text-text-main font-bold text-base mb-3">Ajouter une CAF sur un bail</h3>
            <label className="text-text-muted text-xs block mb-1">Bail</label>
            <select className={`${inputClass} mb-3`} value={addLeaseId} onChange={e => { setAddLeaseId(e.target.value); setAddMsg(''); }}>
              <option value="">— Choisir un bail —</option>
              {candidates.map(c => <option key={c.leaseId} value={c.leaseId}>{c.label}</option>)}
            </select>
            <label className="text-text-muted text-xs block mb-1">CAF/APL mensuelle (€)</label>
            <input
              type="number" step="0.01" inputMode="decimal" className={`${inputClass} mb-2`}
              value={addAmount} onChange={e => { setAddAmount(e.target.value); setAddMsg(''); }} placeholder="ex. 180"
            />
            {addMsg && <p className="text-late text-sm text-center mb-3">{addMsg}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={() => setAddOpen(false)} className="flex-1 py-3 rounded-xl border border-border text-text-secondary text-sm">Annuler</button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                style={{ background: '#22c55e' }}
              >
                {adding ? '...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
