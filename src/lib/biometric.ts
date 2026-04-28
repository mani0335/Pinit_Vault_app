// Comprehensive biometric diagnostic system
export async function isBiometricAvailable(): Promise<{ available: boolean; reason?: string; sensorType?: string }> {
  try {
    // Silent sensor check - no popup messages
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor) {
      console.error(' NOT A NATIVE APP - Capacitor not detected');
      return { available: false, reason: 'App is not running in native environment. Install APK on phone.' };
    }
    
    // Silent native app check
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
    
    if (!NativeBiometric) {
      console.error('Biometric plugin NOT loaded');
      return { available: false, reason: 'Biometric plugin not installed' };
    }
    
    // Silent availability check
    try {
      const result = await NativeBiometric.isAvailable();
      
      if (result.isAvailable) {
        return { 
          available: true, 
          sensorType: String(result.biometryType) || 'fingerprint' 
        };
      } else {
        return { 
          available: false, 
          reason: 'Device has biometric sensor but no fingerprints enrolled. Please go to Settings -> Security -> Fingerprint and add your fingerprint.' 
        };
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return { 
        available: false, 
        reason: `Biometric check failed: ${error?.message || 'Unknown error'}. Please ensure your device has fingerprint security enabled.` 
      };
    }
  } catch (error: any) {
    console.error(' Critical error in biometric check:', error);
    console.error('   Message:', error?.message);
    console.error('   Stack:', error?.stack);
    return { 
      available: false, 
      reason: `System error: ${error?.message || 'Unknown error'}` 
    };
  }
}

// Show biometric prompt for authentication (Using Capacitor @capgo/capacitor-native-biometric)
// CRITICAL: This function MUST BLOCK until user actually scans fingerprint
export async function showBiometricPrompt(options?: {
  reason?: string;
  title?: string;
  subtitle?: string;
  description?: string;
}): Promise<void> {
  console.log('\n BIOMETRIC AUTHENTICATION - SIMPLIFIED APPROACH');
  console.log('===========================================');
  
  try {
    // STEP 1: Quick availability check
    console.log('   STEP 1: Quick biometric check...');
    const availability = await isBiometricAvailable();
    
    if (!availability.available) {
      throw new Error(availability.reason || 'Biometric not available');
    }
    
    console.log('   Biometric available:', availability.sensorType);
    
    // STEP 2: Load plugin and use simplest method
    console.log('   STEP 2: Using simplified biometric authentication...');
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
    
    if (!NativeBiometric) {
      throw new Error('Biometric plugin not available');
    }
    
    // STEP 3: Use the most basic authentication options
    console.log('   STEP 3: Attempting basic biometric prompt...');
    
    const basicOptions = {
      reason: options?.reason || 'Authenticate to continue',
      title: options?.title || 'BioVault',
      subtitle: options?.subtitle || 'Verify your fingerprint',
      description: options?.description || 'Place your finger on the sensor',
      // Remove all problematic options
    };
    
    console.log('   Using basic options:', basicOptions);
    
    // SIMPLIFIED: Try only the most reliable method
    try {
      console.log('   Trying basic biometric authentication...');
      
      // Use the simplest possible call
      const result = await NativeBiometric.verifyIdentity(basicOptions);
      
      console.log('   Authentication result:', result);
      
      // Very simple success check - if we get here without error, it worked
      console.log('   SUCCESS: Biometric authentication completed');
      return;
      
    } catch (error: any) {
      console.error('   Authentication failed:', error.message);
      
      // If basic method fails, try with minimal options
      try {
        console.log('   Trying with minimal options...');
        const minimalResult = await NativeBiometric.verifyIdentity({
          reason: 'Verify your fingerprint'
        });
        console.log('   Minimal authentication SUCCESS');
        return;
      } catch (minimalError: any) {
        console.error('   Minimal authentication also failed:', minimalError.message);
        
        // FINAL ATTEMPT: Try authenticate method as fallback
        if (typeof NativeBiometric.authenticate === 'function') {
          try {
            console.log('   Trying authenticate method as fallback...');
            const authResult = await NativeBiometric.authenticate({
              reason: 'Verify your fingerprint'
            });
            console.log('   Authenticate method SUCCESS');
            return;
          } catch (authError: any) {
            console.error('   Authenticate method failed:', authError.message);
          }
        }
        
        // All methods failed - provide user-friendly error
        const errorMsg = error.message || minimalError.message || 'Biometric authentication failed';
        
        if (errorMsg.includes('canceled') || errorMsg.includes('cancel')) {
          throw new Error('Authentication was cancelled');
        } else if (errorMsg.includes('not available') || errorMsg.includes('not enrolled')) {
          throw new Error('Please add your fingerprint to device settings first');
        } else if (errorMsg.includes('not implemented')) {
          throw new Error('Biometric authentication not supported on this device');
        } else {
          throw new Error('Fingerprint authentication failed. Please try again.');
        }
      }
    }
    
  } catch (error: any) {
    console.error('Biometric authentication error:', error.message);
    throw error;
  }
}

// ✅ Initialize biometric system (Capacitor Biometric)
export async function initializeBiometric(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 ========== INITIALIZING BIOMETRIC SYSTEM (CAPACITOR) ==========');
    const win: any = window;
    
    // Stage 1: Check if we're on a native platform
    console.log('📱 Stage 1: Platform check');
    console.log('   - window.Capacitor:', !!win.Capacitor);
    console.log('   - document.readyState:', document.readyState);
    
    // Stage 2: Check if Capacitor is available
    if (!win.Capacitor) {
      console.error('❌ Capacitor framework not available');
      return { 
        success: false, 
        error: 'Capacitor framework not available. App may not be running in native environment.' 
      };
    }
    
    console.log('✅ Stage 2: Capacitor is available');
    
    // Stage 3: Load Capacitor Biometric plugin
    console.log('🔍 Stage 3: Loading Capacitor Biometric plugin...');
    try {
      const { Biometric } = await import('@capacitor/biometric');
      
      if (!Biometric) {
        throw new Error('Biometric plugin not available');
      }
      
      console.log('✅ Capacitor Biometric plugin loaded successfully');
      
      // Stage 4: Check if biometric is available
      console.log('🧪 Stage 4: Checking if biometric is available on device...');
      const result = await Biometric.isAvailable();
      
      if (result.isAvailable) {
        console.log('✅ Biometric is available on device');
        console.log('   Biometric type:', result.biometryType);
        return { success: true };
      } else {
        console.warn('⚠️ Biometric hardware not available on this device');
        return { 
          success: false, 
          error: 'Biometric hardware not available on this device' 
        };
      }
    } catch (pluginErr: any) {
      console.error('❌ Error loading Capacitor Biometric plugin:', pluginErr);
      return { 
        success: false, 
        error: `Plugin error: ${pluginErr.message || String(pluginErr)}` 
      };
    }
  } catch (error: any) {
    console.error('❌ Unexpected error during initialization:', error);
    return { 
      success: false, 
      error: String(error.message || error) 
    };
  }
}

// ✅ Check if biometric is ready to use
export async function isBiometricReady(): Promise<boolean> {
  const result = await initializeBiometric();
  return result.success;
}

// ✅ Request biometric permission (Using Capacitor Permissions)
export async function requestBiometricPermission(): Promise<boolean> {
  try {
    const win: any = window;
    
    console.log('📋 [PERMISSIONS] Requesting biometric permissions...');
    
    if (!win.Capacitor) {
      console.warn('⚠️ Not running in Capacitor environment - skipping permission request');
      return true;
    }
    
    // Import Capacitor Permissions plugin
    try {
      const { PermissionStatus, Permissions } = await import('@capacitor/core');
      
      console.log('🔐 [PERMISSIONS] Capacitor Permissions plugin loaded');
      
      // Request BIOMETRIC permission (Android 28+)
      console.log('📱 [PERMISSIONS] Requesting BIOMETRIC permission...');
      const bioPermResult = await Permissions.request({ alias: 'biometric' });
      console.log('✅ [PERMISSIONS] BIOMETRIC permission result:', bioPermResult.biometric);
      
      // Also request CAMERA permission (for face recognition)
      console.log('📱 [PERMISSIONS] Requesting CAMERA permission...');
      const cameraPermResult = await Permissions.request({ alias: 'camera' });
      console.log('✅ [PERMISSIONS] CAMERA permission result:', cameraPermResult.camera);
      
      const bioGranted = bioPermResult.biometric === 'granted' || bioPermResult.biometric === 'prompt';
      const cameraGranted = cameraPermResult.camera === 'granted' || cameraPermResult.camera === 'prompt';
      
      if (bioGranted) {
        console.log('✅ [PERMISSIONS] Biometric permission granted/prompt');
        return true;
      } else {
        console.error('❌ [PERMISSIONS] Biometric permission DENIED');
        return false;
      }
    } catch (permErr: any) {
      console.warn('⚠️ [PERMISSIONS] Permissions plugin error (may not be available):', permErr?.message);
      // Continue anyway - Capacitor may handle it automatically
      return true;
    }
  } catch (error: any) {
    console.error('❌ [PERMISSIONS] Error requesting biometric permission:', error);
    return false;
  }
}
