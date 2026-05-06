import { Preferences } from "@capacitor/preferences";
import { PortfolioShareConfig, SharedPortfolioLink, ShareAnalytics } from "../types/portfolioBuilder";

export interface ShareService {
  createShare(portfolioId: string, config: PortfolioShareConfig, userId: string): Promise<SharedPortfolioLink>;
  getShares(userId: string, portfolioId?: string): Promise<SharedPortfolioLink[]>;
  getShareByToken(token: string): Promise<SharedPortfolioLink | null>;
  verifyPassword(token: string, password: string): Promise<boolean>;
  sendOTP(token: string): Promise<{ otpCode?: string; expiresAt: string }>;
  verifyOTP(token: string, otpCode: string): Promise<boolean>;
  revokeShare(token: string, userId: string): Promise<boolean>;
  updateShare(token: string, userId: string, updates: Partial<PortfolioShareConfig>): Promise<SharedPortfolioLink | null>;
  logAccess(token: string, ipAddress: string, userAgent: string): Promise<void>;
  getShareAnalytics(token: string): Promise<ShareAnalytics | null>;
}

export const generateShareUrl = (token: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/shared/portfolio/${token}`;
};

// Portfolio storage key helper
const getKey = async (): Promise<string> => {
  const { value } = await Preferences.get({ key: 'biovault_userId' });
  return `portfolios_${value}`;
};

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
    const fullUrl = `${this.API_BASE}/portfolio-shares${endpoint}`;
    console.log(`🌐 Making API call to: ${fullUrl}`);
    console.log(`🔧 Request options:`, options);
    
    try {
      const response = await fetch(fullUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);
      console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error(`❌ API Error Response:`, error);
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ API Response Data:`, data);
      return data;
    } catch (error) {
      console.error(`💥 API Error (${endpoint}):`, error);
      console.error(`💥 Full error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      throw error;
    }
  }

  async createShare(
    portfolioId: string, 
    config: PortfolioShareConfig,
    userId: string
  ): Promise<SharedPortfolioLink> {
    console.log("🔧 shareService.createShare called with:", {
      portfolioId,
      config,
      userId,
      apiBase: this.API_BASE
    });

    const payload = {
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
    };

    console.log("📤 Sending request to:", `${this.API_BASE}/portfolio-shares/portfolio/create`);
    console.log("📤 Request payload:", payload);

    // FIXED: Remove leading slash from endpoint
    const response = await this.apiCall('portfolio/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    console.log("📥 API Response received:", response);

    const result = {
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

    console.log("🔄 Returning from shareService.createShare:", result);
    return result;
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
      views: share.view_count || 0,
    }));
  }

  async getShareByToken(token: string): Promise<SharedPortfolioLink | null> {
    const response = await this.apiCall(`/portfolio/${token}`);
    
    if (!response) {
      return null;
    }

    return {
      id: response.token,
      portfolioId: response.portfolio_id,
      token: response.token,
      shareTitle: response.share_title,
      shareDescription: response.share_description,
      accessType: response.access_type,
      expiresAt: response.expires_at,
      otpEnabled: response.otp_enabled,
      watermarkEnabled: response.watermark_enabled,
      allowDownload: response.allow_download,
      active: response.is_active,
      createdAt: response.created_at,
      views: response.view_count || 0,
      portfolio: response.portfolio // Include portfolio data for display
    };
  }

  async verifyPassword(token: string, password: string): Promise<boolean> {
    const response = await this.apiCall('/portfolio/verify-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });

    return response.valid || false;
  }

  async sendOTP(token: string): Promise<{ otpCode?: string; expiresAt: string }> {
    const response = await this.apiCall('/portfolio/send-otp', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    return {
      otpCode: response.otp_code,
      expiresAt: response.otp_expires_at,
    };
  }

  async verifyOTP(token: string, otpCode: string): Promise<boolean> {
    const response = await this.apiCall('/portfolio/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ token, otpCode }),
    });

    return response.valid || false;
  }

  async revokeShare(token: string, userId: string): Promise<boolean> {
    const response = await this.apiCall(`/portfolio/${token}`, {
      method: 'DELETE',
      body: JSON.stringify({ user_id: userId }),
    });

    return response.success || false;
  }

  async updateShare(token: string, userId: string, updates: Partial<PortfolioShareConfig>): Promise<SharedPortfolioLink | null> {
    const response = await this.apiCall(`/portfolio/${token}`, {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId, ...updates }),
    });

    if (!response) {
      return null;
    }

    return {
      id: response.token,
      portfolioId: response.portfolio_id,
      token: response.token,
      shareTitle: response.share_title,
      shareDescription: response.share_description,
      accessType: response.access_type,
      expiresAt: response.expires_at,
      otpEnabled: response.otp_enabled,
      watermarkEnabled: response.watermark_enabled,
      allowDownload: response.allow_download,
      active: response.is_active,
      createdAt: response.created_at,
      views: response.view_count || 0,
    };
  }

  async logAccess(token: string, ipAddress: string, userAgent: string): Promise<void> {
    await this.apiCall('/portfolio/log-access', {
      method: 'POST',
      body: JSON.stringify({ 
        token, 
        ip_address: ipAddress, 
        user_agent: userAgent 
      }),
    });
  }

  async getShareAnalytics(token: string): Promise<ShareAnalytics | null> {
    const response = await this.apiCall(`/portfolio/${token}/analytics`);
    
    if (!response) {
      return null;
    }

    return {
      totalViews: response.total_views || 0,
      uniqueVisitors: response.unique_visitors || 0,
      averageViewDuration: response.average_view_duration || 0,
      devices: response.devices || [],
      browsers: response.browsers || [],
      accessLog: response.access_log || [],
    };
  }
}

export const shareService = new ShareServiceImpl();
