import { Preferences } from '@capacitor/preferences';
import { BiometricAuth, BiometryError, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';

const TOKEN_KEY = 'landlord_jwt';
const EMAIL_KEY = 'landlord_email';
const SERVER_URL_KEY = 'landlord_server_url';
const BIOMETRIC_ENABLED_KEY = 'landlord_biometric_enabled';
// Credentials stored in Preferences, access gated by biometric check in JS
const BIOMETRIC_USER_KEY = 'landlord_bio_user';
const BIOMETRIC_PASS_KEY = 'landlord_bio_pass';

export async function saveAuth(token: string, email: string) {
  await Preferences.set({ key: TOKEN_KEY, value: token });
  await Preferences.set({ key: EMAIL_KEY, value: email });
}

export async function getToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: TOKEN_KEY });
  return value;
}

export async function getEmail(): Promise<string | null> {
  const { value } = await Preferences.get({ key: EMAIL_KEY });
  return value;
}

export async function clearAuth() {
  await Preferences.remove({ key: TOKEN_KEY });
  await Preferences.remove({ key: EMAIL_KEY });
}

export async function saveServerUrl(url: string) {
  await Preferences.set({ key: SERVER_URL_KEY, value: url });
}

export async function getServerUrl(): Promise<string> {
  const { value } = await Preferences.get({ key: SERVER_URL_KEY });
  return value || (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:3000';
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const info = await BiometricAuth.checkBiometry();
    return info.strongBiometryIsAvailable || info.deviceIsSecure;
  } catch {
    return false;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
  return value === 'true';
}

export async function saveBiometricCredentials(email: string, password: string): Promise<void> {
  // Verify identity before saving — user must authenticate to enable biometric login
  await BiometricAuth.authenticate({
    reason: 'Activer la connexion biométrique',
    androidTitle: 'Authentification requise',
    androidSubtitle: 'Confirmez votre identité pour activer la biométrie',
    allowDeviceCredential: true,
  });
  await Preferences.set({ key: BIOMETRIC_USER_KEY, value: email });
  await Preferences.set({ key: BIOMETRIC_PASS_KEY, value: password });
  await Preferences.set({ key: BIOMETRIC_ENABLED_KEY, value: 'true' });
}

export async function getBiometricCredentials(): Promise<{ username: string; password: string }> {
  await BiometricAuth.authenticate({
    reason: 'Connexion à RentMaestro',
    androidTitle: 'RentMaestro Pro',
    androidSubtitle: 'Authentification bailleur',
    allowDeviceCredential: true,
  });
  const [{ value: username }, { value: password }] = await Promise.all([
    Preferences.get({ key: BIOMETRIC_USER_KEY }),
    Preferences.get({ key: BIOMETRIC_PASS_KEY }),
  ]);
  if (!username || !password) {
    // Le scan a réussi mais aucun identifiant n'est stocké (ex: résidu d'une
    // ancienne version du plugin biométrique) — on désactive pour éviter une
    // boucle où le bouton biométrique échoue silencieusement à chaque essai.
    await clearBiometricCredentials();
    throw new Error('Identifiants biométriques introuvables — reconnectez-vous puis réactivez la biométrie dans Paramètres.');
  }
  return { username, password };
}

export async function clearBiometricCredentials(): Promise<void> {
  await Preferences.remove({ key: BIOMETRIC_USER_KEY });
  await Preferences.remove({ key: BIOMETRIC_PASS_KEY });
  await Preferences.remove({ key: BIOMETRIC_ENABLED_KEY });
}

// Re-export BiometryError so callers can check error types without importing the plugin directly
export { BiometryError, BiometryErrorType };
