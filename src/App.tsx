import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BiometricInitializer } from "@/components/BiometricInitializer";
import { Component, ReactNode, useState } from "react";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import BiometricOptions from "./pages/BiometricOptions.tsx";
import Register from "./pages/Register.tsx";
import TempAccessFace from "./pages/TempAccessFace.tsx";
import TempAccess from "./pages/TempAccess.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import DocumentHub from "./pages/DocumentHub.tsx";
import ProfileAdvanced from "./pages/ProfileAdvanced.tsx";
import ProfileModern from "./pages/ProfileModern.tsx";
import UploadPage from "./pages/UploadPage.tsx";
import ScanDocumentFlow from "./pages/ScanDocumentFlow.tsx";
import ReviewPage from "./pages/ReviewPage.tsx";
import UploadFromDevice from "./pages/UploadFromDevice.tsx";
import VaultPage from "./pages/VaultPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import { SharedImageViewer } from "./components/SharedImageViewer.tsx";

// ===================== GLOBAL ERROR BOUNDARY =====================
// This catches ANY error in the entire app and displays it on screen
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("🔴 [GLOBAL ERROR BOUNDARY] CRITICAL APP ERROR:", error);
    console.error("Error Info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: "100%",
            height: "100vh",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            fontFamily: "monospace",
            overflow: "auto",
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              textAlign: "center",
              backgroundColor: "#1e293b",
              padding: "30px",
              borderRadius: "12px",
              border: "2px solid #ef4444",
            }}
          >
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#f87171",
                margin: "0 0 20px 0",
              }}
            >
              🔴 CRITICAL APP ERROR
            </h1>

            <p
              style={{
                fontSize: "14px",
                marginBottom: "20px",
                color: "#cbd5e1",
              }}
            >
              The application encountered a fatal error and could not continue.
            </p>

            <div
              style={{
                backgroundColor: "#0f172a",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px",
                textAlign: "left",
                maxHeight: "300px",
                overflowY: "auto",
                fontSize: "12px",
                color: "#fca5a5",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                border: "1px solid #7f1d1d",
              }}
            >
              <strong>Error Message:</strong>
              <br />
              {this.state.error?.message || "Unknown error"}
              <br />
              <br />
              <strong>Stack Trace:</strong>
              <br />
              {this.state.error?.stack || "No stack trace available"}
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#06b6d4",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Reload App
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("biovault_token");
                  localStorage.removeItem("biovault_userId");
                  window.location.href = "/login";
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#8b5cf6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Go to Login
              </button>
            </div>

            <p
              style={{
                fontSize: "11px",
                color: "#64748b",
                marginTop: "20px",
              }}
            >
              This error has been logged to the console for debugging.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const queryClient = new QueryClient();

// Document Upload Flow Component
function DocumentUploadFlow() {
  const [currentStep, setCurrentStep] = useState<
    "upload" | "scan" | "review" | "upload-device"
  >("upload");
  const [scannedPages, setScannedPages] = useState<string[]>([]);

  const handleStartScan = () => {
    setCurrentStep("scan");
  };

  const handleStartUpload = () => {
    setCurrentStep("upload-device");
  };

  const handleScanSuccess = (pages: string[]) => {
    setScannedPages(pages);
    setCurrentStep("review");
  };

  const handleReviewSuccess = () => {
    // Navigate back to dashboard or vault
    window.location.hash = "/dashboard";
  };

  const handleUploadSuccess = () => {
    // Navigate to vault
    window.location.hash = "/vault";
  };

  const handleBack = () => {
    if (currentStep === "scan" || currentStep === "upload-device") {
      setCurrentStep("upload");
    } else if (currentStep === "review") {
      setCurrentStep("scan");
      setScannedPages([]);
    } else {
      setCurrentStep("upload");
      setScannedPages([]);
    }
  };

  return (
    <>
      {currentStep === "upload" && (
        <UploadPage
          onSelectScan={handleStartScan}
          onSelectUpload={handleStartUpload}
          onBack={() => (window.location.hash = "/dashboard")}
        />
      )}
      {currentStep === "scan" && (
        <ScanDocumentFlow
          onSuccess={handleScanSuccess}
          onBack={handleBack}
        />
      )}
      {currentStep === "review" && (
        <ReviewPage
          pages={scannedPages}
          onBack={handleBack}
          onSuccess={handleReviewSuccess}
        />
      )}
      {currentStep === "upload-device" && (
        <UploadFromDevice
          onBack={handleBack}
          onSuccess={handleUploadSuccess}
        />
      )}
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BiometricInitializer />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/biometric-options" element={<BiometricOptions />} />
            <Route path="/register" element={<Register />} />
            <Route path="/temp-access-face" element={<TempAccessFace />} />
            <Route path="/temp-access" element={<TempAccess />} />
            <Route path="/share/:token" element={<SharedImageViewer />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <DocumentHub />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <DocumentUploadFlow />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vault"
              element={
                <ProtectedRoute>
                  <VaultPage onBack={() => (window.location.hash = "/dashboard")} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfileModern />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
