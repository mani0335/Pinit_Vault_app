import type { Portfolio, CreatePortfolioInput, PortfolioAccessLog } from "../types/Portfolio";

const API_BASE =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_BACKEND_URL ||
  "https://biovault-backend-d13a.onrender.com";

// ============================================================================
// TYPES
// ============================================================================

export interface PortfolioShareOptions {
  portfolioId: string;
  expiryHours?: number | null;
  viewOnly: boolean;
  allowedSections?: string[] | null;
  viewLimit?: number | null;
  watermark: boolean;
  watermarkText?: string;
  screenshotProtection: boolean;
  allowedCountries?: string[] | null;
  allowedCities?: string[] | null;
  deviceBound: boolean;
  password?: string;
  accessMode?: 'public' | 'link_only' | 'invite_only' | 'private';
  allowedEmails?: string[] | null;
  allowedUsernames?: string[] | null;
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
    accessMode?: string;
    allowedEmails?: string[];
    allowedUsernames?: string[];
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

  // 45-second timeout — backend may take time to process even when running
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(`${API_BASE}/portfolio/get-portfolios`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ user_id: userId }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!response.ok) throw new Error(`Failed to load portfolios: ${response.status}`);
    const data = await response.json();
    return data.portfolios || [];
  } catch (e: unknown) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("aborted") || msg.includes("AbortError")) {
      throw new Error("SERVER_TIMEOUT");
    }
    // Throw so PortfolioHome's catch block handles it without wiping the cache
    throw e;
  }
}

export async function createPortfolio(
  userId: string,
  data: CreatePortfolioInput,
  onProgress?: (attempt: number, total: number) => void
): Promise<Portfolio> {
  const MAX_ATTEMPTS = 3;
  const TIMEOUT_MS   = 45_000;

  const body = JSON.stringify({
    user_id:  userId,
    name:     data.name,
    type:     data.type,
    sections: JSON.stringify(data.sections),
    template: data.template ?? null,
    status:   data.status || "active",
  });

  let lastError: Error = new Error("Failed to create portfolio");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    onProgress?.(attempt, MAX_ATTEMPTS);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE}/portfolio/create-portfolio`, {
        method: "POST",
        headers: authHeaders(),
        body,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${response.status}`);
      }

      const result = await response.json();
      const created: Portfolio = result.portfolio;

      // Immediately update the local cache so the portfolio listing shows it
      // before the next background fetch completes.
      try {
        const key = `biovault_portfolios_cache_${userId}`;
        const cached: Portfolio[] = JSON.parse(localStorage.getItem(key) || '[]');
        cached.unshift(created);
        localStorage.setItem(key, JSON.stringify(cached));
      } catch { /* ignore storage errors */ }

      return created;
    } catch (e: unknown) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message : String(e);
      lastError = new Error(msg.includes("aborted") || msg.includes("AbortError")
        ? "Request timed out — server may be starting up"
        : msg);

      if (attempt < MAX_ATTEMPTS) {
        // Brief pause then retry — gives sleeping Render instance time to wake up
        await new Promise(r => setTimeout(r, 4_000));
      }
    }
  }

  throw lastError;
}

export async function getPortfolioById(userId: string, id: string): Promise<Portfolio | null> {
  // Check local cache first — works offline and for optimistic portfolios
  try {
    const cacheKey = `biovault_portfolios_cache_${userId}`;
    const cached: Portfolio[] = JSON.parse(localStorage.getItem(cacheKey) || '[]');
    const local = cached.find(p => p.id === id);
    if (local) return local;
  } catch { /* ignore */ }

  // Fall back to fresh API fetch
  try {
    const portfolios = await loadPortfolios(userId);
    return portfolios.find((p) => p.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function updatePortfolio(
  userId: string,
  id: string,
  data: Partial<Portfolio>
): Promise<Portfolio | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${API_BASE}/portfolio/update-portfolio`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        portfolio_id: id,
        user_id: userId,
        ...data,
        sections: data.sections ? JSON.stringify(data.sections) : undefined,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update portfolio: ${response.status}`);
    }
    const result = await response.json();

    // Update local cache
    try {
      const key = `biovault_portfolios_cache_${userId}`;
      const cached: Portfolio[] = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = cached.findIndex(p => p.id === id);
      if (idx !== -1 && result.portfolio) cached[idx] = result.portfolio;
      localStorage.setItem(key, JSON.stringify(cached));
    } catch { /* ignore */ }

    return result.portfolio;
  } catch (e: unknown) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(msg.includes("aborted") ? "Request timed out — please retry" : msg);
  }
}

export async function deletePortfolio(userId: string, id: string): Promise<boolean> {
  // Optimistic-only portfolios (temp IDs) exist only in cache — skip backend call.
  if (id.startsWith('local_')) {
    try {
      const key = `biovault_portfolios_cache_${userId}`;
      const cached: Portfolio[] = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify(cached.filter(p => p.id !== id)));
    } catch { /* ignore */ }
    return true;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${API_BASE}/portfolio/delete-portfolio`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ portfolio_id: id, user_id: userId }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`Failed to delete portfolio: ${response.status}`);

    // Remove from local cache immediately
    try {
      const key = `biovault_portfolios_cache_${userId}`;
      const cached: Portfolio[] = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify(cached.filter(p => p.id !== id)));
    } catch { /* ignore */ }

    return true;
  } catch (e: unknown) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(msg.includes("aborted") ? "Request timed out — please retry" : msg);
  }
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
      access_mode: options.accessMode || 'link_only',
      allowed_emails: options.allowedEmails ?? null,
      allowed_usernames: options.allowedUsernames ?? null,
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

export async function pingBackend(): Promise<void> {
  try {
    await fetch(`${API_BASE}/health`, { method: "GET" });
  } catch {
    // silently ignore
  }
}
