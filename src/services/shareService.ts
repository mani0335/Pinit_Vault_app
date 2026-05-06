import { Preferences } from "@capacitor/preferences";
import { PortfolioShareConfig, SharedPortfolioLink, ShareAnalytics } from "../types/portfolioBuilder";
import { API_CONFIG, buildApiUrl, buildPublicUrl } from "../config/api";

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
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
  return `${baseUrl}/shared/portfolio/${token}`;
};

export const getClientIP = async (): Promise<string> => {
  try {
    // Try to get IP from a public API
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    console.warn('Failed to get client IP:', error);
    // Fallback to a default value or try alternative method
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch (fallbackError) {
      console.warn('Fallback IP detection also failed:', fallbackError);
      return 'unknown';
    }
  }
};

// Portfolio storage key helper
const getKey = async (): Promise<string> => {
  const { value } = await Preferences.get({ key: 'biovault_userId' });
  return `portfolios_${value}`;
};

class ShareServiceImpl implements ShareService {
  private readonly API_BASE = 'http://127.0.0.1:8000';
  private readonly SHARE_API = `${this.API_BASE}/portfolio-shares/portfolio`;

  private async apiCall(url: string, options: RequestInit = {}): Promise<any> {
    const fullUrl = url.startsWith('http') ? url : `${this.SHARE_API}${url}`;
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
      console.error(`💥 API Error (${url}):`, error);
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

    console.log("📤 Sending request to:", `${this.SHARE_API}/create`);
    console.log("📤 Request payload:", payload);

    const response = await this.apiCall('/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    console.log("📥 API Response received:", response);
    console.log("FULL SHARE RESPONSE:", response);
    console.log("RESPONSE DATA:", response.data);

    // Extract token safely with multiple fallback options
    const token = 
      response?.share_token ||
      response?.token ||
      response?.data?.share_token ||
      response?.data?.token ||
      response?.share?.token;

    // Extract share_url directly from backend if available
    const generatedUrl = 
      response?.share_url ||
      response?.data?.share_url ||
      (token ? `${window.location.origin}/shared/portfolio/${token}` : null);

    console.log("🔍 EXTRACTED VALUES:");
    console.log("Token:", token);
    console.log("Generated URL:", generatedUrl);

    // Validate extracted values
    if (!token) {
      console.error("❌ No token found in backend response");
      throw new Error("Invalid share response: missing token");
    }

    if (!generatedUrl || generatedUrl.includes("undefined")) {
      console.error("❌ Invalid share URL generated:", generatedUrl);
      throw new Error("Invalid share URL generated");
    }

    const result = {
      id: token,
      portfolioId,
      token: token,
      shareUrl: generatedUrl, // Use backend URL directly
      shareTitle: response?.share_title || config.shareTitle,
      shareDescription: response?.share_description || config.shareDescription,
      accessType: response?.access_type || config.accessType,
      expiresAt: response?.expires_at,
      otpEnabled: response?.otp_enabled || config.otpEnabled,
      watermarkEnabled: config.watermarkEnabled,
      allowDownload: config.allowDownload,
      active: true,
      createdAt: response?.created_at || new Date().toISOString(),
      views: 0,
    };

    console.log("✅ Share created successfully");
    console.log("✅ Token extracted:", token);
    console.log("✅ Valid share URL generated:", generatedUrl);
    console.log("🔄 Returning from shareService.createShare:", result);
    return result;
  }

  async getShares(userId: string, portfolioId?: string): Promise<SharedPortfolioLink[]> {
    const endpoint = portfolioId
      ? `/user/${userId}?portfolio_id=${portfolioId}`
      : `/user/${userId}`;
    
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
    console.log(`🔍 shareService.getShareByToken called with token: ${token}`);
    
    const response = await this.apiCall(`/${token}`);
    
    console.log(`📥 getShareByToken API response:`, response);
    
    if (!response || !response.success) {
      console.log(`❌ No valid response for token: ${token}`);
      return null;
    }

    // Handle new response format with share and portfolio objects
    const shareData = response.share;
    const portfolioData = response.portfolio;
    
    console.log(`🔍 Extracted share data:`, shareData);
    console.log(`🔍 Extracted portfolio data:`, portfolioData);

    const result = {
      id: shareData.token,
      portfolioId: portfolioData?.id || 'unknown', // Will be populated when portfolio is available
      token: shareData.token,
      shareTitle: shareData.share_title,
      shareDescription: shareData.share_description,
      accessType: shareData.access_type,
      expiresAt: shareData.expires_at,
      otpEnabled: shareData.otp_required,
      watermarkEnabled: shareData.watermark_enabled,
      allowDownload: shareData.allow_download,
      active: true, // Always active when retrieved
      createdAt: shareData.created_at,
      views: shareData.view_count || 0,
      portfolio: portfolioData, // Include portfolio data for display
      passwordRequired: shareData.password_required,
      storageType: shareData.storage_type
    };

    console.log(`✅ Share retrieved successfully: ${token}`);
    console.log(`✅ Portfolio loaded: ${portfolioData?.id || 'None (requires auth)'}`);
    console.log(`✅ Documents loaded: ${portfolioData?.documents?.length || 0}`);
    console.log(`🔄 Returning from getShareByToken:`, result);
    
    return result;
  }

  async verifyPassword(token: string, password: string): Promise<boolean> {
    console.log(`🔐 shareService.verifyPassword called with token: ${token}, password: ${'*'.repeat(password.length)}`);
    
    const response = await this.apiCall('/verify-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });

    console.log(`📥 Password verification response:`, response);
    
    if (!response || !response.success) {
      console.log(`❌ Password verification failed: ${response?.detail || 'Unknown error'}`);
      return false;
    }
    
    const verified = response.verified;
    console.log(`✅ Password verification result: ${verified}`);
    
    if (verified) {
      console.log(`✅ Password verified successfully`);
      console.log(`✅ Authorization granted`);
      console.log(`✅ Shared portfolio fetched: ${response.portfolio?.id || 'None'}`);
      console.log(`✅ Documents rendered: ${response.portfolio?.documents?.length || 0}`);
    }
    
    return verified;
  }

  async sendOTP(token: string): Promise<{ otpCode?: string; expiresAt: string }> {
    const response = await this.apiCall('/send-otp', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    return {
      otpCode: response.otp_code,
      expiresAt: response.otp_expires_at,
    };
  }

  async verifyOTP(token: string, otpCode: string): Promise<boolean> {
    const response = await this.apiCall('/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ token, otpCode }),
    });

    return response.valid || false;
  }

  async revokeShare(token: string, userId: string): Promise<boolean> {
    const response = await this.apiCall(`/${token}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });

    return response.success || false;
  }

  async updateShare(token: string, userId: string, updates: Partial<PortfolioShareConfig>): Promise<SharedPortfolioLink | null> {
    const response = await this.apiCall(`/${token}`, {
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
    await this.apiCall('/log-access', {
      method: 'POST',
      body: JSON.stringify({ 
        token, 
        ip_address: ipAddress, 
        user_agent: userAgent 
      }),
    });
  }

  async getShareAnalytics(token: string): Promise<ShareAnalytics | null> {
    const response = await this.apiCall(`/${token}/analytics`);
    
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
