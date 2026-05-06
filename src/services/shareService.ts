export interface SharedPortfolioLink {
  id: string;
  portfolioId: string;
  token: string;
  shareTitle?: string;
  shareDescription?: string;
  accessType: 'public' | 'private' | 'one-time' | 'temporary' | 'fingerprint';
  expiresAt?: string;
  password?: string;
  otpEnabled: boolean;
  allowDownload: boolean;
  watermarkEnabled: boolean;
  active: boolean;
  createdAt: string;
  views: number;
  downloadCount?: number;
  lastAccessed?: string;
  accessLog?: any[];
  securityFlags?: any;
  portfolio?: any; // Portfolio data when accessible
}

export interface PortfolioShareConfig {
  shareTitle?: string;
  shareDescription?: string;
  accessType: 'public' | 'private' | 'one-time' | 'temporary' | 'fingerprint';
  expiryHours?: number;
  password?: string;
  otpEnabled: boolean;
  watermarkEnabled: boolean;
  allowDownload: boolean;
}

export interface ShareAnalytics {
  viewCount: number;
  downloadCount: number;
  lastAccessed: string;
  lastIp?: string;
  lastDevice?: string;
  lastBrowser?: string;
  accessLog: Array<{
    timestamp: string;
    ip_address: string;
    device: string;
    browser: string;
    action: string;
  }>;
}

interface ShareService {
  createShare: (portfolioId: string, config: PortfolioShareConfig, userId: string) => Promise<SharedPortfolioLink>;
  getShares: (userId: string, portfolioId?: string) => Promise<SharedPortfolioLink[]>;
  getShareByToken: (token: string) => Promise<SharedPortfolioLink | null>;
  verifyPassword: (token: string, password: string) => Promise<boolean>;
  sendOTP: (token: string) => Promise<{ otpCode?: string; expiresAt: string }>;
  verifyOTP: (token: string, otpCode: string) => Promise<boolean>;
  revokeShare: (token: string, userId: string) => Promise<boolean>;
  updateShare: (token: string, userId: string, updates: Partial<PortfolioShareConfig>) => Promise<SharedPortfolioLink | null>;
  logAccess: (token: string, ipAddress: string, userAgent: string) => Promise<void>;
  getShareAnalytics: (token: string) => Promise<ShareAnalytics | null>;
}

class ShareServiceImpl implements ShareService {
  private readonly API_BASE = this.getApiBase();

  private getApiBase(): string {
    // Try multiple sources for the API base URL
    if (typeof window !== 'undefined') {
      // Check for environment variable in window (if set by build process)
      if ((window as any).__ENV__?.REACT_APP_API_URL) {
        return (window as any).__ENV__.REACT_APP_API_URL;
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
  }

  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const response = await fetch(`${this.API_BASE}/share${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  async createShare(
    portfolioId: string, 
    config: PortfolioShareConfig,
    userId: string
  ): Promise<SharedPortfolioLink> {
    const response = await this.apiCall('/portfolio/create', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        portfolio_id: portfolioId,
        share_title: config.shareTitle,
        share_description: config.shareDescription,
        access_type: config.accessType,
        expiry_hours: config.expiryHours,
        password: config.password,
        otp_enabled: config.otpEnabled,
        watermark_enabled: config.watermarkEnabled,
        allow_download: config.allowDownload,
        base_url: window.location.origin
      }),
    });

    return {
      id: response.token,
      portfolioId,
      token: response.token,
      shareTitle: response.share_title,
      shareDescription: response.share_description,
      accessType: response.access_type,
      expiresAt: response.expires_at,
      otpEnabled: response.otp_enabled,
      watermarkEnabled: config.watermarkEnabled,
      allowDownload: config.allowDownload,
      active: true,
      createdAt: response.created_at,
      views: 0,
    };
  }

  async getShares(userId: string, portfolioId?: string): Promise<SharedPortfolioLink[]> {
    const endpoint = portfolioId 
      ? `/portfolio/user/${userId}?portfolio_id=${portfolioId}`
      : `/portfolio/user/${userId}`;
    
    const response = await this.apiCall(endpoint);

    return response.shares.map((share: any) => ({
      id: share.token,
      portfolioId: share.portfolio_id,
      token: share.token,
      shareTitle: share.share_title,
      shareDescription: share.share_description,
      accessType: share.access_type,
      expiresAt: share.expires_at,
      otpEnabled: share.otp_enabled,
      watermarkEnabled: share.watermark_enabled,
      allowDownload: share.allow_download,
      active: share.is_active,
      createdAt: share.created_at,
      views: share.view_count,
      downloadCount: share.download_count,
      lastAccessed: share.last_accessed,
      accessLog: share.access_log || [],
      securityFlags: share.security_flags || {},
    }));
  }

  async getShareByToken(token: string): Promise<SharedPortfolioLink | null> {
    try {
      const response = await this.apiCall(`/portfolio/${token}`);
      
      return {
        id: response.token,
        portfolioId: response.portfolio?.id || '',
        token: response.token,
        shareTitle: response.share_title,
        shareDescription: response.share_description,
        accessType: response.access_type,
        expiresAt: response.expires_at,
        otpEnabled: response.otp_required || false,
        watermarkEnabled: response.watermark_enabled,
        allowDownload: response.allow_download,
        active: true,
        createdAt: response.created_at,
        views: response.view_count,
        downloadCount: response.download_count,
        lastAccessed: response.last_accessed,
        accessLog: response.access_log || [],
        securityFlags: response.security_flags || {},
        portfolio: response.portfolio || null,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async verifyPassword(token: string, password: string): Promise<boolean> {
    const response = await this.apiCall('/portfolio/verify-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });

    return response.verified;
  }

  async sendOTP(token: string): Promise<{ otpCode?: string; expiresAt: string }> {
    const response = await this.apiCall(`/portfolio/send-otp`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    return {
      otpCode: response.otp_code, // Remove in production
      expiresAt: response.otp_expires_at,
    };
  }

  async verifyOTP(token: string, otpCode: string): Promise<boolean> {
    const response = await this.apiCall('/portfolio/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ token, otp_code: otpCode }),
    });

    return response.verified;
  }

  async revokeShare(token: string, userId: string): Promise<boolean> {
    try {
      await this.apiCall(`/portfolio/${token}?user_id=${userId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Failed to revoke share:', error);
      return false;
    }
  }

  async updateShare(
    token: string, 
    userId: string, 
    updates: Partial<PortfolioShareConfig>
  ): Promise<SharedPortfolioLink | null> {
    try {
      await this.apiCall(`/portfolio/${token}`, {
        method: 'PUT',
        body: JSON.stringify({
          user_id: userId,
          share_title: updates.shareTitle,
          share_description: updates.shareDescription,
          access_type: updates.accessType,
          expiry_hours: updates.expiryHours,
          password: updates.password,
          otp_enabled: updates.otpEnabled,
          watermark_enabled: updates.watermarkEnabled,
          allow_download: updates.allowDownload,
        }),
      });

      // Return updated share by fetching it again
      return await this.getShareByToken(token);
    } catch (error) {
      console.error('Failed to update share:', error);
      return null;
    }
  }

  async logAccess(token: string, ipAddress: string, userAgent: string): Promise<void> {
    try {
      await this.apiCall('/portfolio/log-access', {
        method: 'POST',
        body: JSON.stringify({
          token,
          ip_address: ipAddress,
          user_agent: userAgent,
        }),
      });
    } catch (error) {
      console.error('Failed to log access:', error);
      // Don't throw error for logging failures
    }
  }

  async getShareAnalytics(token: string): Promise<ShareAnalytics | null> {
    try {
      const share = await this.getShareByToken(token);
      if (!share) return null;

      return {
        viewCount: share.views,
        downloadCount: share.downloadCount || 0,
        lastAccessed: share.lastAccessed || share.createdAt,
        lastIp: share.securityFlags?.last_ip,
        lastDevice: share.securityFlags?.last_device,
        lastBrowser: share.securityFlags?.last_browser,
        accessLog: share.accessLog || [],
      };
    } catch (error) {
      console.error('Failed to get analytics:', error);
      return null;
    }
  }
}

export const shareService: ShareService = new ShareServiceImpl();

// Utility functions for share link generation
export const generateShareUrl = (token: string, baseUrl?: string): string => {
  const base = baseUrl || window.location.origin;
  return `${base}/shared/portfolio/${token}`;
};

export const isShareValid = (share: SharedPortfolioLink): boolean => {
  if (!share.active) return false;
  if (share.accessType === 'one-time' && share.views > 0) return false;
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) return false;
  return true;
};

export const getShareExpiryTime = (hours: number): string => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry.toISOString();
};

// Client-side utility for getting user IP (fallback)
export const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get client IP:', error);
    return 'unknown';
  }
};
