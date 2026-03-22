import { Preferences } from '@capacitor/preferences';

/**
 * Cross-platform storage using BOTH Capacitor Preferences (mobile) AND localStorage (web + backup)
 * This ensures data is always available synchronously and persisted properly
 */

export const appStorage = {
  /**
   * Set a value in persistent storage
   * Saves to BOTH Capacitor Preferences (async) AND localStorage (sync) for maximum reliability
   */
  async setItem(key: string, value: string): Promise<void> {
    let success = false;
    
    // ALWAYS save to localStorage first (synchronous, immediate)
    try {
      localStorage.setItem(key, value);
      console.log(`✅ Storage: Saved to localStorage - ${key}`);
      success = true;
    } catch (localErr) {
      console.warn(`⚠️ Storage: localStorage save failed:`, localErr);
    }

    // ALSO try Capacitor Preferences (async, for Android native persistence)
    try {
      await Preferences.set({ key, value });
      console.log(`✅ Storage: Saved to Capacitor Preferences - ${key}`);
      success = true;
    } catch (capErr) {
      console.warn(`⚠️ Storage: Capacitor Preferences save failed:`, capErr);
    }

    if (!success) {
      throw new Error(`Failed to save ${key} to any storage backend`);
    }
  },

  /**
   * Get a value from persistent storage
   * Tries Capacitor Preferences FIRST (permanent Android storage), then falls back to localStorage
   */
  async getItem(key: string): Promise<string | null> {
    // Try Capacitor Preferences FIRST (permanent storage on Android)
    try {
      const { value } = await Preferences.get({ key });
      if (value !== null) {
        console.log(`✅ Storage: Retrieved from Capacitor Preferences (PERSISTENT) - ${key}`);
        // Also sync to localStorage for fast access
        localStorage.setItem(key, value);
        return value;
      }
    } catch (capErr) {
      console.warn(`⚠️ Storage: Capacitor Preferences retrieval failed:`, capErr);
    }

    // Fallback to localStorage if not in Capacitor (web environment)
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        console.log(`✅ Storage: Retrieved from localStorage (FALLBACK) - ${key}`);
        return value;
      }
    } catch (localErr) {
      console.warn(`⚠️ Storage: localStorage retrieval failed:`, localErr);
    }

    console.log(`⚠️ Storage: Key not found in either storage - ${key}`);
    return null;
  },

  /**
   * Remove a value from persistent storage
   */
  async removeItem(key: string): Promise<void> {
    // Remove from localStorage
    try {
      localStorage.removeItem(key);
      console.log(`✅ Storage: Removed from localStorage - ${key}`);
    } catch (fallbackErr) {
      console.warn(`⚠️ Storage: localStorage removal failed:`, fallbackErr);
    }

    // Remove from Capacitor Preferences
    try {
      await Preferences.remove({ key });
      console.log(`✅ Storage: Removed from Capacitor Preferences - ${key}`);
    } catch (e) {
      console.warn(`⚠️ Storage: Capacitor remove failed`, e);
    }
  },

  /**
   * Clear all app storage
   */
  async clear(): Promise<void> {
    try {
      localStorage.clear();
      console.log(`✅ Storage: Cleared localStorage`);
    } catch (fallbackErr) {
      console.warn(`⚠️ Storage: localStorage clear failed`);
    }

    try {
      await Preferences.clear();
      console.log(`✅ Storage: Cleared Capacitor Preferences`);
    } catch (e) {
      console.warn(`⚠️ Storage: Capacitor clear failed`);
    }
  },
};
