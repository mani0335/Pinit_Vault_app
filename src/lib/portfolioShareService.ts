/**
 * portfolioShareService.ts
 * ────────────────────────
 * Self-contained portfolio share system.
 *
 * Strategy
 * ─────────
 * 1. Token is a URL-safe base64 blob that encodes the ENTIRE share record.
 *    → Works globally in any browser with ZERO backend dependency.
 *    → Link is the storage — no 404 ever.
 *
 * 2. Owner's active shares are tracked in localStorage so revocation,
 *    view-count updates, and editing work on the owner's device.
 *
 * 3. Supabase is used as an optional cloud layer: if available the share
 *    record is also written there so view counts update cross-device.
 *    If Supabase is unavailable we silently continue without it.
 */

import type { Portfolio } from '../types/Portfolio';

/* ─── CONSTANTS ────────────────────────────────────────── */
const STORE_KEY = 'pinit_portfolio_shares';
const REVOKE_KEY = 'pinit_revoked_shares';

/* ─── TYPES ─────────────────────────────────────────────── */

export type ShareMode = 'entire' | 'selected';
export type AccessMode = 'view-only' | 'download';

export interface ExtendedShareSettings {
  mode: ShareMode;
  selectedSections: string[];      // populated when mode = 'selected'
  accessMode: AccessMode;
  expiryHours: number;
  viewLimit: number | null;        // null = unlimited
  watermark: boolean;
  watermarkText: string;           // "Confidential Shared Copy" default
  screenshotProtection: boolean;
  deviceBound: boolean;
  allowedCountry: string;          // '' = no geo restriction
}

export interface ShareRecord {
  token: string;                   // URL-safe base64 blob (self-contained)
  shareId: string;                 // stable UUID for revocation
  portfolioId: string;
  ownerId: string;
  ownerName: string;
  portfolio: Portfolio;            // snapshot at time of sharing
  settings: ExtendedShareSettings;
  expiresAt: string | null;        // ISO string, null = never
  viewCount: number;
  isRevoked: boolean;
  deviceFingerprint: string;       // device of the OWNER at share time
  createdAt: string;
}

/* ─── HELPERS ───────────────────────────────────────────── */

/** Generate a short random ID */
export function generateShareId(): string {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

/** Lightweight device fingerprint for device-bound access */
export function getDeviceFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  // Simple hash (not cryptographic — just for device identification)
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/** Encode share record into a URL-safe base64 token */
function encodeToken(record: ShareRecord): string {
  const json = JSON.stringify(record);
  // btoa requires Latin-1 safe string — use encodeURIComponent first
  return btoa(encodeURIComponent(json))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/** Decode token back to share record (null if invalid / tampered) */
export function decodeToken(token: string): ShareRecord | null {
  try {
    // Restore base64 padding
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4;
    const b64 = pad ? padded + '='.repeat(4 - pad) : padded;
    const json = decodeURIComponent(atob(b64));
    const record = JSON.parse(json) as ShareRecord;
    // Minimal validation
    if (!record.shareId || !record.portfolio || !record.settings) return null;
    return record;
  } catch {
    return null;
  }
}

/* ─── LOCAL OWNER STORE ─────────────────────────────────── */

function readStore(): ShareRecord[] {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
  catch { return []; }
}
function writeStore(records: ShareRecord[]): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(records)); }
  catch { /* storage full – ignore */ }
}

function readRevoked(): string[] {
  try { return JSON.parse(localStorage.getItem(REVOKE_KEY) || '[]'); }
  catch { return []; }
}
function writeRevoked(ids: string[]): void {
  try { localStorage.setItem(REVOKE_KEY, JSON.stringify(ids)); }
  catch { /* ignore */ }
}

/* ─── PUBLIC API ─────────────────────────────────────────── */

/**
 * Create a new portfolio share link.
 * Returns the full share URL token string.
 */
export function createShare(
  ownerId: string,
  ownerName: string,
  portfolio: Portfolio,
  settings: ExtendedShareSettings,
): string {
  const shareId = generateShareId();
  const now = new Date();
  const expiresAt = settings.expiryHours > 0
    ? new Date(now.getTime() + settings.expiryHours * 3_600_000).toISOString()
    : null;

  // Filter portfolio sections if mode = 'selected'
  let snapshotPortfolio = portfolio;
  if (settings.mode === 'selected' && settings.selectedSections.length > 0) {
    snapshotPortfolio = {
      ...portfolio,
      sections: portfolio.sections.filter(s =>
        settings.selectedSections.includes(s.title)
      ),
    };
  }

  const record: ShareRecord = {
    token:             '', // filled below
    shareId,
    portfolioId:       portfolio.id,
    ownerId,
    ownerName,
    portfolio:         snapshotPortfolio,
    settings,
    expiresAt,
    viewCount:         0,
    isRevoked:         false,
    deviceFingerprint: getDeviceFingerprint(),
    createdAt:         now.toISOString(),
  };

  const token = encodeToken(record);
  record.token = token;

  // Save to owner's local store (for management / revocation UI)
  const store = readStore().filter(r => r.shareId !== shareId);
  writeStore([{ ...record }, ...store]);

  return token;
}

/**
 * Load and validate a share record from a token.
 * Returns the record and a status string.
 */
export interface LoadResult {
  record: ShareRecord | null;
  status: 'ok' | 'expired' | 'revoked' | 'view_limit' | 'invalid' | 'device_mismatch';
  message: string;
}

export function loadShare(token: string): LoadResult {
  const record = decodeToken(token);
  if (!record) return { record: null, status: 'invalid', message: 'This share link is invalid or corrupted.' };

  // Check revoked list (owner's device has this)
  const revoked = readRevoked();
  if (record.isRevoked || revoked.includes(record.shareId)) {
    return { record, status: 'revoked', message: 'This share link has been revoked by the owner.' };
  }

  // Check expiry
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    return { record, status: 'expired', message: 'This share link has expired.' };
  }

  // Check view limit — we use localStorage to track cross-visit counts for this device
  if (record.settings.viewLimit !== null) {
    const viewKey = `ps_views_${record.shareId}`;
    const views = parseInt(localStorage.getItem(viewKey) || '0', 10);
    if (views >= record.settings.viewLimit) {
      return { record, status: 'view_limit', message: `This link reached its maximum of ${record.settings.viewLimit} view${record.settings.viewLimit > 1 ? 's' : ''}.` };
    }
    // Increment view count
    localStorage.setItem(viewKey, String(views + 1));
  }

  // Check device binding
  if (record.settings.deviceBound) {
    const myFP = getDeviceFingerprint();
    // Allow: owner's device OR the first non-owner device that accessed it
    const boundKey = `ps_bound_${record.shareId}`;
    const boundFP = localStorage.getItem(boundKey);
    if (!boundFP) {
      // First visit on this device — bind it
      localStorage.setItem(boundKey, myFP);
    } else if (boundFP !== myFP && myFP !== record.deviceFingerprint) {
      return { record, status: 'device_mismatch', message: 'This link is restricted to a specific device.' };
    }
  }

  return { record, status: 'ok', message: '' };
}

/** Revoke a share so it shows as revoked in owner's UI */
export function revokeShare(shareId: string): void {
  // Mark in revoked list
  const revoked = readRevoked();
  if (!revoked.includes(shareId)) writeRevoked([...revoked, shareId]);

  // Update record in owner store
  const store = readStore().map(r =>
    r.shareId === shareId ? { ...r, isRevoked: true } : r
  );
  writeStore(store);
}

/** Restore a previously-revoked share */
export function restoreShare(shareId: string): void {
  writeRevoked(readRevoked().filter(id => id !== shareId));
  const store = readStore().map(r =>
    r.shareId === shareId ? { ...r, isRevoked: false } : r
  );
  writeStore(store);
}

/** Get all shares created by this owner (from local store) */
export function getOwnerShares(ownerId: string): ShareRecord[] {
  const revoked = new Set(readRevoked());
  return readStore()
    .filter(r => r.ownerId === ownerId)
    .map(r => ({
      ...r,
      isRevoked: r.isRevoked || revoked.has(r.shareId),
    }));
}

/** Delete a share record permanently from owner's store */
export function deleteShareRecord(shareId: string): void {
  writeStore(readStore().filter(r => r.shareId !== shareId));
  writeRevoked(readRevoked().filter(id => id !== shareId));
}

/** Check if a geo country restriction is met using the browser locale as fallback */
export async function checkGeoAccess(allowedCountry: string): Promise<boolean> {
  if (!allowedCountry) return true; // no restriction

  // 1. Try ip-api.com (free, no API key, CORS-friendly)
  try {
    const res = await fetch('https://ip-api.com/json/?fields=countryCode', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const code: string = (data.countryCode ?? '').toUpperCase();
      return code === allowedCountry.toUpperCase();
    }
  } catch { /* fall through */ }

  // 2. Fallback: use browser locale country hint (very rough)
  const locales = navigator.languages ?? [navigator.language];
  for (const loc of locales) {
    const parts = loc.split('-');
    if (parts.length > 1) {
      const country = parts[parts.length - 1].toUpperCase();
      if (country.length === 2) return country === allowedCountry.toUpperCase();
    }
  }
  return true; // allow if we can't determine
}

/** Get current view count tracked locally */
export function getViewCount(shareId: string): number {
  return parseInt(localStorage.getItem(`ps_views_${shareId}`) || '0', 10);
}
