import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/landlord';

export default function WelcomeEmail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.getWelcomeEmailPreview(id)
      .then(data => {
        setSubject(data.subject);
        setBody(data.body);
        setRecipients(data.recipients);
      })
      .catch(() => setError('Impossible de charger le template'))
      .finally(() => setLoading(false));
  }, [id]);

  const send = async () => {
    if (!id) return;
    setSending(true); setError('');
    try {
      await api.sendWelcomeEmail(id, subject, body);
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'envoi');
    } finally { setSending(false); }
  };

  if (sent) {
    return (
      <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
        <div className="px-4 py-8 flex flex-col items-center gap-4">
          <div style={{ fontSize: '3rem' }}>✅</div>
          <p className="text-lg font-semibold text-green-400">Email envoyé !</p>
          <p className="text-sm text-text-muted text-center">{recipients.join(', ')}</p>
          <button onClick={() => navigate(`/leases/${id}`)} className="mt-4 w-full bg-primary text-white font-semibold py-3 rounded-xl">
            Voir la fiche du bail →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(`/leases/${id}`)} className="text-text-muted text-lg">←</button>
          <h1 className="text-xl font-bold text-text-main">Email de bienvenue</h1>
        </div>

        {loading ? (
          <p className="text-text-muted text-sm text-center py-8">Chargement...</p>
        ) : (
          <div className="space-y-3">
            {recipients.length > 0 && (
              <p className="text-xs text-text-muted">
                Destinataire{recipients.length > 1 ? 's' : ''} : <span className="text-text-main font-medium">{recipients.join(', ')}</span>
              </p>
            )}

            <div>
              <label className="block text-xs text-text-secondary mb-1">Objet</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs text-text-secondary mb-1">Message</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={14}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => navigate(`/leases/${id}`)}
                className="flex-1 bg-surface border border-border text-text-secondary font-semibold py-3 rounded-xl text-sm"
              >
                Ignorer
              </button>
              <button
                onClick={send}
                disabled={sending}
                className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl disabled:opacity-50 text-sm"
              >
                {sending ? 'Envoi…' : '📧 Envoyer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
