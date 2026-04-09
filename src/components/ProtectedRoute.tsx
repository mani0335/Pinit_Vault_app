import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { appStorage } from "@/lib/storage";

interface ProtectedRouteProps {
  children: JSX.Element;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [state, setState] = useState<"checking" | "authorized" | "unauthorized">("checking");

  useEffect(() => {
    const verify = async () => {
      try {
        console.log('🔐 [ProtectedRoute] Verifying token...');
        
        // Check both storages
        let token = null;
        try {
          token = await appStorage.getItem("biovault_token");
          if (token) console.log('✅ [ProtectedRoute] Token found in appStorage');
        } catch (err) {
          console.warn('⚠️ [ProtectedRoute] appStorage failed, trying localStorage');
          token = localStorage.getItem("biovault_token");
          if (token) console.log('✅ [ProtectedRoute] Token found in localStorage');
        }
        
        if (token) {
          console.log("✅ [ProtectedRoute] AUTHORIZED - setting state to authorized");
          setState("authorized");
        } else {
          console.log("❌ [ProtectedRoute] No token - UNAUTHORIZED");
          setState("unauthorized");
        }
      } catch (err) {
        console.error('❌ [ProtectedRoute] Verification error:', err);
        setState("unauthorized");
      }
    };

    verify();
  }, []);

  if (state === "checking") {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-cyan-400 text-sm font-mono">🔐 Authenticating...</p>
          <p className="text-slate-500 text-xs mt-2">(Checking auth credentials...)</p>
        </div>
      </div>
    );
  }

  console.log('🚀 [ProtectedRoute] state:', state, '- rendering:', state === "authorized" ? "Dashboard" : "Redirect to login");
  return state === "authorized" ? children : <Navigate to="/login" replace />;
}
