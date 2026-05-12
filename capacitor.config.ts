import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.biovault.app',
  appName: 'PINIT',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    // Capacitor Biometric: Native fingerprint/face authentication
    Biometric: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 0,
      autoHide: true,
      showSpinner: false,
    },
  },
};

export default config;
