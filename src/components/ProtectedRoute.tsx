import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { appStorage } from "@/lib/storage";

interface ProtectedRouteProps {
  children: JSX.Element;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [state, setState] = useState<"checking" | "authorized" | "unauthorized" | "error">("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      try {
        console.log('🔐 [ProtectedRoute] Starting token verification...');
        
        // 🔐 FIXED: Check BOTH appStorage (Android) AND localStorage (Web)
        let tokenFromAppStorage = null;
        try {
          tokenFromAppStorage = await appStorage.getItem("biovault_token");
          console.log('✅ [ProtectedRoute] appStorage check done:', !!tokenFromAppStorage);
        } catch (appErr) {
          console.warn('⚠️ [ProtectedRoute] appStorage failed:', appErr);
        }
        
        const tokenFromLocalStorage = localStorage.getItem("biovault_token");
        console.log('✅ [ProtectedRoute] localStorage check done:', !!tokenFromLocalStorage);
        
        const token = tokenFromAppStorage || tokenFromLocalStorage;
        
        if (token) {
          console.log("✅ [ProtectedRoute] Token found - authorized to access dashboard");
          setState("authorized");
          return;
        }
        
        console.log("ℹ️ [ProtectedRoute] No access token, checking refresh token...");
        
        // Try to use refresh token to get a new access token
        let refreshTokenAppStorage = null;
        try {
          refreshTokenAppStorage = await appStorage.getItem("biovault_refresh_token");
        } catch (refreshErr) {
          console.warn('⚠️ [ProtectedRoute] Refresh token appStorage check failed:', refreshErr);
        }
        
        const refreshTokenLocalStorage = localStorage.getItem("biovault_refresh_token");
        const refreshToken = refreshTokenAppStorage || refreshTokenLocalStorage;
        
        if (refreshToken) {
          console.log("🔄 [ProtectedRoute] No access token, but refresh token exists - redirecting to login for refresh");
          setState("unauthorized");
          return;
        }
        
        console.log("❌ [ProtectedRoute] No tokens found in either storage - not authorized");
        setState("unauthorized");
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('❌ [ProtectedRoute] Verification error:', errMsg, err);
        setError(errMsg);
        setState("error");
      }
    };

    verify();
  }, []);

  if (state === "checking") {
    console.log('📊 [ProtectedRoute] Showing checking/loading screen...');
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
        <p className="text-cyan-400 font-mono text-sm">Verifying authentication...</p>
        <p className="text-slate-500 text-xs mt-2">(Checking storage...)</p>
      </div>
    </div>;
  }

  if (state === "error") {
    console.error('⚠️ [ProtectedRoute] Error state, showing error screen');
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      <div className="text-center px-4">
        <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-500 mx-auto mb-4 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-red-400 font-bold mb-2">Verification Error</p>
        <p className="text-xs text-slate-400 mb-6 max-w-xs">{error || 'Unknown error during authentication check'}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white text-sm font-mono"
        >
          Retry
        </button>
      </div>
    </div>;
  }

  console.log('✅ [ProtectedRoute] Authorization state:', state);
  return state === "authorized" ? children : <Navigate to="/login" replace />;
}
