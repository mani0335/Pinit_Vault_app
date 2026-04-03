import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.biovault.app',
  appName: 'PINIT',
  webDir: 'dist',
  server: {
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      autoHide: true,
      showSpinner: false,
    },
  },
};

export default config;
