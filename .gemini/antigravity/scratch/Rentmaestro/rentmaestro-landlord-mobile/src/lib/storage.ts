import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY = 'landlord_jwt';
const EMAIL_KEY = 'landlord_email';
const SERVER_URL_KEY = 'landlord_server_url';

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
