type BiometricAvailability = { available: boolean; type?: string; reason?: string };

const hasWindowFAIO = typeof (window as any).FingerprintAIO !== 'undefined' || typeof (window as any).Fingerprint !== 'undefined';

export async function isBiometricAvailable(): Promise<BiometricAvailability> {
  try {
    const win: any = window as any;
    
    console.log('🔍 BiometricAvailable Check:');
    console.log('  - win.FingerprintAIO:', typeof win.FingerprintAIO);
    console.log('  - win.Fingerprint:', typeof win.Fingerprint);
    console.log('  - hasWindowFAIO:', hasWindowFAIO);
    
    // Prefer native Capacitor community plugin if available
    if (win.FingerprintAIO) {
      console.log('  - Trying FingerprintAIO.isAvailable()...');
      try {
        const result = await win.FingerprintAIO.isAvailable();
        console.log('  ✅ FingerprintAIO available:', result);
        return { available: true, type: 'fingerprint' };
      } catch (err: any) {
        console.log('  ❌ FingerprintAIO.isAvailable() failed:', err?.message);
        // Continue to next check
      }
    }

    if (win.Fingerprint && typeof win.Fingerprint.isAvailable === 'function') {
      console.log('  - Trying Fingerprint.isAvailable()...');
      try {
        const result = await win.Fingerprint.isAvailable();
        console.log('  ✅ Fingerprint available:', result);
        return { available: true, type: 'fingerprint' };
      } catch (err: any) {
        console.log('  ❌ Fingerprint.isAvailable() failed:', err?.message);
      }
    }

    if (hasWindowFAIO) {
      console.log('  ✅ Plugin object exists (hasWindowFAIO=true)');
      return { available: true, type: 'fingerprint' };
    }

    console.log('  ❌ No biometric plugin detected');
    return { available: false, reason: 'Biometric plugin not found' };
  } catch (e: any) {
    console.log('  ❌ Error checking biometric:', e?.message);
    return { available: false, reason: e?.message };
  }
}

export async function showBiometricPrompt(options?: { clientId?: string; clientSecret?: string; disableBackup?: boolean }): Promise<void> {
  const win: any = window as any;
  
  console.log('🔐 ShowBiometricPrompt:');
  
  // Try FingerprintAIO (cordova plugin)
  if (win.FingerprintAIO) {
    console.log('  - Using FingerprintAIO.show()');
    return win.FingerprintAIO.show({
      clientId: options?.clientId || 'SecureSweet',
      clientSecret: options?.clientSecret || 'SecureSweetSecret',
      disableBackup: !!options?.disableBackup,
    });
  }

  // Some devices expose `Fingerprint` (older plugin name)
  if (win.Fingerprint && typeof win.Fingerprint.show === 'function') {
    console.log('  - Using Fingerprint.show()');
    return win.Fingerprint.show({
      clientId: options?.clientId || 'SecureSweet',
      clientSecret: options?.clientSecret || 'SecureSweetSecret',
    });
  }

  // If no native plugin, throw so caller can fallback to WebAuthn/browser
  console.log('  ❌ No biometric plugin available');
  throw new Error('Native biometric plugin not available');
}
