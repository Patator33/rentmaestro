import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY = 'landlord_jwt';
const EMAIL_KEY = 'landlord_email';

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
