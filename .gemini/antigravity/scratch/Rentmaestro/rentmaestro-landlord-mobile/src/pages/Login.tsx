import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/landlord';
import {
  saveAuth, saveServerUrl, getServerUrl,
  isBiometricAvailable, isBiometricEnabled,
  saveBiometricCredentials, getBiometricCredentials,
} from '../lib/storage';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getServerUrl().then(setServerUrl);
    Promise.all([isBiometricAvailable(), isBiometricEnabled()]).then(([avail, enabled]) => {
      setBioAvailable(avail);
      setBioEnabled(enabled);
      if (avail && enabled) triggerBiometric();
    });
  }, []);

  const triggerBiometric = async () => {
    setBioLoading(true);
    setError('');
    try {
      const { username, password: pwd } = await getBiometricCredentials();
      const { token, email: userEmail } = await api.login(username, pwd);
      await saveAuth(token, userEmail);
      navigate('/', { replace: true });
    } catch (err: any) {
      // USER_CANCEL or failure — just show the form silently
      if (!err?.message?.includes('Cancel') && !err?.message?.includes('cancel')) {
        setError('Échec de l\'authentification biométrique.');
      }
    } finally {
      setBioLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const trimmed = serverUrl.trim().replace(/\/$/, '');
      if (trimmed) await saveServerUrl(trimmed);
      const { token, email: userEmail } = await api.login(email.trim(), password);
      await saveAuth(token, userEmail);

      // Propose biometric setup after first successful manual login
      if (bioAvailable && !bioEnabled) {
        const accept = window.confirm('Activer la connexion par empreinte digitale pour les prochaines fois ?');
        if (accept) {
          try { await saveBiometricCredentials(email.trim(), password); } catch {}
        }
      }

      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 bg-bg safe-top">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-text-main">RentMaestro Pro</h1>
          <p className="text-text-secondary mt-1 text-sm">Espace Bailleur</p>
        </div>

        {bioAvailable && bioEnabled && (
          <button
            type="button"
            onClick={triggerBiometric}
            disabled={bioLoading}
            className="w-full mb-6 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-3 disabled:opacity-50"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1.5px solid rgba(99,102,241,0.3)' }}
          >
            <span className="text-2xl">{bioLoading ? '⏳' : '👆'}</span>
            {bioLoading ? 'Vérification...' : 'Connexion par empreinte'}
          </button>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {bioEnabled && (
            <p className="text-center text-text-muted text-xs">— ou avec mot de passe —</p>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoCapitalize="none"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-main text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 pr-11 text-text-main text-sm focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-lg leading-none"
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-text-muted underline"
            >
              ⚙️ {showAdvanced ? 'Masquer' : 'Serveur avancé'}
            </button>
            {showAdvanced && (
              <input
                type="url"
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="https://mon-serveur.example.com"
                className="mt-2 w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-main text-sm focus:outline-none focus:border-primary"
              />
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
