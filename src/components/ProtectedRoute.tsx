import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: JSX.Element;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [state, setState] = useState<"checking" | "authorized" | "unauthorized">("checking");

  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem("biovault_token");
      
      if (token) {
        console.log("✅ Token found - authorized to access dashboard");
        setState("authorized");
        return;
      }
      
      // Try to use refresh token to get a new access token
      const refreshToken = localStorage.getItem("biovault_refresh_token");
      if (refreshToken) {
        console.log("🔄 No access token, but refresh token exists - redirecting to login for refresh");
        // Let login handle the refresh flow
        setState("unauthorized");
        return;
      }
      
      console.log("❌ No tokens found - not authorized");
      setState("unauthorized");
    };

    verify();
  }, []);

  if (state === "checking") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>;
  }

  return state === "authorized" ? children : <Navigate to="/login" replace />;
}
