import { useEffect, useState } from 'react';
import { api } from '../api/landlord';
import PullToRefresh from '../components/PullToRefresh';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

interface RentItem {
  leaseId: string;
  paymentId: string | null;
  period: string;
  amount: number;
  paidAmount: number | null;
  status: string | null;
  paidAt: string | null;
  isLate?: boolean;
  tenant: { id: string; firstName: string; lastName: string };
  apartment: { address: string; name: string | null; mortgageAmount?: number | null; insuranceAmount?: number | null; taxAmount?: number | null };
}

function getMonthStr(offset: number): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
}

export default function Rents() {
  const [month, setMonth] = useState(getMonthStr(0));
  const [rents, setRents] = useState<RentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<RentItem | null>(null);
  const [payInput, setPayInput] = useState('');
  const [payMsg, setPayMsg] = useState('');

  const load = (m: string) => {
    setLoading(true);
    api.getRents(m).then(setRents).finally(() => setLoading(false));
  };

  useEffect(() => { load(month); }, [month]);
  useAutoRefresh(() => load(month));

  const navigate = (dir: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + dir, 1));
    setMonth(d.toISOString().slice(0, 7));
  };

  const openPayModal = (item: RentItem) => {
    // Pre-fill with remaining balance for PARTIAL, full amount otherwise
    const defaultAmount = item.status === 'PARTIAL' && item.paidAmount != null
      ? (item.amount - item.paidAmount).toFixed(2)
      : item.amount.toFixed(2);
    setPayInput(defaultAmount);
    setPayMsg('');
    setPayModal(item);
  };

  const handlePayConfirm = async () => {
    if (!payModal) return;
    const amount = parseFloat(payInput);
    if (isNaN(amount) || amount <= 0) return;
    setActionLoading(payModal.leaseId);
    try {
      const period = new Date(payModal.period).toISOString().split('T')[0];
      await api.markPaid(payModal.leaseId, period, amount);
      setPayModal(null);
      load(month);
    } catch (e: any) {
      setPayMsg(`Erreur : ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnpay = async (item: RentItem) => {
    if (!item.paymentId) return;
    setActionLoading(item.leaseId);
    try {
      await api.markUnpaid(item.paymentId);
      load(month);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemind = async (item: RentItem) => {
    const tenantName = `${item.tenant.firstName} ${item.tenant.lastName}`;
    if (!confirm(`Envoyer une relance de loyer à ${tenantName} ?`)) return;
    setActionLoading(item.leaseId);
    try {
      const period = new Date(item.period).toISOString().split('T')[0];
      await api.sendReminder(item.leaseId, period);
      alert('Relance envoyée.');
    } catch (e: any) {
      alert(e.message || 'Erreur envoi relance');
    } finally {
      setActionLoading(null);
    }
  };

  const monthLabel = new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const unpaidRents = rents.filter(r => r.status !== 'PAID');
  const paidRents = rents.filter(r => r.status === 'PAID');

  const totalExpected = rents.reduce((s, r) => s + r.amount, 0);
  const totalReceived = rents.reduce((s, r) => {
    if (r.status === 'PAID') return s + r.amount;
    if (r.status === 'PARTIAL' && r.paidAmount != null) return s + r.paidAmount;
    return s;
  }, 0);
  const collectRate = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

  const seenApts = new Set<string>();
  let totalMonthlyCosts = 0;
  for (const r of rents) {
    if (!seenApts.has(r.apartment.address + (r.apartment.name ?? ''))) {
      seenApts.add(r.apartment.address + (r.apartment.name ?? ''));
      totalMonthlyCosts += (r.apartment.mortgageAmount ?? 0) + (r.apartment.insuranceAmount ?? 0) + (r.apartment.taxAmount ?? 0);
    }
  }
  const netCashflow = totalReceived - totalMonthlyCosts;

  const isPartialInput = payModal && parseFloat(payInput) > 0 &&
    ((payModal.paidAmount ?? 0) + parseFloat(payInput)) < payModal.amount - 0.01;

  return (
    <>
    <PullToRefresh onRefresh={() => load(month)}>
      <div className="pb-nav safe-top" style={{ minHeight: '100%' }}>
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="text-text-muted px-3 py-1.5 border border-border rounded-lg text-sm">←</button>
          <div className="text-center">
            <h1 className="text-base font-bold text-text-main capitalize">{monthLabel}</h1>
            <p className="text-text-muted text-xs">{paidRents.length}/{rents.length} payés</p>
          </div>
          <button onClick={() => navigate(1)} className="text-text-muted px-3 py-1.5 border border-border rounded-lg text-sm">→</button>
        </div>

        {!loading && rents.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-surface rounded-xl border border-border p-2.5 text-center">
              <p className="text-text-muted text-xs mb-0.5">Perçu</p>
              <p className="font-bold text-sm" style={{ color: '#22c55e' }}>{totalReceived.toFixed(0)} €</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-2.5 text-center">
              <p className="text-text-muted text-xs mb-0.5">Attendu</p>
              <p className="font-bold text-sm text-text-main">{totalExpected.toFixed(0)} €</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-2.5 text-center">
              <p className="text-text-muted text-xs mb-0.5">Collecte</p>
              <p className="font-bold text-sm" style={{ color: collectRate >= 100 ? '#22c55e' : '#f59e0b' }}>{collectRate} %</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-2.5 text-center">
              <p className="text-text-muted text-xs mb-0.5">Cashflow net</p>
              <p className="font-bold text-sm" style={{ color: netCashflow >= 0 ? '#22c55e' : '#ef4444' }}>{netCashflow.toFixed(0)} €</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-text-muted text-sm text-center py-8">Chargement...</p>
        ) : rents.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">Aucun bail actif ce mois.</p>
        ) : (
          <div className="space-y-3">
            {/* Unpaid section */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: '#ef4444' }}>
                ⚠ Non payés — {unpaidRents.length}
              </p>
              {unpaidRents.length === 0 ? (
                <p className="text-text-muted text-xs text-center py-2 italic">✓ Tous les loyers sont réglés</p>
              ) : (
                <div className="space-y-2">
                  {unpaidRents.map(item => (
                    <RentCard key={item.leaseId} item={item} actionLoading={actionLoading} onPay={openPayModal} onUnpay={handleUnpay} onRemind={handleRemind} />
                  ))}
                </div>
              )}
            </div>
            {/* Paid section */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: '#22c55e' }}>
                ✓ Payés — {paidRents.length}
              </p>
              {paidRents.length === 0 ? (
                <p className="text-text-muted text-xs text-center py-2 italic">Aucun loyer payé ce mois</p>
              ) : (
                <div className="space-y-2">
                  {paidRents.map(item => (
                    <RentCard key={item.leaseId} item={item} actionLoading={actionLoading} onPay={openPayModal} onUnpay={handleUnpay} onRemind={handleRemind} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </PullToRefresh>

    {/* Pay modal */}
    {payModal && (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}
        onClick={e => e.target === e.currentTarget && setPayModal(null)}
      >
        <div style={{ background: '#1e293b', borderRadius: '20px 20px 0 0', padding: '1.5rem', paddingBottom: 'calc(1.5rem + 72px)', width: '100%' }}>
          <h3 className="text-text-main font-bold text-base mb-0.5">Enregistrer un paiement</h3>
          <p className="text-text-muted text-sm mb-1">
            {payModal.tenant.firstName} {payModal.tenant.lastName}
          </p>
          {payModal.status === 'PARTIAL' && payModal.paidAmount != null ? (
            <p className="text-sm font-semibold mb-4" style={{ color: '#f59e0b' }}>
              Reçu : {payModal.paidAmount.toFixed(2)} € / {payModal.amount.toFixed(2)} € attendu
            </p>
          ) : (
            <p className="text-text-muted text-sm mb-4">Attendu : {payModal.amount.toFixed(2)} €</p>
          )}
          <label className="text-text-muted text-xs block mb-1">
            {payModal.status === 'PARTIAL' ? 'Nouveau versement (€)' : 'Montant reçu (€)'}
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={payInput}
            onChange={e => { setPayInput(e.target.value); setPayMsg(''); }}
            className="w-full mb-2 px-3 py-2 rounded-xl border border-border bg-surface text-text-main text-sm"
            placeholder="0.00"
            autoFocus
          />
          {isPartialInput && (
            <p className="text-xs mb-3 font-semibold" style={{ color: '#f59e0b' }}>
              💰 Paiement partiel — solde restant : {(payModal.amount - (payModal.paidAmount ?? 0) - parseFloat(payInput)).toFixed(2)} €
            </p>
          )}
          {payMsg && (
            <p className="text-late text-sm text-center mb-3">{payMsg}</p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setPayModal(null)} className="flex-1 py-3 rounded-xl border border-border text-text-secondary text-sm">
              Annuler
            </button>
            <button
              onClick={handlePayConfirm}
              disabled={actionLoading === payModal.leaseId || !payInput}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: isPartialInput ? '#f59e0b' : '#22c55e' }}
            >
              {actionLoading === payModal.leaseId ? '...' : isPartialInput ? '💰 Partiel' : '✓ Payé'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function RentCard({ item, actionLoading, onPay, onUnpay, onRemind }: {
  item: RentItem; actionLoading: string | null;
  onPay: (item: RentItem) => void; onUnpay: (item: RentItem) => void;
  onRemind: (item: RentItem) => void;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-text-main font-medium text-sm">{item.tenant.firstName} {item.tenant.lastName}</p>
          <p className="text-text-muted text-xs">{item.apartment.name || item.apartment.address}</p>
        </div>
        <div className="text-right">
          {item.status === 'PARTIAL' && item.paidAmount != null ? (
            <>
              <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>Solde {(item.amount - item.paidAmount).toFixed(2)} €</p>
              <p className="text-xs text-text-muted">/ {item.amount.toFixed(2)} € total</p>
            </>
          ) : (
            <p className="text-text-main font-semibold text-sm">{item.amount.toFixed(2)} €</p>
          )}
          <StatusBadge status={item.status} isLate={item.isLate} />
        </div>
      </div>
      {item.status === 'PAID' ? (
        <button
          onClick={() => onUnpay(item)}
          disabled={actionLoading === item.leaseId}
          className="w-full text-xs py-1.5 rounded-lg border border-border text-text-secondary disabled:opacity-50"
        >
          {actionLoading === item.leaseId ? '...' : 'Annuler paiement'}
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => onPay(item)}
            disabled={actionLoading === item.leaseId}
            className="flex-1 text-xs py-1.5 rounded-lg bg-paid/20 text-paid border border-paid/30 font-semibold disabled:opacity-50"
          >
            {actionLoading === item.leaseId ? '...' : '✓ Marquer payé'}
          </button>
          <button
            onClick={() => onRemind(item)}
            disabled={actionLoading === item.leaseId}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-border text-text-secondary disabled:opacity-50"
          >
            📧
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, isLate }: { status: string | null; isLate?: boolean }) {
  if (status === 'PAID') return <span className="text-xs text-paid">✓ Payé</span>;
  if (status === 'PARTIAL') return <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>💰 Partiel</span>;
  if (status === 'LATE' || isLate) return <span className="text-xs text-late">⚠ En retard</span>;
  return <span className="text-xs text-pending">À régler</span>;
}
