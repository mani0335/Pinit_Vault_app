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
        console.log('🔐 [ProtectedRoute] ============ TOKEN VERIFICATION STARTING ============');
        
        // Add longer delay to ensure storage has been written
        // This needs to be longer because FaceScanner also waits 300ms before callback
        await new Promise(resolve => setTimeout(resolve, 400));
        console.log('🔐 [ProtectedRoute] Storage wait complete');
        
        // Check both storages
        let token = null;
        let source = '';
        
        try {
          token = await appStorage.getItem("biovault_token");
          if (token) {
            console.log('✅ [ProtectedRoute] Token found in appStorage:', token.substring(0, 50) + '...');
            source = 'appStorage';
          } else {
            console.log('⚠️ [ProtectedRoute] appStorage.getItem returned null/empty for biovault_token');
          }
        } catch (err) {
          console.warn('⚠️ [ProtectedRoute] appStorage.getItem failed:', err);
          token = null;
        }
        
        if (!token) {
          console.log('📍 [ProtectedRoute] appStorage check failed, checking localStorage...');
          token = localStorage.getItem("biovault_token");
          if (token) {
            console.log('✅ [ProtectedRoute] Token found in localStorage:', token.substring(0, 50) + '...');
            source = 'localStorage';
          } else {
            console.log('❌ [ProtectedRoute] No token in localStorage either');
          }
        }
        
        console.log('🔐 [ProtectedRoute] Final token status:', {
          hasToken: !!token,
          source,
          tokenLength: token ? token.length : 0,
          firstChars: token ? token.substring(0, 20) : 'N/A'
        });
        
        // Also verify userId exists
        let userId = null;
        try {
          userId = await appStorage.getItem("biovault_userId");
          if (!userId) {
            userId = localStorage.getItem("biovault_userId");
          }
        } catch (err) {
          console.warn('⚠️ [ProtectedRoute] Error checking userId:', err);
        }
        
        console.log('🔐 [ProtectedRoute] Final verification status:', {
          hasToken: !!token,
          hasUserId: !!userId,
          source,
          tokenLength: token ? token.length : 0,
          userId: userId ? userId.substring(0, 15) + '...' : 'N/A'
        });
        
        if (token && userId) {
          console.log("✅✅✅ [ProtectedRoute] AUTHORIZED! Token and userId verified from:", source);
          console.log("🎉 [ProtectedRoute] Rendering Dashboard");
          setState("authorized");
        } else if (!token) {
          console.log("❌❌❌ [ProtectedRoute] No token found anywhere - UNAUTHORIZED");
          console.log("🔄 [ProtectedRoute] Redirecting to login");
          setState("unauthorized");
        } else if (!userId) {
          console.log("❌❌❌ [ProtectedRoute] No userId found - UNAUTHORIZED");
          console.log("🔄 [ProtectedRoute] Redirecting to login");
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
          <p className="text-cyan-400 text-sm font-mono">🔐 Verifying authentication...</p>
          <p className="text-slate-500 text-xs mt-2">(Checking auth credentials from storage...)</p>
        </div>
      </div>
    );
  }

  console.log('🚀 [ProtectedRoute] state:', state, '- rendering:', state === "authorized" ? "✅ Dashboard" : "❌ Redirect to login");
  return state === "authorized" ? children : <Navigate to="/login" replace />;
}
