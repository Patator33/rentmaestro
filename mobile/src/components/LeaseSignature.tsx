import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/landlord';

const LEASE_TYPES: { value: string; label: string }[] = [
  { value: 'NU', label: 'Location nue' },
  { value: 'MEUBLE', label: 'Location meublée' },
  { value: 'COLOCATION', label: 'Colocation' },
];

const AREA_LABEL: Record<string, string> = {
  tenant: 'Locataire', apartment: 'Appartement', building: 'Immeuble', company: 'Société', lease: 'Bail', settings: 'Paramètres',
};
const KIND_LABEL: Record<string, string> = { BAIL: 'Bail', CAUTION: 'Acte de cautionnement' };
const REQUEST_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: '#f59e0b' },
  SIGNED: { label: 'Signé', color: '#22c55e' },
  CANCELED: { label: 'Annulé', color: '#6b7280' },
  EXPIRED: { label: 'Expiré', color: '#6b7280' },
};

export const SIGNATURE_BADGE: Record<string, { label: string; color: string }> = {
  PENDING: { label: '✍️ En attente de signature', color: '#f59e0b' },
  SIGNED: { label: '✅ Signé', color: '#22c55e' },
};

function signerIcon(status: string) {
  return status === 'completed' ? '✅' : status === 'declined' ? '❌' : '⏳';
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

/**
 * Signature du bail depuis le téléphone : type de bail, contrôle des données,
 * envoi en signature (DocuSeal), suivi et annulation. Les données manquantes
 * se renseignent depuis l'application web.
 */
export default function LeaseSignature({ leaseId, onChanged }: { leaseId: string; onChanged?: () => void }) {
  const [info, setInfo] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<{ message: string; details?: string[] } | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      setInfo(await api.getLeaseSignature(leaseId));
    } catch (e: any) {
      setError({ message: e.message || 'Chargement impossible' });
    }
  }, [leaseId]);

  useEffect(() => { load(); }, [load]);

  const run = async (action: () => Promise<any>, doneMessage?: string) => {
    setBusy(true); setError(null); setNotice('');
    try {
      const res = await action();
      if (doneMessage) setNotice(doneMessage);
      if (res?.warnings?.length) setNotice(`${doneMessage ?? ''} ${res.warnings.join(' ')}`.trim());
      await load();
      onChanged?.();
    } catch (e: any) {
      setError({ message: e.message || 'Erreur', details: e.details });
    } finally {
      setBusy(false);
    }
  };

  const copy = async (link: string) => {
    try { await navigator.clipboard.writeText(link); setNotice('Lien copié.'); }
    catch { window.prompt('Lien de signature :', link); }
  };

  if (!info) {
    return (
      <div className="bg-surface rounded-xl border border-border p-3 mb-3">
        <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Signature</p>
        <p className="text-text-muted text-xs">{error ? error.message : 'Chargement…'}</p>
      </div>
    );
  }

  const control = info.control;
  const requests: any[] = info.requests ?? [];
  const hasPending = requests.some(r => r.status === 'PENDING');
  const canSend = !hasPending && control.missing.length === 0 && !!info.effectiveLeaseType;
  const defaultLabel = LEASE_TYPES.find(t => t.value === info.defaultLeaseType)?.label;

  const people = [...control.signers.bail, ...control.signers.caution]
    .filter((s: any, i: number, a: any[]) => a.findIndex(x => x.email === s.email) === i)
    .map((s: any) => `${s.name} (${s.role})`).join(', ');

  const send = (regenerate: boolean) => {
    const docs = control.needsGuaranteeAct ? "le bail et l'acte de cautionnement" : 'le bail';
    const msg =
      `${regenerate ? 'La demande en cours sera annulée et remplacée.\n\n' : ''}` +
      `Envoyer ${docs} en signature ?\n\nSignataires : ${people}\n\n` +
      (notify ? 'Des emails leur seront envoyés.' : 'Aucun email ne sera envoyé : vous transmettez les liens vous-même.');
    if (!confirm(msg)) return;
    run(() => api.sendLeaseSignature(leaseId, { regenerate, notify }), 'Envoyé en signature.');
  };

  const cancel = () => {
    if (!confirm('Annuler la demande de signature en cours ? Les liens envoyés cesseront de fonctionner.')) return;
    run(() => api.cancelLeaseSignature(leaseId), 'Demande annulée.');
  };

  const badge = SIGNATURE_BADGE[info.signatureStatus];

  return (
    <div className="bg-surface rounded-xl border border-border p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-text-muted text-xs uppercase tracking-wide">Signature</p>
        {badge && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: badge.color, background: `${badge.color}20` }}>
            {badge.label}
          </span>
        )}
      </div>

      <label className="text-text-muted text-xs block mb-1">Type de bail</label>
      <select
        value={info.leaseType ?? ''}
        disabled={busy || hasPending}
        onChange={e => run(() => api.setLeaseType(leaseId, e.target.value || null))}
        className="w-full mb-3 px-3 py-2 rounded-xl border border-border bg-surface text-text-main text-sm disabled:opacity-60"
      >
        <option value="">{defaultLabel ? `Celui de l'appartement (${defaultLabel})` : "Non défini"}</option>
        {LEASE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      {control.missing.length === 0 ? (
        <p className="text-xs mb-2" style={{ color: '#22c55e' }}>✅ Toutes les données nécessaires sont renseignées.</p>
      ) : (
        <div className="rounded-lg p-2 mb-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#ef4444' }}>
            {control.missing.length} donnée{control.missing.length > 1 ? 's' : ''} manquante{control.missing.length > 1 ? 's' : ''}
          </p>
          <ul className="text-xs text-text-secondary space-y-0.5">
            {control.missing.map((m: any, i: number) => <li key={i}>• {m.label} <span className="text-text-muted">({AREA_LABEL[m.area] ?? m.area})</span></li>)}
          </ul>
          <p className="text-text-muted text-xs mt-1">À renseigner depuis l'application web.</p>
        </div>
      )}

      {control.warnings.length > 0 && (
        <ul className="text-xs text-text-muted mb-2 space-y-0.5">
          {control.warnings.map((w: string, i: number) => <li key={i}>⚠️ {w}</li>)}
        </ul>
      )}

      {requests.length > 0 && (
        <div className="space-y-2 mb-2">
          {requests.map(r => {
            const st = REQUEST_STATUS[r.status] ?? { label: r.status, color: '#6b7280' };
            return (
              <div key={r.id} className="rounded-lg border border-border p-2" style={r.status === 'CANCELED' ? { opacity: 0.55 } : undefined}>
                <div className="flex items-center justify-between">
                  <span className="text-text-main text-xs font-medium">{KIND_LABEL[r.kind] ?? r.kind}</span>
                  <span className="text-xs font-semibold" style={{ color: st.color }}>{st.label}</span>
                </div>
                <p className="text-text-muted text-xs">
                  Envoyé le {fmt(r.sentAt)}
                  {r.reminderCount > 0 && r.status === 'PENDING' ? ` · ${r.reminderCount} rappel${r.reminderCount > 1 ? 's' : ''}` : ''}
                  {r.status === 'PENDING' && !r.notify ? ' · liens transmis à la main' : ''}
                </p>
                {r.signers && (
                  <ul className="mt-1 space-y-1">
                    {r.signers.map((s: any) => (
                      <li key={`${s.role}-${s.email}`} className="flex items-center justify-between gap-2 text-xs text-text-secondary">
                        <span className="min-w-0 truncate">{signerIcon(s.status)} {s.role} : {s.name || s.email}</span>
                        {s.status !== 'completed' && s.link && (
                          <button onClick={() => copy(s.link)} className="shrink-0 text-primary font-medium">Copier le lien</button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(canSend || hasPending) && (
        <label className="flex items-center gap-2 text-xs text-text-secondary mb-2">
          <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />
          Envoyer les emails d'invitation
        </label>
      )}

      {error && (
        <div className="rounded-lg p-2 mb-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>{error.message}</p>
          {error.details && error.details.length > 0 && (
            <ul className="text-xs text-text-secondary mt-1 space-y-0.5">{error.details.map((d, i) => <li key={i}>• {d}</li>)}</ul>
          )}
        </div>
      )}
      {notice && <p className="text-xs mb-2" style={{ color: '#22c55e' }}>{notice}</p>}

      <div className="flex gap-2">
        {canSend && (
          <button onClick={() => send(false)} disabled={busy} className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50" style={{ background: 'var(--color-primary, #2b8cee)' }}>
            {busy ? 'Envoi…' : '📨 Envoyer pour signature'}
          </button>
        )}
        {hasPending && (
          <>
            <button onClick={() => send(true)} disabled={busy} className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm disabled:opacity-50">♻️ Régénérer</button>
            <button onClick={cancel} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm text-red-400 border border-red-400/30 disabled:opacity-50">🚫 Annuler</button>
          </>
        )}
      </div>
    </div>
  );
}
