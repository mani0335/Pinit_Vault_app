type BiometricAvailability = { available: boolean; type?: string };

const hasWindowFAIO = typeof (window as any).FingerprintAIO !== 'undefined' || typeof (window as any).Fingerprint !== 'undefined';

export async function isBiometricAvailable(): Promise<BiometricAvailability> {
  try {
    // Prefer native Capacitor community plugin if available
    const win: any = window as any;
    if (win.FingerprintAIO && typeof win.FingerprintAIO.isAvailable === 'function') {
      await win.FingerprintAIO.isAvailable();
      return { available: true, type: 'fingerprint' };
    }

    if (hasWindowFAIO) {
      // best-effort, assume available
      return { available: true };
    }

    return { available: false };
  } catch (e) {
    return { available: false };
  }
}

export async function showBiometricPrompt(options?: { clientId?: string; clientSecret?: string; disableBackup?: boolean }): Promise<void> {
  const win: any = window as any;
  // Try FingerprintAIO (cordova plugin)
  if (win.FingerprintAIO) {
    return win.FingerprintAIO.show({
      clientId: options?.clientId || 'SecureSweet',
      clientSecret: options?.clientSecret || 'SecureSweetSecret',
      disableBackup: !!options?.disableBackup,
      // androidFallbackToDevicePasscode: false
    });
  }

  // Some devices expose `Fingerprint` (older plugin name)
  if (win.Fingerprint && typeof win.Fingerprint.show === 'function') {
    return win.Fingerprint.show({
      clientId: options?.clientId || 'SecureSweet',
      clientSecret: options?.clientSecret || 'SecureSweetSecret',
    });
  }

  // If no native plugin, throw so caller can fallback to WebAuthn/browser
  throw new Error('Native biometric plugin not available');
}
