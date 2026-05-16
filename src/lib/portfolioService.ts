import type { Portfolio, CreatePortfolioInput, PortfolioAccessLog } from "../types/Portfolio";

const API_BASE =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_BACKEND_URL ||
  "https://biovault-backend-d13a.onrender.com";

// ============================================================================
// TYPES
// ============================================================================

export interface PortfolioShareOptions {
  portfolioId: string;
  expiryHours?: number | null;      // null = no expiry
  viewOnly: boolean;
  allowedSections?: string[] | null; // null = all sections
  viewLimit?: number | null;         // null = unlimited
  watermark: boolean;
  watermarkText?: string;
  screenshotProtection: boolean;
  allowedCountries?: string[] | null;
  allowedCities?: string[] | null;
  deviceBound: boolean;
  password?: string;
}

export interface PortfolioShareResult {
  token: string;
  shareLink: string;
  expiresAt: string | null;
}

export interface SharedPortfolioData {
  portfolio: Portfolio;
  documents: Record<string, unknown>;
  shareSettings: {
    viewOnly: boolean;
    watermark: boolean;
    watermarkText?: string;
    screenshotProtection: boolean;
    requiresPassword: boolean;
    deviceBound: boolean;
    viewLimit?: number;
    viewsUsed: number;
    expiresAt?: string;
    allowedSections?: string[];
  };
}

export interface PortfolioShare {
  token: string;
  portfolioId: string;
  shareLink: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  viewOnly: boolean;
  viewLimit?: number;
  viewsUsed: number;
  watermark: boolean;
  revokedAt?: string;
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

function getAuthToken(): string | null {
  return localStorage.getItem("biovault_token");
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ============================================================================
// PORTFOLIO CRUD
// ============================================================================

export async function loadPortfolios(userId: string): Promise<Portfolio[]> {
  if (!userId) return [];

  try {
    const response = await fetch(`${API_BASE}/portfolio/get-portfolios`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) throw new Error(`Failed to load portfolios: ${response.status}`);
    const data = await response.json();
    return data.portfolios || [];
  } catch (e) {
    console.error("Failed to load portfolios:", e);
    return [];
  }
}

export async function createPortfolio(userId: string, data: CreatePortfolioInput): Promise<Portfolio> {
  const response = await fetch(`${API_BASE}/portfolio/create-portfolio`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      user_id: userId,
      name: data.name,
      type: data.type,
      sections: JSON.stringify(data.sections),
      template: data.template,
      status: data.status || "active",
    }),
  });

  if (!response.ok) throw new Error(`Failed to create portfolio: ${response.status}`);
  const result = await response.json();
  return result.portfolio;
}

export async function getPortfolioById(userId: string, id: string): Promise<Portfolio | null> {
  const portfolios = await loadPortfolios(userId);
  return portfolios.find((p) => p.id === id) ?? null;
}

export async function updatePortfolio(
  userId: string,
  id: string,
  data: Partial<Portfolio>
): Promise<Portfolio | null> {
  const response = await fetch(`${API_BASE}/portfolio/update-portfolio`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      portfolio_id: id,
      user_id: userId,
      ...data,
      sections: data.sections ? JSON.stringify(data.sections) : undefined,
    }),
  });

  if (!response.ok) throw new Error(`Failed to update portfolio: ${response.status}`);
  const result = await response.json();
  return result.portfolio;
}

export async function deletePortfolio(userId: string, id: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/portfolio/delete-portfolio`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ portfolio_id: id, user_id: userId }),
  });

  if (!response.ok) throw new Error(`Failed to delete portfolio: ${response.status}`);
  return true;
}

export async function incrementPortfolioViews(userId: string, id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/portfolio/increment-views`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ portfolio_id: id, user_id: userId }),
    });
  } catch (e) {
    console.error("Failed to increment views:", e);
  }
}

// ============================================================================
// ADVANCED SHARING
// ============================================================================

export async function generatePortfolioShare(
  options: PortfolioShareOptions
): Promise<PortfolioShareResult> {
  const baseUrl =
    (import.meta as unknown as { env: Record<string, string> }).env?.VITE_PUBLIC_URL ||
    window.location.origin;

  const response = await fetch(`${API_BASE}/portfolio/generate-share-token`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      portfolio_id: options.portfolioId,
      expiry_hours: options.expiryHours ?? null,
      view_only: options.viewOnly,
      allowed_sections: options.allowedSections ?? null,
      view_limit: options.viewLimit ?? null,
      watermark: options.watermark,
      watermark_text: options.watermarkText || null,
      screenshot_protection: options.screenshotProtection,
      allowed_countries: options.allowedCountries ?? null,
      allowed_cities: options.allowedCities ?? null,
      device_bound: options.deviceBound,
      password: options.password || null,
      base_url: baseUrl,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Share generation failed: ${response.status}`);
  }

  const result = await response.json();
  return {
    token: result.token,
    shareLink: result.shareLink,
    expiresAt: result.expiresAt ?? null,
  };
}

export async function revokePortfolioShare(portfolioId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/portfolio/revoke-share`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ portfolio_id: portfolioId, token }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to revoke share");
  }
}

export async function getPortfolioShares(portfolioId: string): Promise<PortfolioShare[]> {
  try {
    const response = await fetch(`${API_BASE}/portfolio/get-portfolio-shares/${portfolioId}`, {
      headers: authHeaders(),
    });
    if (!response.ok) return [];
    const result = await response.json();
    return (result.shares || []) as PortfolioShare[];
  } catch {
    return [];
  }
}

export async function getSharedPortfolio(token: string): Promise<SharedPortfolioData> {
  const response = await fetch(`${API_BASE}/portfolio/share-public/${token}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Share not accessible: ${response.status}`);
  }
  return response.json();
}

export async function verifySharePassword(token: string, password: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/portfolio/verify-share-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.verified === true;
  } catch {
    return false;
  }
}

// Keep legacy function for backward compatibility
export async function generateShareToken(
  userId: string,
  portfolioId: string,
  expiryHours = 24
): Promise<string> {
  const result = await generatePortfolioShare({
    portfolioId,
    expiryHours,
    viewOnly: true,
    watermark: false,
    screenshotProtection: false,
    deviceBound: false,
  });
  return result.token;
}

// ============================================================================
// ACCESS LOGGING
// ============================================================================

export async function logPortfolioAccess(
  userId: string,
  portfolioId: string,
  action: PortfolioAccessLog["action"]
): Promise<void> {
  try {
    await fetch(`${API_BASE}/portfolio/log-access`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        portfolio_id: portfolioId,
        user_id: userId,
        action,
        device: navigator.userAgent.includes("Mobile") ? "Mobile" : "Desktop",
        user_agent: navigator.userAgent,
      }),
    });
  } catch (e) {
    console.error("Failed to log access:", e);
  }
}

export async function getPortfolioAccessLogs(
  userId: string,
  portfolioId: string
): Promise<PortfolioAccessLog[]> {
  try {
    const response = await fetch(`${API_BASE}/portfolio/get-access-logs`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ portfolio_id: portfolioId, user_id: userId }),
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.logs || [];
  } catch {
    return [];
  }
}

export async function clearPortfolios(_userId: string): Promise<void> {
  // Portfolios are stored in backend
}
