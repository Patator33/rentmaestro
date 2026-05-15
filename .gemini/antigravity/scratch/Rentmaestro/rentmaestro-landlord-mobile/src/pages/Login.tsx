import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/landlord';
import { saveAuth, saveServerUrl, getServerUrl, isBiometricAvailable, isBiometricEnabled, saveBiometricCredentials, getBiometricCredentials } from '../lib/storage';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getServerUrl().then(setServerUrl);
    Promise.all([isBiometricAvailable(), isBiometricEnabled()]).then(([available, enabled]) => {
      setBiometricAvailable(available);
      setBiometricEnabled(enabled);
      if (available && enabled) {
        triggerBiometric();
      }
    });
  }, []);

  const triggerBiometric = async () => {
    try {
      const creds = await getBiometricCredentials();
      const { token, email: userEmail } = await api.login(creds.username, creds.password);
      await saveAuth(token, userEmail);
      navigate('/', { replace: true });
    } catch (err: any) {
      if (err?.message !== 'Authentication cancelled.' && err?.code !== 11) {
        setError('Authentification biométrique échouée');
      }
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

      if (biometricAvailable && !biometricEnabled) {
        const enable = window.confirm('Activer la connexion par empreinte digitale ?');
        if (enable) {
          await saveBiometricCredentials(email.trim(), password);
          setBiometricEnabled(true);
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

        {biometricAvailable && biometricEnabled && (
          <button
            type="button"
            onClick={triggerBiometric}
            className="w-full bg-surface border border-primary text-primary font-semibold py-3 rounded-xl mb-4 flex items-center justify-center gap-2"
          >
            <span className="text-xl">👆</span> Connexion par empreinte
          </button>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
