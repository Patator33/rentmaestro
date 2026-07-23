import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/landlord';

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalSending, setPortalSending] = useState(false);
  const [portalCopied, setPortalCopied] = useState(false);
  const [portalSent, setPortalSent] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.getTenant(id!).then(setTenant);
    api.getTenantNotes(id!).then(setNotes).catch(() => {});
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Supprimer ce locataire ?')) return;
    setDeleting(true);
    try {
      await api.deleteTenant(id!);
      navigate('/tenants');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
      setDeleting(false);
    }
  };

  const handleCall = (phone: string) => {
    if (confirm(`Appeler ${phone} ?`)) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleGeneratePortal = async () => {
    if (tenant.portalToken && !confirm('Régénérer révoquera l\'ancien lien. Continuer ?')) return;
    setPortalLoading(true);
    try {
      const res = await api.generatePortalToken(id!);
      setTenant((t: any) => ({ ...t, portalToken: res.portalToken }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCopyPortalToken = async () => {
    if (!tenant.portalToken) return;
    try {
      await navigator.clipboard.writeText(tenant.portalToken);
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 2500);
    } catch {
      alert(tenant.portalToken);
    }
  };

  const handleSendPortalInvite = async () => {
    setPortalSending(true);
    try {
      await api.sendPortalInvite(id!);
      setPortalSent(true);
      setTimeout(() => setPortalSent(false), 3000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur envoi');
    } finally {
      setPortalSending(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Archiver ce locataire ? Le lien portail sera révoqué.')) return;
    setArchiveLoading(true);
    try {
      await api.archiveTenant(id!);
      setTenant((t: any) => ({ ...t, isArchived: true, portalToken: null }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleReactivate = async () => {
    setArchiveLoading(true);
    try {
      await api.reactivateTenant(id!);
      setTenant((t: any) => ({ ...t, isArchived: false }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleAddNote = async () => {
    const content = noteInput.trim();
    if (!content) return;
    setNoteLoading(true);
    try {
      const note = await api.addTenantNote(id!, content);
      setNotes(n => [note, ...n]);
      setNoteInput('');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setNoteLoading(false);
    }
  };

  if (!tenant) return <div className="safe-top px-4 py-4 text-text-muted text-sm">Chargement...</div>;

  const hasActiveLeases = tenant.leases?.some((l: any) => l.isActive);
  const isFormerTenant = (tenant.leases?.length ?? 0) > 0 && !hasActiveLeases;

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/tenants')} className="text-text-muted text-lg">←</button>
            <h1 className="text-xl font-bold text-text-main">
              {tenant.firstName} {tenant.lastName}
              {tenant.isArchived && <span className="ml-2 text-xs font-normal text-text-muted">(archivé)</span>}
            </h1>
          </div>
          <button onClick={() => navigate(`/tenants/${id}/edit`)} className="text-primary text-sm">Modifier</button>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 mb-3 space-y-2">
          {tenant.email && (
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-xs">Email</span>
              <button onClick={() => handleEmail(tenant.email)} className="text-primary text-xs underline">
                {tenant.email}
              </button>
            </div>
          )}
          {tenant.phone ? (
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-xs">Téléphone</span>
              <button onClick={() => handleCall(tenant.phone)} className="text-primary text-xs underline">
                {tenant.phone}
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-xs">Téléphone</span>
              <span className="text-text-main text-xs">—</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-text-muted text-xs">Jour de paiement</span>
            <span className="text-text-main text-xs">{tenant.paymentDay || 5}</span>
          </div>
          {tenant.coTenantFirstName && (
            <div className="pt-2 mt-2 border-t border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-text-muted text-xs">Co-locataire</span>
                <span className="text-text-main text-xs font-medium">{tenant.coTenantFirstName} {tenant.coTenantLastName}</span>
              </div>
              {tenant.coTenantEmail && (
                <div className="flex justify-between items-center">
                  <span className="text-text-muted text-xs">Email</span>
                  <button onClick={() => handleEmail(tenant.coTenantEmail)} className="text-primary text-xs underline">
                    {tenant.coTenantEmail}
                  </button>
                </div>
              )}
              {tenant.coTenantPhone && (
                <div className="flex justify-between items-center">
                  <span className="text-text-muted text-xs">Téléphone</span>
                  <button onClick={() => handleCall(tenant.coTenantPhone)} className="text-primary text-xs underline">
                    {tenant.coTenantPhone}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {tenant.leases?.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-3 mb-3">
            <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Baux</p>
            {tenant.leases.map((l: any) => (
              <button
                key={l.id}
                onClick={() => navigate(`/leases/${l.id}`)}
                className="w-full text-left py-2 border-b border-border last:border-0 active:opacity-70"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-text-main text-sm font-medium">{l.apartment?.name || l.apartment?.address}</p>
                    <p className="text-text-muted text-xs">{new Date(l.startDate).toLocaleDateString('fr-FR')} — {l.endDate ? new Date(l.endDate).toLocaleDateString('fr-FR') : 'en cours'}</p>
                    <p className="text-text-secondary text-xs">{(l.rentAmount + l.chargesAmount).toFixed(2)} € CC</p>
                  </div>
                  <span className="text-text-muted text-lg ml-2">›</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate(`/messages/${id}`)}
          className="w-full text-sm text-primary border border-primary/30 py-2.5 rounded-xl mb-3"
        >
          Envoyer un message
        </button>

        {/* Portail locataire */}
        <div className="bg-surface rounded-xl border border-border p-3 mb-3">
          <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Portail locataire</p>
          {tenant.isArchived ? (
            <p className="text-text-muted text-xs">🔒 Accès révoqué (locataire archivé).</p>
          ) : tenant.portalToken ? (
            <div className="space-y-2">
              <div className="bg-bg rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-text-secondary text-xs font-mono truncate flex-1">{tenant.portalToken}</span>
                <button
                  onClick={handleCopyPortalToken}
                  className="text-xs text-primary shrink-0"
                >
                  {portalCopied ? '✓ Copié' : 'Copier'}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSendPortalInvite}
                  disabled={portalSending || !tenant.email}
                  className="flex-1 text-xs py-2 bg-primary/20 text-primary border border-primary/30 rounded-lg disabled:opacity-50"
                >
                  {portalSending ? 'Envoi...' : portalSent ? '✓ Envoyé !' : '✉️ Envoyer par email'}
                </button>
                <button
                  onClick={handleGeneratePortal}
                  disabled={portalLoading}
                  className="text-xs px-3 py-2 border border-border text-text-secondary rounded-lg disabled:opacity-50"
                >
                  {portalLoading ? '...' : '🔄 Régénérer'}
                </button>
              </div>
              {!tenant.email && (
                <p className="text-xs text-late">Aucun email — impossible d'envoyer l'invitation.</p>
              )}
            </div>
          ) : (
            <button
              onClick={handleGeneratePortal}
              disabled={portalLoading}
              className="w-full text-xs py-2.5 bg-primary/20 text-primary border border-primary/30 rounded-lg disabled:opacity-50"
            >
              {portalLoading ? 'Génération...' : '🔑 Générer le lien portail'}
            </button>
          )}
        </div>

        {/* Notes journal */}
        <div className="bg-surface rounded-xl border border-border p-3 mb-3">
          <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Journal</p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddNote()}
              placeholder="Ajouter une note..."
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-bg text-text-main text-xs"
            />
            <button
              onClick={handleAddNote}
              disabled={noteLoading || !noteInput.trim()}
              className="text-xs px-3 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl disabled:opacity-50"
            >
              {noteLoading ? '...' : '+'}
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="text-text-muted text-xs italic text-center py-2">Aucune note</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notes.map((n: any) => (
                <div key={n.id} className="border-b border-border pb-2 last:border-0">
                  <p className="text-text-secondary text-xs leading-relaxed">{n.content}</p>
                  <p className="text-text-muted text-xs mt-0.5">{new Date(n.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Archive / Réactiver */}
        {tenant.isArchived ? (
          <button
            onClick={handleReactivate}
            disabled={archiveLoading}
            className="w-full text-sm text-blue-400 border border-blue-400/30 py-2.5 rounded-xl mb-3 disabled:opacity-50"
          >
            {archiveLoading ? 'Réactivation...' : '♻️ Réactiver le locataire'}
          </button>
        ) : isFormerTenant ? (
          <button
            onClick={handleArchive}
            disabled={archiveLoading}
            className="w-full text-sm text-yellow-500 border border-yellow-500/30 py-2.5 rounded-xl mb-3 disabled:opacity-50"
          >
            {archiveLoading ? 'Archivage...' : '📦 Archiver le locataire'}
          </button>
        ) : null}

        <button onClick={handleDelete} disabled={deleting} className="w-full text-sm text-red-400 border border-red-400/30 py-2.5 rounded-xl disabled:opacity-50">
          {deleting ? 'Suppression...' : 'Supprimer le locataire'}
        </button>
      </div>
    </div>
  );
}
