type RegisterPayload = {
  userId: string;
  deviceToken: string;
  webauthn?: unknown;
  faceEmbedding?: number[] | null;
};

type AuthUserRecord = {
  userId: string;
  deviceToken: string;
  webauthn?: unknown;
  faceEmbedding?: number[] | null;
  tempCode?: string;
};

type AuthStore = {
  users: Record<string, AuthUserRecord>;
};

const STORE_KEY = "biovault_auth_store_v1";

function apiBase(): string {
  return (import.meta.env.VITE_API_URL || "").trim();
}

const FORCE_REMOTE = String(import.meta.env.VITE_FORCE_REMOTE || "").toLowerCase() === "true";

function shouldUseRemoteApi(): boolean {
  const base = apiBase();
  if (FORCE_REMOTE) return true; // enforce remote-only when requested
  if (!base) return false;
  const lower = base.toLowerCase();
  if (lower.includes("localhost") || lower.includes("127.0.0.1")) return false;
  return true;
}

function loadStore(): AuthStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { users: {} };
    const parsed = JSON.parse(raw) as AuthStore;
    if (!parsed || typeof parsed !== "object" || !parsed.users) {
      return { users: {} };
    }
    return parsed;
  } catch {
    return { users: {} };
  }
}

function saveStore(store: AuthStore): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function upsertLocalUser(payload: RegisterPayload): { tempCode: string } {
  const store = loadStore();
  const tempCode = String(Math.floor(100000 + Math.random() * 900000));
  store.users[payload.userId] = {
    userId: payload.userId,
    deviceToken: payload.deviceToken,
    webauthn: payload.webauthn,
    faceEmbedding: payload.faceEmbedding ?? null,
    tempCode,
  };
  saveStore(store);
  return { tempCode };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (!denom) return 0;
  return dot / denom;
}

export async function registerUser(payload: RegisterPayload): Promise<{ ok: true; tempCode?: string; mode: "remote" | "local" }> {
  if (shouldUseRemoteApi()) {
    const resp = await fetch(`${apiBase()}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await resp.json().catch(() => ({}))) as { error?: string; tempCode?: string };
    if (resp.ok) {
      return { ok: true, tempCode: data.tempCode, mode: "remote" };
    }
    return { ok: false, tempCode: undefined, mode: "remote" };
  }

  const result = upsertLocalUser(payload);
  return { ok: true, tempCode: result.tempCode, mode: "local" };
}

export async function validateUser(userId: string, deviceToken: string): Promise<{ authorized: boolean; reason?: string; mode: "remote" | "local" }> {
  if (shouldUseRemoteApi()) {
    const resp = await fetch(`${apiBase()}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, deviceToken }),
    });
    const data = (await resp.json().catch(() => ({}))) as { authorized?: boolean; reason?: string };
    if (resp.ok && data.authorized) return { authorized: true, mode: "remote" };
    return { authorized: false, reason: data.reason || `User not authorized (${resp.status})`, mode: "remote" };
  }

  const user = loadStore().users[userId];
  if (!user) return { authorized: false, reason: "User not registered", mode: "local" };
  if (user.deviceToken !== deviceToken) return { authorized: false, reason: "Device mismatch", mode: "local" };
  return { authorized: true, mode: "local" };
}

export async function verifyFace(userId: string, embedding: number[]): Promise<{ ok: boolean; match: boolean; score: number; token?: string; refreshToken?: string; reason?: string; mode: "remote" | "local" }> {
  if (shouldUseRemoteApi()) {
    const resp = await fetch(`${apiBase()}/api/face/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, embedding }),
    });
    const data = (await resp.json().catch(() => ({}))) as {
      ok?: boolean;
      match?: boolean;
      score?: number;
      token?: string;
      refreshToken?: string;
      reason?: string;
    };
    if (resp.ok && data.ok && data.match) {
      return {
        ok: true,
        match: true,
        score: data.score || 0,
        token: data.token,
        refreshToken: data.refreshToken,
        mode: "remote",
      };
    }
    return {
      ok: false,
      match: false,
      score: data.score || 0,
      reason: data.reason || "Face authentication failed",
      mode: "remote",
    };
  }

  const user = loadStore().users[userId];
  if (!user) return { ok: false, match: false, score: 0, reason: "User not registered", mode: "local" };
  if (!user.faceEmbedding || !user.faceEmbedding.length) {
    return { ok: false, match: false, score: 0, reason: "Face profile not enrolled", mode: "local" };
  }

  const score = cosineSimilarity(user.faceEmbedding, embedding);
  const match = score >= 0.78;
  if (!match) {
    return { ok: false, match: false, score, reason: "Face mismatch", mode: "local" };
  }

  return {
    ok: true,
    match: true,
    score,
    token: `local-token-${Date.now()}`,
    refreshToken: `local-refresh-${Date.now()}`,
    mode: "local",
  };
}

export async function requestTempCode(userId: string): Promise<{ ok: boolean; tempCode?: string; reason?: string; mode: "remote" | "local" }> {
  if (shouldUseRemoteApi()) {
    const resp = await fetch(`${apiBase()}/api/temp-code/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = (await resp.json().catch(() => ({}))) as { tempCode?: string; reason?: string };
    if (resp.ok && data.tempCode) return { ok: true, tempCode: data.tempCode, mode: "remote" };
    return { ok: false, reason: data.reason || "Could not issue temp code", mode: "remote" };
  }

  const store = loadStore();
  const user = store.users[userId];
  if (!user) return { ok: false, reason: "User not registered", mode: "local" };
  const tempCode = String(Math.floor(100000 + Math.random() * 900000));
  user.tempCode = tempCode;
  saveStore(store);
  return { ok: true, tempCode, mode: "local" };
}

export async function verifyTempCode(userId: string, code: string): Promise<{ ok: boolean; reason?: string; mode: "remote" | "local" }> {
  if (shouldUseRemoteApi()) {
    const resp = await fetch(`${apiBase()}/api/temp-code/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code }),
    });
    const data = (await resp.json().catch(() => ({}))) as { ok?: boolean; reason?: string };
    if (resp.ok && data.ok) return { ok: true, mode: "remote" };
    return { ok: false, reason: data.reason || "Invalid temp code", mode: "remote" };
  }

  const user = loadStore().users[userId];
  if (!user) return { ok: false, reason: "User not registered", mode: "local" };
  if (!user.tempCode) return { ok: false, reason: "No temp code issued", mode: "local" };
  if (user.tempCode !== code) return { ok: false, reason: "Invalid temp code", mode: "local" };
  return { ok: true, mode: "local" };
}

export async function rebindDevice(userId: string, deviceToken: string): Promise<{ ok: boolean; reason?: string; mode: "remote" | "local" }> {
  if (shouldUseRemoteApi()) {
    const resp = await fetch(`${apiBase()}/api/device/rebind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, deviceToken }),
    });
    const data = (await resp.json().catch(() => ({}))) as { ok?: boolean; reason?: string };
    if (resp.ok && data.ok) return { ok: true, mode: "remote" };
    return { ok: false, reason: data.reason || "Device update failed", mode: "remote" };
  }

  const store = loadStore();
  const user = store.users[userId];
  if (!user) return { ok: false, reason: "User not registered", mode: "local" };
  user.deviceToken = deviceToken;
  saveStore(store);
  return { ok: true, mode: "local" };
}
