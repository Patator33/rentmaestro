import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuth, getServerUrl, saveServerUrl, isBiometricAvailable, isBiometricEnabled, clearBiometricCredentials, saveBiometricCredentials, getEmail } from '../lib/storage';

export default function Settings() {
  const navigate = useNavigate();
  const [serverUrl, setServerUrl] = useState('');
  const [editingUrl, setEditingUrl] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [showBiometricForm, setShowBiometricForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    Promise.all([
      getServerUrl(),
      isBiometricAvailable(),
      isBiometricEnabled(),
      getEmail(),
    ]).then(([url, available, enabled, em]) => {
      setServerUrl(url);
      setBiometricAvailable(available);
      setBiometricEnabled(enabled);
      setEmail(em || '');
    });
  }, []);

  const handleSaveUrl = async () => {
    const trimmed = serverUrl.trim().replace(/\/$/, '');
    await saveServerUrl(trimmed);
    setEditingUrl(false);
    setMsg('URL serveur sauvegardée.');
    setTimeout(() => setMsg(''), 2500);
  };

  const handleDisableBiometric = async () => {
    await clearBiometricCredentials();
    setBiometricEnabled(false);
    setMsg('Authentification biométrique désactivée.');
    setTimeout(() => setMsg(''), 2500);
  };

  const handleEnableBiometric = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveBiometricCredentials(email, password);
      setBiometricEnabled(true);
      setShowBiometricForm(false);
      setPassword('');
      setMsg('Authentification biométrique activée.');
      setTimeout(() => setMsg(''), 2500);
    } catch (err: any) {
      setMsg('Échec : ' + (err?.message || 'Erreur inconnue'));
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Se déconnecter ?')) return;
    await clearAuth();
    navigate('/login', { replace: true });
  };

  const row = 'w-full bg-surface rounded-xl border border-border p-4 flex items-center gap-3 text-left';

  return (
    <div className="pb-nav safe-top overflow-y-auto" style={{ height: '100%' }}>
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold text-text-main mb-4">Paramètres</h1>

        {msg && (
          <div className="mb-4 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm">
            {msg}
          </div>
        )}

        {/* Compte */}
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Compte</p>
        <div className="space-y-2 mb-5">
          <div className={row}>
            <span className="text-2xl">👤</span>
            <span className="text-text-main font-medium">{email || '—'}</span>
          </div>
        </div>

        {/* Serveur */}
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Serveur</p>
        <div className="space-y-2 mb-5">
          {editingUrl ? (
            <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
              <input
                type="url"
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="https://mon-serveur.example.com"
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text-main text-sm focus:outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button onClick={handleSaveUrl} className="flex-1 bg-primary text-white font-semibold py-2 rounded-xl text-sm">Enregistrer</button>
                <button onClick={() => setEditingUrl(false)} className="flex-1 border border-border text-text-muted font-semibold py-2 rounded-xl text-sm">Annuler</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditingUrl(true)} className={row + ' active:opacity-80'}>
              <span className="text-2xl">🌐</span>
              <span className="min-w-0 flex-1">
                <span className="block text-text-main font-medium text-sm">URL Serveur</span>
                <span className="block text-text-muted text-xs truncate">{serverUrl}</span>
              </span>
              <span className="text-text-muted">→</span>
            </button>
          )}
        </div>

        {/* Sécurité */}
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Sécurité</p>
        <div className="space-y-2 mb-5">
          {biometricAvailable ? (
            biometricEnabled ? (
              <button onClick={handleDisableBiometric} className={row + ' active:opacity-80'}>
                <span className="text-2xl">👆</span>
                <span className="flex-1">
                  <span className="block text-text-main font-medium text-sm">Biométrie activée</span>
                  <span className="block text-text-muted text-xs">Appuyer pour désactiver</span>
                </span>
                <span className="text-green-400 text-xs font-semibold">ON</span>
              </button>
            ) : showBiometricForm ? (
              <form onSubmit={handleEnableBiometric} className="bg-surface rounded-xl border border-border p-4 space-y-3">
                <p className="text-sm text-text-secondary">Entrez votre mot de passe pour activer la connexion biométrique :</p>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  required
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text-main text-sm focus:outline-none focus:border-primary"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-primary text-white font-semibold py-2 rounded-xl text-sm">Activer</button>
                  <button type="button" onClick={() => setShowBiometricForm(false)} className="flex-1 border border-border text-text-muted font-semibold py-2 rounded-xl text-sm">Annuler</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowBiometricForm(true)} className={row + ' active:opacity-80'}>
                <span className="text-2xl">👆</span>
                <span className="flex-1">
                  <span className="block text-text-main font-medium text-sm">Connexion biométrique</span>
                  <span className="block text-text-muted text-xs">Empreinte / visage</span>
                </span>
                <span className="text-text-muted text-xs font-semibold">Activer →</span>
              </button>
            )
          ) : (
            <div className={row + ' opacity-50'}>
              <span className="text-2xl">👆</span>
              <span className="flex-1">
                <span className="block text-text-main font-medium text-sm">Biométrie non disponible</span>
                <span className="block text-text-muted text-xs">Non supporté sur cet appareil</span>
              </span>
            </div>
          )}
        </div>

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          className="w-full border border-red-400/30 bg-red-400/08 text-red-400 font-semibold py-3 rounded-xl text-sm active:opacity-80 mt-2"
        >
          ↪ Déconnexion
        </button>
      </div>
    </div>
  );
}
