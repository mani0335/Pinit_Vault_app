// API Configuration for PINIT Vault
export const API_CONFIG = {
  // Backend API base URL
  BASE_URL: (() => {
    if (typeof window !== 'undefined') {
      // Check for environment variable in window (if set by build process)
      if ((window as any).__ENV__?.VITE_BACKEND_URL) {
        return (window as any).__ENV__.VITE_BACKEND_URL;
      }
      
      // Derive from current origin for development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8000'; // Default backend port for local development
      }
      
      // Use current origin for production
      return window.location.origin;
    }
    
    // Fallback for SSR or other environments
    return 'https://pinit-vault.onrender.com';
  })(),
  
  // Public app URL (used for share links)
  PUBLIC_URL: (() => {
    if (typeof window !== 'undefined') {
      // Check for environment variable in window (if set by build process)
      if ((window as any).__ENV__?.VITE_PUBLIC_URL) {
        return (window as any).__ENV__.VITE_PUBLIC_URL;
      }
      
      // Use current origin
      return window.location.origin;
    }
    
    // Fallback
    return 'https://pinit-vault.onrender.com';
  })(),
  
  // API endpoints
  ENDPOINTS: {
    // Portfolio sharing endpoints
    CREATE_PORTFOLIO_SHARE: '/portfolio-shares/portfolio/create',
    GET_PORTFOLIO_SHARE: '/portfolio-shares/portfolio/{token}',
    UPDATE_PORTFOLIO_SHARE: '/portfolio-shares/portfolio/{token}',
    REVOKE_PORTFOLIO_SHARE: '/portfolio-shares/portfolio/{token}/revoke',
    VERIFY_PASSWORD: '/portfolio-shares/verify-password',
    VERIFY_OTP: '/portfolio-shares/verify-otp',
    SEND_OTP: '/portfolio-shares/send-otp',
    GET_SHARE_ANALYTICS: '/portfolio-shares/analytics/{token}',
    
    // Auth endpoints
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    
    // Vault endpoints
    SAVE_VAULT_IMAGE: '/vault/save',
    GET_VAULT_IMAGES: '/vault/images',
    
    // Portfolio endpoints
    GET_PORTFOLIOS: '/portfolio/get-portfolios',
    SAVE_PORTFOLIO: '/portfolio/save',
  }
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string, params?: Record<string, string>): string => {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    });
  }
  
  return url;
};

// Helper function to build public URLs (for share links)
export const buildPublicUrl = (path: string): string => {
  return `${API_CONFIG.PUBLIC_URL}${path}`;
};
