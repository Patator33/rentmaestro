import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/landlord';
import { getServerUrl } from '../lib/storage';
import PullToRefresh from '../components/PullToRefresh';

const DEPOSIT_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:          { label: 'En attente', color: '#f59e0b' },
  PARTIAL_RECEIVED: { label: 'Partiel', color: '#f59e0b' },
  RECEIVED:         { label: 'Perçue', color: '#22c55e' },
  TO_RETURN:        { label: 'À rendre', color: '#3b82f6' },
  RETURNED:         { label: 'Rendue', color: '#8b5cf6' },
  DEDUCTED:         { label: 'Retenue', color: '#ef4444' },
};

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  PAID:    { label: 'Payé', color: '#22c55e' },
  PENDING: { label: 'En attente', color: '#f59e0b' },
  LATE:    { label: 'En retard', color: '#ef4444' },
};

export default function LeaseDetail() {
  const { id } = useParams<{ id: string }>();
  const [lease, setLease] = useState<any>(null);
  const [depositModal, setDepositModal] = useState(false);
  const [depositInput, setDepositInput] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMsg, setDepositMsg] = useState('');
  const [terminateModal, setTerminateModal] = useState(false);
  const [terminateDate, setTerminateDate] = useState(new Date().toISOString().split('T')[0]);
  const [terminateLoading, setTerminateLoading] = useState(false);
  const [sendDocsModal, setSendDocsModal] = useState(false);
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());
  const [sendingDocs, setSendingDocs] = useState(false);
  const [sendDocsResult, setSendDocsResult] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState('');
  const navigate = useNavigate();

  const load = useCallback(() => api.getLease(id!).then(setLease), [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { getServerUrl().then(setBaseUrl); }, []);

  const handleDepositPay = async () => {
    const amount = parseFloat(depositInput);
    if (isNaN(amount) || amount <= 0) return;
    setDepositLoading(true); setDepositMsg('');
    try {
      await api.payDeposit(id!, amount);
      setDepositMsg('✓ Enregistré');
      setTimeout(() => { setDepositModal(false); setDepositMsg(''); load(); }, 1200);
    } catch (e: any) {
      setDepositMsg(`Erreur : ${e.message}`);
    } finally {
      setDepositLoading(false);
    }
  };

  const handleSendDocs = async () => {
    const allDocs = buildAllDocs(lease);
    const selected = allDocs.filter(d => checkedDocs.has(d.url));
    if (selected.length === 0) return;
    setSendingDocs(true); setSendDocsResult('');
    try {
      const res = await api.sendDocuments(id!, selected);
      if (res.success) {
        setSendDocsResult('✓ Email envoyé');
        setTimeout(() => { setSendDocsModal(false); setCheckedDocs(new Set()); setSendDocsResult(''); }, 1400);
      } else {
        setSendDocsResult(`Erreur : ${res.error}`);
      }
    } catch (e: any) {
      setSendDocsResult(`Erreur : ${e.message}`);
    } finally { setSendingDocs(false); }
  };

  const handleTerminate = async () => {
    setTerminateLoading(true);
    try {
      await api.terminateLease(id!, terminateDate);
      setTerminateModal(false);
      load();
    } catch (e: any) {
      alert(e.message || 'Erreur résiliation');
    } finally {
      setTerminateLoading(false);
    }
  };

  if (!lease) return <div className="safe-top px-4 py-4 text-text-muted text-sm">Chargement...</div>;

  const cc = lease.rentAmount + lease.chargesAmount;
  const depositStatus = lease.depositStatus || (lease.depositAmount ? 'PENDING' : null);
  const depositInfo = depositStatus ? (DEPOSIT_LABELS[depositStatus] ?? { label: depositStatus, color: '#6b7280' }) : null;
  const depositRemaining = lease.depositAmount != null && lease.depositPaidAmount != null
    ? lease.depositAmount - lease.depositPaidAmount
    : null;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(lease.startDate);
  const end = lease.endDate ? new Date(lease.endDate) : null;
  const isUpcoming = start > today;
  const isActive = !isUpcoming && (!end || end >= today);
  const statusLabel = isUpcoming ? 'À venir' : isActive ? 'En cours' : 'Terminé';
  const statusColor = isUpcoming ? '#f59e0b' : isActive ? '#22c55e' : '#6b7280';

  const recentPayments = lease.payments?.slice(0, 8) ?? [];

  return (
    <>
    <PullToRefresh onRefresh={load}>
      <div className="pb-nav safe-top" style={{ minHeight: '100%' }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => navigate(-1 as any)} className="text-text-muted text-lg shrink-0">←</button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-text-main leading-tight truncate">
                  {lease.tenant?.firstName} {lease.tenant?.lastName}
                </h1>
                <p className="text-text-muted text-xs truncate">{lease.apartment?.name || lease.apartment?.address}</p>
              </div>
            </div>
            <button onClick={() => navigate(`/leases/${id}/edit`)} className="text-primary text-sm font-medium shrink-0 ml-2">Modifier</button>
          </div>

          {/* Bail */}
          <div className="bg-surface rounded-xl border border-border p-3 mb-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-muted text-xs uppercase tracking-wide">Bail</p>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ color: statusColor, background: `${statusColor}20` }}>
                {statusLabel}
              </span>
            </div>
            <div className="space-y-2">
              <Row label="Début" value={new Date(lease.startDate).toLocaleDateString('fr-FR')} />
              {lease.endDate && <Row label="Fin" value={new Date(lease.endDate).toLocaleDateString('fr-FR')} />}
              <div className="border-t border-border pt-2">
                <Row label="Loyer HC" value={`${lease.rentAmount.toFixed(2)} €`} />
                <Row label="Charges" value={`${lease.chargesAmount.toFixed(2)} €`} />
              </div>
              <div className="border-t border-border pt-2">
                <Row label="Loyer CC" value={`${cc.toFixed(2)} €`} bold />
              </div>
            </div>
          </div>

          {/* Caution */}
          {(lease.depositAmount != null || depositInfo) && (
            <div className="bg-surface rounded-xl border border-border p-3 mb-3">
              <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Caution</p>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-text-main text-sm font-semibold">
                    {lease.depositAmount != null ? `${Number(lease.depositAmount).toFixed(2)} €` : '—'}
                  </span>
                  {depositStatus === 'PARTIAL_RECEIVED' && lease.depositPaidAmount != null && (
                    <p className="text-xs mt-0.5" style={{ color: '#f59e0b' }}>
                      Reçu {Number(lease.depositPaidAmount).toFixed(2)} € — Solde {depositRemaining?.toFixed(2)} €
                    </p>
                  )}
                </div>
                {depositInfo && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: depositInfo.color, background: `${depositInfo.color}20` }}>
                    {depositInfo.label}
                  </span>
                )}
              </div>
              {lease.depositReturnedAt && (
                <p className="text-text-muted text-xs mb-2">
                  Restituée le {new Date(lease.depositReturnedAt).toLocaleDateString('fr-FR')}
                </p>
              )}
              {(depositStatus === 'PENDING' || depositStatus === 'PARTIAL_RECEIVED') && (
                <button
                  onClick={() => { setDepositInput(depositRemaining?.toFixed(2) ?? (lease.depositAmount?.toFixed(2) ?? '')); setDepositModal(true); setDepositMsg(''); }}
                  className="w-full mt-1 text-xs py-1.5 rounded-lg font-semibold"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                >
                  💰 Enregistrer paiement caution
                </button>
              )}
            </div>
          )}

          {/* Locataire */}
          <button
            onClick={() => navigate(`/tenants/${lease.tenant?.id}`)}
            className="w-full bg-surface rounded-xl border border-border p-3 mb-3 text-left active:opacity-80 flex items-center justify-between"
          >
            <div className="min-w-0">
              <p className="text-text-muted text-xs uppercase tracking-wide mb-0.5">Locataire</p>
              <p className="text-text-main text-sm font-medium">{lease.tenant?.firstName} {lease.tenant?.lastName}</p>
              {lease.tenant?.email && <p className="text-text-muted text-xs truncate">{lease.tenant.email}</p>}
              {lease.tenant?.phone && <p className="text-text-muted text-xs">{lease.tenant.phone}</p>}
            </div>
            <span className="text-text-muted text-lg ml-2 shrink-0">›</span>
          </button>

          {/* Appartement */}
          <button
            onClick={() => navigate(`/apartments/${lease.apartment?.id}`)}
            className="w-full bg-surface rounded-xl border border-border p-3 mb-3 text-left active:opacity-80 flex items-center justify-between"
          >
            <div className="min-w-0">
              <p className="text-text-muted text-xs uppercase tracking-wide mb-0.5">Appartement</p>
              <p className="text-text-main text-sm font-medium">{lease.apartment?.name || lease.apartment?.address}</p>
              <p className="text-text-muted text-xs">{lease.apartment?.zipCode} {lease.apartment?.city}</p>
            </div>
            <span className="text-text-muted text-lg ml-2 shrink-0">›</span>
          </button>

          {/* Paiements récents */}
          {recentPayments.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-3 mb-3">
              <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Paiements récents</p>
              {recentPayments.map((p: any) => {
                const period = new Date(p.period).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                const info = PAYMENT_LABELS[p.status] ?? { label: p.status, color: '#6b7280' };
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-text-secondary text-xs capitalize">{period}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-text-main text-xs font-medium">{p.amount.toFixed(2)} €</span>
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ color: info.color, background: `${info.color}20` }}>
                        {info.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* GED — Documents du bail */}
          {(() => {
            const docs: any[] = lease.documents ?? [];
            const types = docs.map((d: any) => d.docType);
            const hasBail = types.includes('BAIL');
            const hasEdl = types.includes('EDL');
            const gedOk = hasBail && hasEdl;
            const DOC_LABEL: Record<string, string> = { BAIL: '📝 Bail', EDL: '🔑 État des lieux', AUTRE: '📄 Autre' };
            return (
              <div
                className="bg-surface rounded-xl border border-border p-3 mb-3"
                style={!gedOk ? { border: '2px solid #f59e0b' } : undefined}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-text-muted text-xs uppercase tracking-wide">Documents GED</p>
                  <div className="flex items-center gap-2">
                    {!gedOk && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.15)' }}>
                        {!hasBail && !hasEdl ? 'Bail + EDL manquants' : !hasBail ? 'Bail manquant' : 'EDL manquant'}
                      </span>
                    )}
                    <button
                      onClick={() => { setCheckedDocs(new Set()); setSendDocsResult(''); setSendDocsModal(true); }}
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: '#2B8CEE', background: 'rgba(43,140,238,0.15)' }}
                    >
                      📧 Envoyer
                    </button>
                  </div>
                </div>
                {docs.length === 0 ? (
                  <p className="text-text-muted text-xs italic">Aucun document</p>
                ) : (
                  docs.map((doc: any) => (
                    <button
                      key={doc.id}
                      onClick={() => window.open(`${baseUrl}${encodeURI(doc.url)}`, '_blank')}
                      className="w-full flex items-center justify-between py-2 border-b border-border last:border-0 active:opacity-70 text-left"
                    >
                      <span className="text-primary text-sm font-medium truncate flex-1 mr-2">
                        {DOC_LABEL[doc.docType] ?? '📄'} {doc.name}
                      </span>
                      <span className="text-text-muted text-xs shrink-0">{(doc.size / 1024).toFixed(0)} Ko</span>
                    </button>
                  ))
                )}
              </div>
            );
          })()}

          {/* Résilier le bail */}
          {isActive && (
            <button
              onClick={() => setTerminateModal(true)}
              className="w-full text-sm text-red-400 border border-red-400/30 py-2.5 rounded-xl"
            >
              Résilier le bail
            </button>
          )}
        </div>
      </div>
    </PullToRefresh>

    {/* Deposit payment modal */}
    {depositModal && (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}
        onClick={e => e.target === e.currentTarget && setDepositModal(false)}
      >
        <div style={{ background: '#1e293b', borderRadius: '20px 20px 0 0', padding: '1.5rem', paddingBottom: 'calc(1.5rem + 72px)', width: '100%' }}>
          <h3 className="text-text-main font-bold text-base mb-1">Paiement caution</h3>
          <p className="text-text-muted text-sm mb-4">
            Total : {lease.depositAmount?.toFixed(2)} €
            {depositRemaining != null && depositStatus === 'PARTIAL_RECEIVED' && ` · Solde : ${depositRemaining.toFixed(2)} €`}
          </p>
          <label className="text-text-muted text-xs block mb-1">Montant reçu (€)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={depositInput}
            onChange={e => setDepositInput(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-xl border border-border bg-surface text-text-main text-sm"
            placeholder="0.00"
            autoFocus
          />
          {depositMsg && (
            <p className={`text-sm text-center mb-4 ${depositMsg.startsWith('✓') ? 'text-paid' : 'text-late'}`}>{depositMsg}</p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setDepositModal(false)} className="flex-1 py-3 rounded-xl border border-border text-text-secondary text-sm">
              Annuler
            </button>
            <button
              onClick={handleDepositPay}
              disabled={depositLoading || !depositInput}
              className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
              style={{ background: '#f59e0b', color: '#fff' }}
            >
              {depositLoading ? 'Enregistrement...' : '✓ Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Send documents modal */}
    {sendDocsModal && (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}
        onClick={e => e.target === e.currentTarget && setSendDocsModal(false)}
      >
        <div style={{ background: '#1e293b', borderRadius: '20px 20px 0 0', padding: '1.5rem', paddingBottom: 'calc(1.5rem + 72px)', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-text-main font-bold text-base">📧 Envoyer des documents</h3>
            <button onClick={() => setSendDocsModal(false)} className="text-text-muted text-lg">✕</button>
          </div>
          <p className="text-text-muted text-xs mb-4">
            À : {lease.tenant?.email}{lease.tenant?.coTenantEmail ? `, ${lease.tenant.coTenantEmail}` : ''}
          </p>
          {buildAllDocs(lease).length === 0 ? (
            <p className="text-text-muted text-sm italic mb-4">Aucun document disponible.</p>
          ) : (
            buildDocGroups(lease).map(group => group.docs.length === 0 ? null : (
              <div key={group.label} className="mb-3">
                <p className="text-text-muted text-xs uppercase tracking-wide mb-1">{group.label}</p>
                {group.docs.map((doc: any) => (
                  <label key={doc.url} className="flex items-center gap-3 py-2 border-b border-border last:border-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkedDocs.has(doc.url)}
                      onChange={() => setCheckedDocs(prev => { const n = new Set(prev); n.has(doc.url) ? n.delete(doc.url) : n.add(doc.url); return n; })}
                      className="w-4 h-4"
                    />
                    <span className="text-text-main text-sm flex-1 truncate">{doc.name}</span>
                    <span className="text-text-muted text-xs shrink-0">{doc.docType}</span>
                  </label>
                ))}
              </div>
            ))
          )}
          {sendDocsResult && (
            <p className={`text-sm text-center mb-3 ${sendDocsResult.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{sendDocsResult}</p>
          )}
          <div className="flex gap-3 mt-2">
            <button onClick={() => setSendDocsModal(false)} className="flex-1 py-3 rounded-xl border border-border text-text-secondary text-sm">
              Annuler
            </button>
            <button
              onClick={handleSendDocs}
              disabled={checkedDocs.size === 0 || sendingDocs}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: '#2B8CEE' }}
            >
              {sendingDocs ? 'Envoi…' : `Envoyer${checkedDocs.size > 0 ? ` (${checkedDocs.size})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Terminate modal */}
    {terminateModal && (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}
        onClick={e => e.target === e.currentTarget && setTerminateModal(false)}
      >
        <div style={{ background: '#1e293b', borderRadius: '20px 20px 0 0', padding: '1.5rem', paddingBottom: 'calc(1.5rem + 72px)', width: '100%' }}>
          <h3 className="text-text-main font-bold text-base mb-1">Résilier le bail</h3>
          <p className="text-text-muted text-sm mb-4">
            {lease.tenant?.firstName} {lease.tenant?.lastName} — {lease.apartment?.name || lease.apartment?.address}
          </p>
          <label className="text-text-muted text-xs block mb-1">Date de résiliation</label>
          <input
            type="date"
            value={terminateDate}
            onChange={e => setTerminateDate(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-xl border border-border bg-surface text-text-main text-sm"
          />
          <div className="flex gap-3">
            <button onClick={() => setTerminateModal(false)} className="flex-1 py-3 rounded-xl border border-border text-text-secondary text-sm">
              Annuler
            </button>
            <button
              onClick={handleTerminate}
              disabled={terminateLoading}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: '#ef4444' }}
            >
              {terminateLoading ? 'Résiliation...' : 'Confirmer résiliation'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function buildAllDocs(lease: any) {
  return [
    ...(lease.documents ?? []),
    ...(lease.apartment?.company?.documents ?? []),
    ...(lease.apartment?.documents ?? []),
    ...(lease.globalDocuments ?? []),
  ];
}

function buildDocGroups(lease: any) {
  return [
    { label: 'Bail', docs: lease.documents ?? [] },
    { label: 'Société', docs: lease.apartment?.company?.documents ?? [] },
    { label: 'Appartement', docs: lease.apartment?.documents ?? [] },
    { label: 'GED Globale', docs: lease.globalDocuments ?? [] },
  ];
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-text-muted text-xs">{label}</span>
      <span className={`text-xs ${bold ? 'font-bold text-text-main' : 'font-medium text-text-secondary'}`}>{value}</span>
    </div>
  );
}
