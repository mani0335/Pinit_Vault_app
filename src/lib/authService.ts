import { data } from "@tensorflow/tfjs";

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
  // Use Render FastAPI backend - actual deployed URL
  return (import.meta.env.VITE_API_URL || "https://biovault-backend-4xec.onrender.com").trim();
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
  console.log('🔐 registerUser: Calling', `${apiUrl}/auth/biometric-register`);
  console.log('📦 Payload:', { 
    userId: payload.userId, 
    deviceToken: payload.deviceToken, 
    webauthn: payload.webauthn ? '✓ present' : 'null',
    faceEmbedding: payload.faceEmbedding ? `✓ [${payload.faceEmbedding.length} dims]` : 'null'
  });
  
  try {
    const resp = await fetch(`${apiUrl}/auth/biometric-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    const responseText = await resp.text();
    console.log('📥 Response status:', resp.status, 'length:', responseText.length);
    console.log('📥 Response preview:', responseText.substring(0, 300));
    
    let data;
    try {
      data = JSON.parse(responseText) as { error?: string; tempCode?: string; ok?: boolean; message?: string };
      console.log('✅ JSON parsed:', data);
    } catch (parseErr: any) {
      console.error('❌ JSON parse failed:', parseErr.message);
      throw new Error(`Failed to parse server response: ${parseErr.message}`);
    }
    
    if (!resp.ok) {
      throw new Error(data.message || data.error || `Registration failed (${resp.status})`);
    }
    
    return { ok: true, tempCode: data.tempCode, mode: "remote" };
  } catch (fetchErr: any) {
    console.error('❌ Network error during registration:', fetchErr.message);
    console.error('❌ Backend URL:', apiUrl);
    console.error('❌ Is backend reachable? Check Render dashboard');
    // Re-throw with more context
    throw new Error(`Failed to register: ${fetchErr.message}. Backend: ${apiUrl}`);
  }
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
    console.log('🔐 verifyFace: Calling', `${apiUrl}/auth/verify-face`);
    const resp = await fetch(`${apiUrl}/auth/verify-face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, faceEmbedding: embedding }),
    });
    
    // Must use .text() then parse to catch HTML responses
    const responseText = await resp.text();
    console.log('📥 Response status:', resp.status, 'length:', responseText.length);
    console.log('📥 First 200 chars:', responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText) as {
        verified?: boolean;
        similarity?: number;
        message?: string;
        userId?: string;
      };
      console.log('✅ JSON parsed:', data);
    } catch (parseErr: any) {
      console.error('❌ JSON parse failed:', parseErr.message);
      console.error('❌ Response starts with:', responseText.substring(0, 50));
      return { ok: false, match: false, score: 0, reason: `Server error: ${parseErr.message}`, mode: "remote" };
    }
    
    if (resp.ok && data.verified) {
      return {
        ok: true,
        match: true,
        score: data.similarity || 0,
        token: `bearer-${Date.now()}`,
        refreshToken: `refresh-${Date.now()}`,
        mode: "remote",
      };
    }
    return {
      ok: false,
      match: false,
      score: data.similarity || 0,
      reason: data.message || "Face authentication failed",
      mode: "remote",
    };
  }

  const user = loadStore().users[userId];
  if (!user) return { ok: false, match: false, score: 0, reason: "User not registered", mode: "local" };
  if (!user.faceEmbedding || !user.faceEmbedding.length) {
    return { ok: false, match: false, score: 0, reason: "Face profile not enrolled", mode: "local" };
  }

  const score = cosineSimilarity(user.faceEmbedding, embedding);
  const match = score >= 0.70; // 70% similarity threshold (backend default)
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
  const apiUrl = apiBase();
  
  let lastError: any = null;
  
  // Retry logic for resilience
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔐 checkUserRegistered (attempt ${attempt}/${retries}): Calling ${apiUrl}/api/user/check`);
      const resp = await fetch(`${apiUrl}/api/user/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId
        })
      });
      
      const responseText = await resp.text();
      console.log(`📥 Response status: ${resp.status}`);
      
      let result;
      try {
        result = JSON.parse(responseText) as { ok?: boolean; reason?: string; fingerprintRegistered?: boolean; faceRegistered?: boolean };
        console.log('✅ JSON parsed:', result);
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
        lastError = new Error(result.reason || `Check failed (${resp.status})`);
        console.warn(`⚠️  Check failed on attempt ${attempt}: ${lastError.message}`);
        
        // Retry on network/server errors
        if (attempt < retries && resp.status >= 500) {
          console.log(`⏳ Server error, retrying after 1 second...`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        throw lastError;
      }
      
      if (!result.ok) {
        lastError = new Error(result.reason || 'User check failed');
        console.warn(`⚠️  User check failed on attempt ${attempt}: ${lastError.message}`);
        
        // Retry on "user not found" as MongoDB might not be synced yet
        if (attempt < retries && result.reason?.includes('not found')) {
          console.log(`⏳ User not immediately found, retrying after 1 second...`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        throw lastError;
      }
      
      console.log('✅ User registration check passed');
      return {
        ok: true,
        fingerprintRegistered: result.fingerprintRegistered ?? false,
        faceRegistered: result.faceRegistered ?? false,
        mode: "remote"
      };
    } catch (err: any) {
      lastError = err;
      console.error(`❌ Error on attempt ${attempt}:`, err.message);
      if (attempt < retries) {
        console.log(`⏳ Retrying after 1 second...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  
  console.error('❌ User check failed after all retries:', lastError?.message);
  throw lastError;
}


// ── New Backend Verification Endpoints ────────────────────────────────────────

export async function verifyFingerprintBackend(userId: string, webauthn?: any): Promise<{ 
  verified: boolean; 
  userId: string | null; 
  message: string;
  userRecord?: any;
  mode: "remote";
}> {
  const apiUrl = apiBase();
  console.log('🔐 verifyFingerprintBackend: Calling', `${apiUrl}/auth/verify-fingerprint`);
  
  try {
    const resp = await fetch(`${apiUrl}/auth/verify-fingerprint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        userId,
        webauthn: webauthn || null
      }),
    });
    
    const responseText = await resp.text();
    console.log('📥 Fingerprint verify response status:', resp.status);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ Fingerprint response:', data);
    } catch (parseErr: any) {
      console.error('❌ JSON parse failed:', parseErr.message);
      return { 
        verified: false, 
        userId: null, 
        message: `Server error: ${parseErr.message}`,
        mode: "remote"
      };
    }
    
    return {
      verified: data.verified || false,
      userId: data.userId || null,
      message: data.message || "Verification failed",
      userRecord: data.userRecord,
      mode: "remote"
    };
  } catch (err: any) {
    console.error('❌ Fingerprint verification error:', err.message);
    return {
      verified: false,
      userId: null,
      message: `Network error: ${err.message}`,
      mode: "remote"
    };
  }
}


export async function verifyFaceBackend(faceEmbedding: number[], userId?: string): Promise<{
  verified: boolean;
  userId: string | null;
  message: string;
  similarity: number;
  mode: "remote";
}> {
  const apiUrl = apiBase();
  const endpoint = `${apiUrl}/auth/verify-face`;
  
  console.log('🔐 verifyFaceBackend: Calling', endpoint, 'userId:', userId || 'any user');
  
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        faceEmbedding,
        userId: userId || null
      }),
    });
    
    const responseText = await resp.text();
    console.log('📥 Face verify response status:', resp.status);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ Face response:', data);
    } catch (parseErr: any) {
      console.error('❌ JSON parse failed:', parseErr.message);
      return {
        verified: false,
        userId: null,
        message: `Server error: ${parseErr.message}`,
        similarity: 0,
        mode: "remote"
      };
    }
    
    return {
      verified: data.verified || false,
      userId: data.userId || null,
      message: data.message || "Face verification failed",
      similarity: data.similarity || 0,
      mode: "remote"
    };
  } catch (err: any) {
    console.error('❌ Face verification error:', err.message);
    return {
      verified: false,
      userId: null,
      message: `Network error: ${err.message}`,
      similarity: 0,
      mode: "remote"
    };
  }
}
