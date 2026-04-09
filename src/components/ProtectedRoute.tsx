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
      // 🔐 FIXED: Check BOTH appStorage (Android) AND localStorage (Web)
      const tokenFromAppStorage = await appStorage.getItem("biovault_token");
      const tokenFromLocalStorage = localStorage.getItem("biovault_token");
      const token = tokenFromAppStorage || tokenFromLocalStorage;
      
      if (token) {
        console.log("✅ Token found - authorized to access dashboard");
        setState("authorized");
        return;
      }
      
      // Try to use refresh token to get a new access token
      const refreshTokenAppStorage = await appStorage.getItem("biovault_refresh_token");
      const refreshTokenLocalStorage = localStorage.getItem("biovault_refresh_token");
      const refreshToken = refreshTokenAppStorage || refreshTokenLocalStorage;
      
      if (refreshToken) {
        console.log("🔄 No access token, but refresh token exists - redirecting to login for refresh");
        // Let login handle the refresh flow
        setState("unauthorized");
        return;
      }
      
      console.log("❌ No tokens found in either storage - not authorized");
      setState("unauthorized");
    };

    verify();
  }, []);

  if (state === "checking") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Authenticating...</p>
      </div>
    </div>;
  }

  return state === "authorized" ? children : <Navigate to="/login" replace />;
}
