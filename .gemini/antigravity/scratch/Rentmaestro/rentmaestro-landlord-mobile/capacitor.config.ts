import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rentmaestro.landlord',
  appName: 'RentMaestro Pro',
  webDir: 'dist',
  plugins: {
    Preferences: {
      group: 'com.rentmaestro.landlord',
    },
  },
};

export default config;
