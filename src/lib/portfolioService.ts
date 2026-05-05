import type { Portfolio, CreatePortfolioInput, PortfolioAccessLog } from "../types/Portfolio";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "https://biovault-backend-d13a.onrender.com";

/**
 * Get auth token from storage
 */
async function getAuthToken(): Promise<string | null> {
  const token = localStorage.getItem("biovault_token");
  return token;
}

/**
 * Load portfolios from backend API
 */
export async function loadPortfolios(userId: string): Promise<Portfolio[]> {
  if (!userId) {
    console.warn("⚠️ No userId provided, cannot load portfolios");
    return [];
  }

  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/portfolio/get-portfolios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ user_id: userId })
    });

    if (!response.ok) {
      throw new Error(`Failed to load portfolios: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Loaded portfolios from backend for user: ${userId}`);
    return data.portfolios || [];
  } catch (e) {
    console.error("Failed to load portfolios from backend:", e);
    return [];
  }
}

/**
 * Create a new portfolio via backend API
 */
export async function createPortfolio(userId: string, data: CreatePortfolioInput): Promise<Portfolio> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/portfolio/create-portfolio`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: userId,
        name: data.name,
        type: data.type,
        sections: JSON.stringify(data.sections),
        template: data.template,
        status: data.status || 'active'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create portfolio: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Portfolio created:", result.portfolio);
    return result.portfolio;
  } catch (e) {
    console.error("Failed to create portfolio:", e);
    throw e;
  }
}

/**
 * Get portfolio by ID via backend API
 */
export async function getPortfolioById(userId: string, id: string): Promise<Portfolio | null> {
  const portfolios = await loadPortfolios(userId);
  const portfolio = portfolios.find(p => p.id === id);
  return portfolio || null;
}

/**
 * Update portfolio via backend API
 */
export async function updatePortfolio(userId: string, id: string, data: Partial<Portfolio>): Promise<Portfolio | null> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/portfolio/update-portfolio`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        portfolio_id: id,
        user_id: userId,
        ...data,
        sections: data.sections ? JSON.stringify(data.sections) : undefined
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update portfolio: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Portfolio updated:", result.portfolio);
    return result.portfolio;
  } catch (e) {
    console.error("Failed to update portfolio:", e);
    throw e;
  }
}

/**
 * Delete portfolio via backend API
 */
export async function deletePortfolio(userId: string, id: string): Promise<boolean> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/portfolio/delete-portfolio`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        portfolio_id: id,
        user_id: userId
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to delete portfolio: ${response.status}`);
    }

    console.log("✅ Portfolio deleted:", id);
    return true;
  } catch (e) {
    console.error("Failed to delete portfolio:", e);
    throw e;
  }
}

/**
 * Increment portfolio view count via backend API
 */
export async function incrementPortfolioViews(userId: string, id: string): Promise<void> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/portfolio/increment-views`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        portfolio_id: id,
        user_id: userId
      })
    });

    if (!response.ok) {
      console.warn("Failed to increment views:", response.status);
    }
  } catch (e) {
    console.error("Failed to increment views:", e);
  }
}

/**
 * Generate share token for portfolio
 */
export async function generateShareToken(userId: string, portfolioId: string, expiryHours: number = 24): Promise<string> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/portfolio/generate-share-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        portfolio_id: portfolioId,
        user_id: userId,
        expiry_hours: expiryHours
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to generate share token: ${response.status}`);
    }

    const result = await response.json();
    return result.shareToken;
  } catch (e) {
    console.error("Failed to generate share token:", e);
    throw e;
  }
}

/**
 * Log portfolio access
 */
export async function logPortfolioAccess(userId: string, portfolioId: string, action: PortfolioAccessLog['action']): Promise<void> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/portfolio/log-access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        portfolio_id: portfolioId,
        user_id: userId,
        action,
        device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
        user_agent: navigator.userAgent
      })
    });

    if (!response.ok) {
      console.warn("Failed to log access:", response.status);
    }
  } catch (e) {
    console.error("Failed to log access:", e);
  }
}

/**
 * Get portfolio access logs
 */
export async function getPortfolioAccessLogs(userId: string, portfolioId: string): Promise<PortfolioAccessLog[]> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/portfolio/get-access-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        portfolio_id: portfolioId,
        user_id: userId
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get access logs: ${response.status}`);
    }

    const result = await response.json();
    return result.logs || [];
  } catch (e) {
    console.error("Failed to get access logs:", e);
    return [];
  }
}

/**
 * Clear all portfolios for a user (local cache only)
 */
export async function clearPortfolios(userId: string): Promise<void> {
  // Portfolios are stored in backend, no local clearing needed
  console.log("ℹ️ Portfolios stored in backend, no local cache to clear");
}
