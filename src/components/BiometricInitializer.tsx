import { useEffect, useState } from 'react';
import { initializeBiometric, isBiometricReady, requestBiometricPermission } from '@/lib/biometric';

/**
 * BiometricInitializer Component
 * Initializes the biometric system when app starts
 * Logs warnings if biometric system is not ready
 */
export function BiometricInitializer() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initBiometric = async () => {
      try {
        const win: any = window;
        
        console.log('🔐🔐🔐 [APP INIT] ========== BIOMETRIC SYSTEM INITIALIZATION ==========');
        
        // ✅ CRITICAL: Check if running in native environment
        console.log('[APP INIT] Checking if app is running NATIVELY...');
        if (!win.Capacitor) {
          console.error('❌❌❌ CRITICAL: APP IS NOT RUNNING NATIVELY ❌❌❌');
          console.error('[APP INIT] Capacitor not detected - this means:');
          console.error('   - You are running in WEB/BROWSER mode');
          console.error('   - Biometric will NOT work');
          console.error('   - You must open the APK file on your Android phone');
          console.error('[APP INIT] SOLUTION:');
          console.error('   1. Uninstall any web version');
          console.error('   2. Install the APK on your phone: PINIT-Vault-debug.apk');
          console.error('   3. Open the app from your phone home screen');
          setIsInitialized(true);
          return;
        }
        
        console.log('✅ App is running NATIVELY - Capacitor detected');
        
        // ✅ CRITICAL: Request biometric permission from user
        console.log('[APP INIT] Requesting biometric permission from user...');
        const permissionGranted = await requestBiometricPermission();
        
        if (permissionGranted) {
          console.log('✅ Biometric permission granted by user');
        } else {
          console.warn('⚠️ Biometric permission denied by user');
          console.warn('[APP INIT] User can grant permission later in Settings');
        }
        
        // Now initialize biometric
        console.log('[APP INIT] Initializing biometric system...');
        const result = await initializeBiometric();
        
        if (result.success) {
          console.log('✅ Biometric system initialized successfully');
        } else {
          console.error('❌ Biometric initialization failed:', result.error);
          console.error('[APP INIT] Fingerprint authentication will NOT work');
          console.error('[APP INIT] Check your phone settings:');
          console.error('   1. Settings → Security → Fingerprint');
          console.error('   2. Enroll at least one fingerprint');
          console.error('   3. Restart the app');
        }
        
        setIsInitialized(true);
      } catch (err: any) {
        console.error('❌ Error during initialization:', err);
        setIsInitialized(true);
      }
    };
    
    initBiometric();
  }, []);

  // This component doesn't render anything, just initializes
  return null;
}
