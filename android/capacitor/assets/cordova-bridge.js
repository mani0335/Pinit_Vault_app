/**
 * Minimal Cordova Bridge for Capacitor + Cordova Plugins
 * This bridges the gap between Capacitor (modern) and Cordova plugins (legacy)
 * Allows Cordova plugins to work in Capacitor Android environment
 */

// Execute counter for tracking async calls
let execUriCounter = 0;

// Cordova-compatible object
const cordova = {
  _channels: {},
  _callbackMap: {},
  _executors: {},
  
  // Initialize Cordova
  require: function(id) {
    return require(id);
  },

  // Main exec function - routes to native Android
  exec: function(success, fail, service, action, args) {
    // Check if this is running in an Android WebView with native bridge
    const bridge = window.cordova || window._cordovaNative;
    
    if (!bridge) {
      console.error('❌ Cordova bridge not available');
      if (fail) fail('Cordova bridge not available');
      return;
    }
    
    // Generate unique callback ID for this execution
    const callbackId = 'exec_' + (execUriCounter++) + '_' + Date.now();
    
    // Store callbacks for later retrieval
    cordova._callbackMap[callbackId] = {
      success: success,
      fail: fail
    };
    
    // Log the execution
    console.log(`[Cordova Exec] service="${service}", action="${action}", callbackId="${callbackId}"`);
    console.log(`[Cordova Exec] args:`, args);
    
    try {
      // Try multiple ways to call the native plugin
      
      // Method 1: Try Android bridge if available
      if (window.Android && window.Android.exec) {
        console.log('📱 Using Android bridge');
        window.Android.exec(
          JSON.stringify(args),
          service,
          action,
          callbackId
        );
        return;
      }
      
      // Method 2: Try Capacitor's native bridge
      if (window.Capacitor && window.Capacitor.nativeChannel) {
        console.log('⚡ Using Capacitor native bridge');
        window.Capacitor.nativeChannel.postMessage({
          type: 'cordova',
          service: service,
          action: action,
          args: args,
          callbackId: callbackId
        });
        return;
      }
      
      // Method 3: Try generic prompts (last resort, some browsers support this)
      if (window.prompt) {
        console.log('⚠️ Using window.prompt fallback');
        const result = window.prompt(service + ':' + action, JSON.stringify(args));
        if (result) {
          try {
            const parsed = JSON.parse(result);
            if (success) success(parsed);
          } catch (e) {
            if (fail) fail(e);
          }
        }
        return;
      }
      
      throw new Error('No native bridge available');
    } catch (error) {
      console.error('❌ Cordova exec error:', error);
      if (fail) fail(error?.message || 'Cordova exec failed');
    }
  },

  // Callback handlers called from native side
  callback: function(callbackId, success, result) {
    const callbacks = cordova._callbackMap[callbackId];
    if (callbacks) {
      if (success && callbacks.success) {
        callbacks.success(result);
      } else if (!success && callbacks.fail) {
        callbacks.fail(result);
      }
      delete cordova._callbackMap[callbackId];
    }
  },

  // Define a Cordova module
  define: function(id, factory) {
    cordova.modules = cordova.modules || {};
    cordova.modules[id] = { factory: factory, exports: {} };
  },

  // Require a module
  require: function(id) {
    const module = cordova.modules && cordova.modules[id];
    if (!module) throw new Error('Module not found: ' + id);
    if (!module.exports) {
      module.exports = module.factory.call(this);
    }
    return module.exports;
  }
};

// Expose cordova globally
window.cordova = cordova;
window._cordovaNative = cordova;

// Fire 'deviceready' event when document is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('📱 Firing deviceready event');
  document.dispatchEvent(new Event('deviceready'));
}, { once: true });

// Also fire if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      console.log('📱 Firing deviceready event (late)');
      document.dispatchEvent(new Event('deviceready'));
    }, 100);
  }, { once: true });
} else {
  setTimeout(function() {
    console.log('📱 Firing deviceready event (immediate)');
    document.dispatchEvent(new Event('deviceready'));
  }, 100);
}

console.log('✅ Cordova bridge initialized');
