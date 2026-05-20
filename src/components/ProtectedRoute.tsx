import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { appStorage } from "@/lib/storage";

interface ProtectedRouteProps {
  children: JSX.Element;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  // ── Fast synchronous check via localStorage ──────────────────────────────
  // On web / PWA, localStorage always has the tokens (Login.tsx writes to both).
  // This avoids a 400 ms "checking" flash on every protected route transition.
  const _syncToken  = localStorage.getItem("biovault_token");
  const _syncUserId = localStorage.getItem("biovault_userId");
  const syncAuthorized = !!(_syncToken && _syncUserId);

  const [state, setState] = useState<"checking" | "authorized" | "unauthorized">(
    syncAuthorized ? "authorized" : "checking"
  );

  useEffect(() => {
    // Already verified via localStorage — no async check needed
    if (syncAuthorized) return;

    const verify = async () => {
      try {
        console.log('🔐 [ProtectedRoute] ============ TOKEN VERIFICATION STARTING ============');

        // Small delay so Capacitor Preferences finish flushing after login
        await new Promise(resolve => setTimeout(resolve, 400));
        console.log('🔐 [ProtectedRoute] Storage wait complete');

        // ── Check appStorage (Capacitor Preferences on Android) ──────────────
        let token: string | null = null;
        let userId: string | null = null;
        let source = '';

        try {
          token  = await appStorage.getItem("biovault_token");
          userId = await appStorage.getItem("biovault_userId");
          if (token && userId) {
            source = 'appStorage';
            console.log('✅ [ProtectedRoute] Token + userId found in appStorage');
            // Mirror to localStorage so future navigations are instant
            localStorage.setItem("biovault_token",  token);
            localStorage.setItem("biovault_userId", userId);
          } else {
            console.log('⚠️ [ProtectedRoute] appStorage returned null — checking localStorage');
          }
        } catch (err) {
          console.warn('⚠️ [ProtectedRoute] appStorage.getItem failed:', err);
        }

        // ── Fallback to localStorage (always, not just on error) ─────────────
        if (!token)  token  = localStorage.getItem("biovault_token");
        if (!userId) userId = localStorage.getItem("biovault_userId");
        if (!source && token && userId) source = 'localStorage';

        console.log('🔐 [ProtectedRoute] Final verification:', {
          hasToken: !!token,
          hasUserId: !!userId,
          source,
        });

        if (token && userId) {
          console.log("✅✅✅ [ProtectedRoute] AUTHORIZED from:", source);
          setState("authorized");
        } else {
          console.log("❌❌❌ [ProtectedRoute] No valid credentials — redirecting to login");
          setState("unauthorized");
        }
      } catch (err) {
        console.error('❌ [ProtectedRoute] Verification error:', err);
        setState("unauthorized");
      }
    };

    verify();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === "checking") {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-cyan-400 text-sm font-mono">🔐 Verifying authentication...</p>
          <p className="text-slate-500 text-xs mt-2">(Checking auth credentials from storage...)</p>
        </div>
      </div>
    );
  }

  console.log('🚀 [ProtectedRoute] state:', state, '- rendering:', state === "authorized" ? "✅ Dashboard" : "❌ Redirect to login");
  return state === "authorized" ? children : <Navigate to="/login" replace />;
}
