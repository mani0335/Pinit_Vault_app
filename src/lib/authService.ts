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
  // Always fallback to Render URL so app works from anywhere
  return (import.meta.env.VITE_API_URL || "https://biovault-app.onrender.com").trim();
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

export async function registerUser(payload: RegisterPayload): Promise<{ ok: true; tempCode?: string; mode: "remote" }> {
  // ALWAYS use remote API - no local fallback
  const apiUrl = apiBase(); // Will always be Render URL
  console.log('🔐 registerUser: Calling', `${apiUrl}/api/register`);
  const resp = await fetch(`${apiUrl}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  
  const responseText = await resp.text();
  console.log('📥 Response status:', resp.status, 'length:', responseText.length);
  console.log('📥 First 200 chars:', responseText.substring(0, 200));
  
  let data;
  try {
    data = JSON.parse(responseText) as { error?: string; tempCode?: string };
    console.log('✅ JSON parsed:', data);
  } catch (parseErr: any) {
    console.error('❌ JSON parse failed:', parseErr.message);
    throw new Error(`Failed to parse server response: ${parseErr.message}`);
  }
  
  if (!resp.ok) {
    throw new Error(data.error || `Registration failed (${resp.status})`);
  }
  
  return { ok: true, tempCode: data.tempCode, mode: "remote" };
}

export async function validateUser(userId: string, deviceToken: string): Promise<{ authorized: boolean; reason?: string; mode: "remote" | "local" }> {
  if (shouldUseRemoteApi()) {
    const apiUrl = apiBase();
    console.log('🔐 validateUser: Calling', `${apiUrl}/api/validate`);
    const resp = await fetch(`${apiUrl}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, deviceToken }),
    });
    
    // Must use .text() then parse to catch HTML responses
    const responseText = await resp.text();
    console.log('📥 Response status:', resp.status, 'length:', responseText.length);
    console.log('📥 First 200 chars:', responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText) as { authorized?: boolean; reason?: string };
      console.log('✅ JSON parsed:', data);
    } catch (parseErr: any) {
      console.error('❌ JSON parse failed:', parseErr.message);
      console.error('❌ Response starts with:', responseText.substring(0, 50));
      return { authorized: false, reason: `Server error: ${parseErr.message}`, mode: "remote" };
    }
    
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
    const apiUrl = apiBase();
    console.log('🔐 verifyFace: Calling', `${apiUrl}/api/face/verify`);
    const resp = await fetch(`${apiUrl}/api/face/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, embedding }),
    });
    
    // Must use .text() then parse to catch HTML responses
    const responseText = await resp.text();
    console.log('📥 Response status:', resp.status, 'length:', responseText.length);
    console.log('📥 First 200 chars:', responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText) as {
        ok?: boolean;
        match?: boolean;
        score?: number;
        token?: string;
        refreshToken?: string;
        reason?: string;
      };
      console.log('✅ JSON parsed:', data);
    } catch (parseErr: any) {
      console.error('❌ JSON parse failed:', parseErr.message);
      console.error('❌ Response starts with:', responseText.substring(0, 50));
      return { ok: false, match: false, score: 0, reason: `Server error: ${parseErr.message}`, mode: "remote" };
    }
    
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
  const match = score >= 0.90; // Strict threshold: require 90%+ similarity to prevent other faces
  if (!match) {
    return { ok: false, match: false, score, reason: "Face does not match. Please ensure only YOUR face is visible.", mode: "local" };
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
    const apiUrl = apiBase();
    console.log('🔐 requestTempCode: Calling', `${apiUrl}/api/temp-code/request`);
    const resp = await fetch(`${apiUrl}/api/temp-code/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    
    const responseText = await resp.text();
    console.log('📥 Response status:', resp.status, 'length:', responseText.length);
    
    let data;
    try {
      data = JSON.parse(responseText) as { tempCode?: string; reason?: string };
      console.log('✅ JSON parsed:', data);
    } catch (parseErr: any) {
      console.error('❌ JSON parse failed:', parseErr.message);
      console.error('❌ Response starts with:', responseText.substring(0, 50));
      return { ok: false, reason: `Server error: ${parseErr.message}`, mode: "remote" };
    }
    
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
    const apiUrl = apiBase();
    console.log('🔐 verifyTempCode: Calling', `${apiUrl}/api/temp-code/verify`);
    const resp = await fetch(`${apiUrl}/api/temp-code/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code }),
    });
    
    const responseText = await resp.text();
    console.log('📥 Response status:', resp.status, 'length:', responseText.length);
    
    let data;
    try {
      data = JSON.parse(responseText) as { ok?: boolean; reason?: string };
      console.log('✅ JSON parsed:', data);
    } catch (parseErr: any) {
      console.error('❌ JSON parse failed:', parseErr.message);
      console.error('❌ Response starts with:', responseText.substring(0, 50));
      return { ok: false, reason: `Server error: ${parseErr.message}`, mode: "remote" };
    }
    
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
    const apiUrl = apiBase();
    console.log('🔐 rebindDevice: Calling', `${apiUrl}/api/device/rebind`);
    const resp = await fetch(`${apiUrl}/api/device/rebind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, deviceToken }),
    });
    
    const responseText = await resp.text();
    console.log('📥 Response status:', resp.status, 'length:', responseText.length);
    
    let data;
    try {
      data = JSON.parse(responseText) as { ok?: boolean; reason?: string };
      console.log('✅ JSON parsed:', data);
    } catch (parseErr: any) {
      console.error('❌ JSON parse failed:', parseErr.message);
      console.error('❌ Response starts with:', responseText.substring(0, 50));
      return { ok: false, reason: `Server error: ${parseErr.message}`, mode: "remote" };
    }
    
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

export async function verifyFingerprint(userId: string, credential: string): Promise<{ ok: boolean; match: boolean; reason?: string; mode: "remote" | "local" }> {
  if (shouldUseRemoteApi()) {
    const apiUrl = apiBase();
    console.log('🔐 verifyFingerprint: Calling', `${apiUrl}/api/fingerprint/verify`);
    const resp = await fetch(`${apiUrl}/api/fingerprint/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, credential }),
    });
    
    // Must use .text() then parse to catch HTML responses
    const responseText = await resp.text();
    console.log('📥 Response status:', resp.status, 'length:', responseText.length);
    console.log('📥 First 200 chars:', responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText) as { ok?: boolean; match?: boolean; reason?: string };
      console.log('✅ JSON parsed:', data);
    } catch (parseErr: any) {
      console.error('❌ JSON parse failed:', parseErr.message);
      console.error('❌ Response starts with:', responseText.substring(0, 50));
      return { ok: false, match: false, reason: `Server error: ${parseErr.message}`, mode: "remote" };
    }
    
    if (resp.ok && data.ok && data.match) {
      return { ok: true, match: true, mode: "remote" };
    }
    return { ok: false, match: false, reason: data.reason || "Fingerprint verification failed", mode: "remote" };
  }

  // Fallback to local verification
  const user = loadStore().users[userId];
  if (!user) return { ok: false, match: false, reason: "User not registered", mode: "local" };
  if (user.webauthn !== credential) {
    return { ok: false, match: false, reason: "Fingerprint does not match", mode: "local" };
  }
  return { ok: true, match: true, mode: "local" };
}

// POST /api/user/check - Check if user exists with registered fingerprint (for login)
export async function checkUserRegistered(userId: string, retries = 3): Promise<{ ok: boolean; reason?: string; fingerprintRegistered?: boolean; faceRegistered?: boolean; mode: "remote" }> {
  // ALWAYS use remote API - no local fallback
  const apiUrl = apiBase(); // Will always be Render URL
  
  let lastError: any = null;
  
  // Retry logic for resilience
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔐 checkUserRegistered (attempt ${attempt}/${retries}): Calling ${apiUrl}/api/user/check`);
      const resp = await fetch(`${apiUrl}/api/user/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      
      const responseText = await resp.text();
      console.log(`📥 Response status: ${resp.status}`);
      
      let data;
      try {
        data = JSON.parse(responseText) as { ok?: boolean; reason?: string; fingerprintRegistered?: boolean; faceRegistered?: boolean };
        console.log('✅ JSON parsed:', data);
      } catch (parseErr: any) {
        console.error('❌ JSON parse failed:', parseErr.message);
        lastError = new Error(`Failed to parse server response: ${parseErr.message}`);
        
        // Retry on parse error (might be temporary)
        if (attempt < retries) {
          console.log(`⏳ Retrying after 1 second...`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        throw lastError;
      }
      
      if (!resp.ok) {
        lastError = new Error(data.reason || `Check failed (${resp.status})`);
        console.warn(`⚠️  Check failed on attempt ${attempt}: ${lastError.message}`);
        
        // Retry on network/server errors
        if (attempt < retries && resp.status >= 500) {
          console.log(`⏳ Server error, retrying after 1 second...`);
          await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
          continue;
        }
        throw lastError;
      }
      
      if (!data.ok) {
        lastError = new Error(data.reason || 'User check failed');
        console.warn(`⚠️  User check failed on attempt ${attempt}: ${lastError.message}`);
        
        // Retry on "user not found" as MongoDB might not be synced yet
        if (attempt < retries && data.reason?.includes('not found')) {
          console.log(`⏳ User not immediately found, retrying after 1 second...`);
          await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
          continue;
        }
        throw lastError;
      }
      
      console.log('✅ User registration check passed');
      return { 
        ok: true, 
        fingerprintRegistered: data.fingerprintRegistered,
        faceRegistered: data.faceRegistered,
        mode: "remote" 
      };
    } catch (err: any) {
      lastError = err;
      console.error(`❌ Attempt ${attempt} failed:`, err.message);
      
      // Don't retry on auth errors
      if (err.message?.includes('not registered') || err.message?.includes('device mismatch')) {
        throw err;
      }
      
      // Retry on network errors
      if (attempt < retries) {
        console.log(`⏳ Retrying after ${attempt} second(s)...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
    }
  }
  
  // All retries exhausted
  throw lastError || new Error('User check failed after multiple retries');
}
