import { Preferences } from '@capacitor/preferences';
import { NativeBiometric } from 'capacitor-native-biometric';

const TOKEN_KEY = 'landlord_jwt';
const EMAIL_KEY = 'landlord_email';
const SERVER_URL_KEY = 'landlord_server_url';
const BIOMETRIC_ENABLED_KEY = 'landlord_biometric_enabled';
const BIOMETRIC_SERVER = 'rentmaestro.landlord';

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
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch {
    return false;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
  return value === 'true';
}

export async function saveBiometricCredentials(email: string, password: string): Promise<void> {
  await NativeBiometric.setCredentials({
    username: email,
    password,
    server: BIOMETRIC_SERVER,
  });
  await Preferences.set({ key: BIOMETRIC_ENABLED_KEY, value: 'true' });
}

export async function getBiometricCredentials(): Promise<{ username: string; password: string }> {
  await NativeBiometric.verifyIdentity({
    reason: 'Connexion à Rentmaestro',
    title: 'Authentification',
  });
  return await NativeBiometric.getCredentials({ server: BIOMETRIC_SERVER });
}

export async function clearBiometricCredentials(): Promise<void> {
  try {
    await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER });
  } catch {}
  await Preferences.remove({ key: BIOMETRIC_ENABLED_KEY });
}
