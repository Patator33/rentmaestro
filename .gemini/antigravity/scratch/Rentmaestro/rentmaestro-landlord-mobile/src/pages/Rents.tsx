import { useEffect, useState } from 'react';
import { api } from '../api/landlord';
import PullToRefresh from '../components/PullToRefresh';

interface RentItem {
  leaseId: string;
  paymentId: string | null;
  period: string;
  amount: number;
  paidAmount: number | null;
  status: string | null;
  paidAt: string | null;
  tenant: { id: string; firstName: string; lastName: string };
  apartment: { address: string; name: string | null };
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

  const load = (m: string) => {
    setLoading(true);
    api.getRents(m).then(setRents).finally(() => setLoading(false));
  };

  useEffect(() => { load(month); }, [month]);

  const navigate = (dir: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + dir, 1));
    setMonth(d.toISOString().slice(0, 7));
  };

  const handlePay = async (item: RentItem) => {
    setActionLoading(item.leaseId);
    try {
      await api.markPaid(item.leaseId, new Date(item.period).toISOString().split('T')[0], item.amount);
      load(month);
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

  const monthLabel = new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const unpaidRents = rents.filter(r => r.status !== 'PAID');
  const paidRents = rents.filter(r => r.status === 'PAID');

  return (
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
                    <RentCard key={item.leaseId} item={item} actionLoading={actionLoading} onPay={handlePay} onUnpay={handleUnpay} />
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
                    <RentCard key={item.leaseId} item={item} actionLoading={actionLoading} onPay={handlePay} onUnpay={handleUnpay} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </PullToRefresh>
  );
}

function RentCard({ item, actionLoading, onPay, onUnpay }: {
  item: RentItem;
  actionLoading: string | null;
  onPay: (item: RentItem) => void;
  onUnpay: (item: RentItem) => void;
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
          <StatusBadge status={item.status} />
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
        <button
          onClick={() => onPay(item)}
          disabled={actionLoading === item.leaseId}
          className="w-full text-xs py-1.5 rounded-lg bg-paid/20 text-paid border border-paid/30 font-semibold disabled:opacity-50"
        >
          {actionLoading === item.leaseId ? '...' : '✓ Marquer payé'}
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === 'PAID') return <span className="text-xs text-paid">✓ Payé</span>;
  if (status === 'PARTIAL') return <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>💰 Partiel</span>;
  if (status === 'LATE') return <span className="text-xs text-late">⚠ Retard</span>;
  if (status === 'PENDING') return <span className="text-xs text-pending">En attente</span>;
  return <span className="text-xs text-text-muted">Non généré</span>;
}
