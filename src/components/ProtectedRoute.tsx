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
      if (!token) {
        const refreshed = await tryRefresh();
        setState(refreshed ? "authorized" : "unauthorized");
        return;
      }

      try {
        const API_BASE = (import.meta.env.VITE_API_URL || "https://biovault-app.onrender.com").trim();
        const resp = await fetch(`${API_BASE}/api/session/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!resp.ok) {
          const refreshed = await tryRefresh();
          setState(refreshed ? "authorized" : "unauthorized");
          return;
        }

        setState("authorized");
      } catch {
        const refreshed = await tryRefresh();
        setState(refreshed ? "authorized" : "unauthorized");
      }
    };

    const tryRefresh = async () => {
      const refreshToken = localStorage.getItem("biovault_refresh_token");
      if (!refreshToken) {
        localStorage.removeItem("biovault_token");
        localStorage.removeItem("biovault_refresh_token");
        return false;
      }

      try {
        const API_BASE = (import.meta.env.VITE_API_URL || "https://biovault-app.onrender.com").trim();
        const resp = await fetch(`${API_BASE}/api/session/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!resp.ok) {
          localStorage.removeItem("biovault_token");
          localStorage.removeItem("biovault_refresh_token");
          return false;
        }
        
        const responseText = await resp.text();
        let data;
        try {
          data = JSON.parse(responseText) as { token?: string };
        } catch (parseErr: any) {
          console.error('❌ Session refresh: JSON parse failed:', parseErr.message);
          localStorage.removeItem("biovault_token");
          localStorage.removeItem("biovault_refresh_token");
          return false;
        }
        
        if (!data?.token) {
          localStorage.removeItem("biovault_token");
          localStorage.removeItem("biovault_refresh_token");
          return false;
        }
        localStorage.setItem("biovault_token", data.token);
        return true;
      } catch {
        localStorage.removeItem("biovault_token");
        localStorage.removeItem("biovault_refresh_token");
        return false;
      }
    };

    verify();
  }, []);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono text-sm">
        Verifying session...
      </div>
    );
  }

  if (state === "unauthorized") {
    return <Navigate to="/login" replace />;
  }

  return children;
}
