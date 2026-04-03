import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.biovault.app',
  appName: 'PINIT',
  webDir: 'dist',
  server: {
    cleartext: true,
  },
};

export default config;
