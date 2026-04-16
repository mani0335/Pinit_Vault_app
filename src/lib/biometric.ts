type BiometricAvailability = { available: boolean; type?: string; reason?: string };

// ✅ Wait for deviceready event from Cordova (more reliable than just checking window.cordova)
export async function waitForDeviceReady(maxWaitMs: number = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const win: any = window as any;
    
    // If Cordova is already ready, resolve immediately
    if (win.cordova) {
      console.log('✅ Cordova already loaded');
      resolve(true);
      return;
    }
    
    // Otherwise, wait for deviceready event
    const timeout = setTimeout(() => {
      console.warn('⚠️ Device ready timeout after ' + maxWaitMs + 'ms');
      resolve(false);
    }, maxWaitMs);
    
    document.addEventListener('deviceready', () => {
      clearTimeout(timeout);
      console.log('✅ Cordova deviceready event fired');
      resolve(true);
    }, { once: true });
  });
}

// ✅ Export helper functions so components can wait for plugin initialization
export async function waitForCordova(maxWaitMs: number = 10000): Promise<boolean> {
  const startTime = Date.now();
  
  // FIRST: Wait for deviceready event
  const ready = await waitForDeviceReady(maxWaitMs);
  if (!ready) {
    console.warn('⚠️ Cordova deviceready timeout');
    return false;
  }
  
  // SECOND: Verify cordova.exec is available
  const timeLeft = maxWaitMs - (Date.now() - startTime);
  const checkTimeout = Math.max(1000, timeLeft);
  
  const checkStart = Date.now();
  while (Date.now() - checkStart < checkTimeout) {
    const win: any = window as any;
    if (typeof win.cordova !== 'undefined' && typeof win.cordova.exec === 'function') {
      console.log('✅ Cordova.exec is available');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.warn('⚠️ Cordova.exec not available after ' + checkTimeout + 'ms');
  return false;
}

// ✅ Export helper function so components can wait for plugin initialization
export async function waitForFingerprintPlugin(maxWaitMs: number = 10000): Promise<boolean> {
  const startTime = Date.now();
  const win: any = window as any;
  
  // FIRST: Ensure Cordova is ready
  const cordovaReady = await waitForCordova(Math.min(5000, maxWaitMs));
  if (!cordovaReady) {
    console.warn('⚠️ Cordova not ready before checking fingerprint plugin');
  }
  
  // SECOND: Wait for FingerprintAIO plugin to be available
  const timeLeft = maxWaitMs - (Date.now() - startTime);
  const checkTimeout = Math.max(1000, timeLeft);
  
  const checkStart = Date.now();
  while (Date.now() - checkStart < checkTimeout) {
    if (win.FingerprintAIO && typeof win.FingerprintAIO.show === 'function') {
      console.log('✅ FingerprintAIO plugin is ready');
      return true;
    }
    if (win.Fingerprint && typeof win.Fingerprint.show === 'function') {
      console.log('✅ Fingerprint plugin is ready');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.warn('⚠️ Fingerprint plugin not found after ' + checkTimeout + 'ms');
  console.warn('⚠️ Available on window:', {
    FingerprintAIO: typeof win.FingerprintAIO,
    Fingerprint: typeof win.Fingerprint,
    cordova: typeof win.cordova,
  });
  return false;
}

// ✅ Helper function to wait for Cordova to be ready
async function waitForCordovaInternal(maxWaitMs: number = 5000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    if (typeof (window as any).cordova !== 'undefined' && (window as any).cordova.exec) {
      console.log('✅ Cordova is ready');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.warn('⚠️ Cordova timeout after ' + maxWaitMs + 'ms');
  return false;
}

// ✅ Helper function to wait for FingerprintAIO plugin to be ready
async function waitForFingerprintPluginInternal(maxWaitMs: number = 8000): Promise<boolean> {
  const startTime = Date.now();
  const win: any = window as any;
  
  while (Date.now() - startTime < maxWaitMs) {
    if (win.FingerprintAIO && typeof win.FingerprintAIO.show === 'function') {
      console.log('✅ FingerprintAIO plugin is ready');
      return true;
    }
    if (win.Fingerprint && typeof win.Fingerprint.show === 'function') {
      console.log('✅ Fingerprint plugin is ready');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  console.warn('⚠️ Fingerprint plugin not found after ' + maxWaitMs + 'ms');
  return false;
}

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
  
  console.log('🔐 ShowBiometricPrompt: Starting...');
  console.log('  - Checking for Cordova and FingerprintAIO plugin...');
  
  // ✅ STEP 1: Wait for Cordova deviceready and plugin initialization
  console.log('⏳ Waiting for Cordova to initialize...');
  const cordovaReady = await waitForCordova(10000);
  
  if (!cordovaReady) {
    console.error('❌ Cordova failed to initialize');
    throw new Error('Cordova not initialized. FingerprintAIO plugin unavailable.');
  }
  
  console.log('⏳ Waiting for FingerprintAIO plugin to load...');
  const pluginReady = await waitForFingerprintPlugin(10000);
  
  if (!pluginReady) {
    console.error('❌ FingerprintAIO plugin not found');
    console.error('  - win.FingerprintAIO:', typeof win.FingerprintAIO);
    console.error('  - win.Fingerprint:', typeof win.Fingerprint);
    console.error('  - window.cordova:', typeof win.cordova);
    throw new Error('FingerprintAIO plugin not available');
  }

  // ✅ STEP 2: Try FingerprintAIO (cordova plugin) - most common on Android
  if (win.FingerprintAIO && typeof win.FingerprintAIO.show === 'function') {
    console.log('  ✅ FingerprintAIO.show() is callable - invoking fingerprint dialog');
    try {
      return new Promise((resolve, reject) => {
        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error('Fingerprint dialog timeout - no response from plugin'));
        }, 30000);

        win.FingerprintAIO.show({
          clientId: options?.clientId || 'SecureSweet',
          clientSecret: options?.clientSecret || 'SecureSweetSecret',
          disableBackup: options?.disableBackup === true,
        }, 
        (result: any) => {
          clearTimeout(timeout);
          console.log('  ✅ FingerprintAIO success:', result);
          resolve();
        },
        (error: any) => {
          clearTimeout(timeout);
          const errMsg = error?.message || error || 'Fingerprint authentication failed';
          console.error('  ❌ FingerprintAIO error:', errMsg);
          
          // Better error messages
          if (errMsg.includes('User cancelled') || errMsg.includes('Cancelled')) {
            reject(new Error('Fingerprint scan cancelled'));
          } else if (errMsg.includes('No fingerprint') || errMsg.includes('not enroll')) {
            reject(new Error('No fingerprint enrolled. Please register your fingerprint in Settings.'));
          } else if (errMsg.includes('Not available') || errMsg.includes('not available')) {
            reject(new Error('Fingerprint not available on this device'));
          } else if (errMsg.includes('Unauthorized') || errMsg.includes('unauthorized')) {
            reject(new Error('Fingerprint authentication unauthorized'));
          } else {
            reject(new Error(errMsg));
          }
        });
      });
    } catch (e) {
      console.error('  ❌ FingerprintAIO exception:', e);
      throw e;
    }
  }

  // ✅ STEP 3: Some devices expose `Fingerprint` (older plugin name)
  if (win.Fingerprint && typeof win.Fingerprint.show === 'function') {
    console.log('  ✅ Fingerprint.show() is callable - invoking fingerprint dialog');
    try {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Fingerprint dialog timeout'));
        }, 30000);

        win.Fingerprint.show({
          clientId: options?.clientId || 'SecureSweet',
          clientSecret: options?.clientSecret || 'SecureSweetSecret',
        },
        (result: any) => {
          clearTimeout(timeout);
          console.log('  ✅ Fingerprint success:', result);
          resolve();
        },
        (error: any) => {
          clearTimeout(timeout);
          const errMsg = error?.message || error || 'Fingerprint auth failed';
          console.error('  ❌ Fingerprint error:', errMsg);
          reject(new Error(errMsg));
        });
      });
    } catch (e) {
      console.error('  ❌ Fingerprint exception:', e);
      throw e;
    }
  }

  // If no native plugin found
  console.error('❌ Neither FingerprintAIO nor Fingerprint plugin found');
  throw new Error('Fingerprint plugin not initialized. Please check device configuration.');
}
