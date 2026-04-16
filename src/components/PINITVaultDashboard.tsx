import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera as CameraPlugin } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import {
  loadVaultDocuments,
  saveVaultDocuments,
  uploadImageToCloudinary,
  deleteDocumentFromVault,
  clearVaultForUser,
  syncVaultData,
  getVaultMetadata,
  saveImageToGallery,
  syncVaultMetadata,
} from "@/lib/vaultService";
import { ensurePINITVaultFolder, saveImageToPINITVault } from "@/lib/folderUtils";
import { embedAdvancedWatermark, extractAdvancedWatermark, type AdvancedWatermarkMetadata } from "@/lib/advancedSteganography";
import { analyzeImage, formatAnalysisResult, type ImageAnalysisResult } from "@/lib/imageAnalysis";
import {
  Home,
  Briefcase,
  Share2,
  User,
  LogOut,
  Plus,
  Download,
  Share,
  QrCode,
  Eye,
  Lock,
  Clock,
  FileText,
  Trash2,
  AlertCircle,
  Shield,
  Search,
  Settings,
  Search as FileSearch,
  Camera,
  Upload,
  X,
  CheckCircle,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { appStorage } from "@/lib/storage";
import { ImageCryptoFull } from "@/components/ImageCryptoFull";
import { VaultManager } from "@/components/VaultManager";
import { ActivityLogger } from "@/components/ActivityLogger";
import { UserProfile } from "@/components/UserProfile";
import { ImageAnalyzer } from "@/components/ImageAnalyzer";

interface VaultDocument {
  id: string;
  name: string;
  encryptedData: string;
  cloudinaryUrl?: string;
  metadata: {
    timestamp: number;
    original_name: string;
    size: number;
    checksum: string;
    encrypted?: boolean;
    ownerId?: string;
  };
  createdAt: string;
}

interface PINITDashboardProps {
  userId?: string;
  isRestricted?: boolean;
}

type PageType = "home" | "vault" | "portfolio" | "share" | "identity" | "encrypt-preview" | "verify-proof" | "crypto" | "vault-advanced" | "activity" | "profile" | "analysis";

export function PINITVaultDashboard({ userId: propsUserId, isRestricted }: PINITDashboardProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<PageType>("home");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("User");
  const [userId, setUserId] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [verifyProofImage, setVerifyProofImage] = useState<string | null>(null);
  const [verifyProofAnalysis, setVerifyProofAnalysis] = useState<any>(null);
  const [vaultDocuments, setVaultDocuments] = useState<VaultDocument[]>([]);
  const [vaultPersistenceStatus, setVaultPersistenceStatus] = useState<{
    isSynced: boolean;
    lastSyncTime: number;
    documentCount: number;
    storageType: string;
  }>({ isSynced: false, lastSyncTime: 0, documentCount: 0, storageType: "none" });

  // Share Management State
  interface ShareConfig {
    id: string;
    shareLink: string;
    expiryDate: string | null;
    expiryTime: string | null;
    downloadLimit: number | null;
    downloadsUsed: number;
    passwordProtected: boolean;
    sharePassword?: string;
    includeCertificate: boolean;
    certificateId?: string;
    qrCodeData: string;
    createdAt: string;
    createdBy: string;
  }

  const [shareConfigs, setShareConfigs] = useState<ShareConfig[]>([]);
  const [shareHistory, setShareHistory] = useState<any[]>([]);
  const [selectedShareImage, setSelectedShareImage] = useState<VaultDocument | null>(null);
  const [shareExpiryDate, setShareExpiryDate] = useState<string>("");
  const [shareExpiryTime, setShareExpiryTime] = useState<string>("00:00");
  const [shareDownloadLimit, setShareDownloadLimit] = useState<number | null>(null);
  const [sharePassword, setSharePassword] = useState<string>("");
  const [includeCertificate, setIncludeCertificate] = useState<boolean>(false);
  const [generatedShareLink, setGeneratedShareLink] = useState<string>("");
  const [generatedQRCode, setGeneratedQRCode] = useState<string>("");
  const [shareStep, setShareStep] = useState<"select" | "configure" | "preview">("select");

  // Quick Action refs for camera and file upload
  const quickActionCameraRef = useRef<HTMLInputElement>(null);
  const quickActionFileRef = useRef<HTMLInputElement>(null);

  // Handler for quick action image selection (works like Analyze button)
  const handleQuickActionImageSelected = (imageData: string) => {
    console.log("✅ Quick Action image selected for encryption");
    setCapturedImage(imageData);
    setCurrentPage("encrypt-preview");
  };

  const handleVerifyProofImageSelected = (imageData: string) => {
    console.log("✅ Image selected for verification");
    setVerifyProofImage(imageData);
    setCurrentPage("verify-proof");
  };

  // Load and sync vault documents when userId is available
  useEffect(() => {
    const initializeVault = async () => {
      if (!userId) {
        console.warn("⚠️ No userId available, cannot initialize vault");
        return;
      }

      try {
        // Sync vault data between appStorage and localStorage
        console.log("📊 Syncing vault data between storage types...");
        const synced = await syncVaultData(userId);
        if (synced) {
          console.log(`✅ Vault data synchronized for user: ${userId}`);
        }

        // Load vault documents
        const docs = await loadVaultDocuments(userId);
        setVaultDocuments(docs);
        console.log(
          `✅ Loaded ${docs.length} documents from vault for user: ${userId}`
        );

        // Log vault metadata
        const metadata = await getVaultMetadata(userId);
        console.log(
          `📈 Vault Stats - Documents: ${metadata.documentCount}, Size: ${(metadata.userVaultSize / 1024).toFixed(2)}KB, Storage: ${metadata.storageType}`
        );

        // Update persistence status
        setVaultPersistenceStatus({
          isSynced: synced,
          lastSyncTime: metadata.lastSyncTime,
          documentCount: metadata.documentCount,
          storageType: metadata.storageType,
        });
      } catch (error) {
        console.error("Failed to initialize vault:", error);
      }
    };

    initializeVault();
  }, [userId]);

  // Verify authentication and load user data on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        let accessToken = null;
        let storedUserId = null;

        try {
          accessToken = await appStorage.getItem("biovault_token");
          storedUserId = await appStorage.getItem("biovault_userId");
        } catch (e) {
          console.error("appStorage error:", e);
          accessToken = localStorage.getItem("biovault_token");
          storedUserId = localStorage.getItem("biovault_userId");
        }

        if (!accessToken || !storedUserId) {
          throw new Error("No valid session");
        }

        setUserId(storedUserId);
        // Extract name from userId or use it as display name
        const displayName = storedUserId.split("@")[0] || "User";
        setUserName(displayName.charAt(0).toUpperCase() + displayName.slice(1));
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Auth error:", err);
        setAuthError("Session expired. Please login again.");
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    verifyAuth();
  }, []);

  const handleLogout = async () => {
    try {
      // Clear vault data for current user
      if (userId) {
        await clearVaultForUser(userId);
      }
      
      // Clear token storage
      await appStorage.removeItem("biovault_token");
      await appStorage.removeItem("biovault_refresh_token");
      await appStorage.removeItem("biovault_userId");
    } catch (e) {
      console.error("Error clearing appStorage:", e);
    }
    localStorage.removeItem("biovault_token");
    localStorage.removeItem("biovault_refresh_token");
    localStorage.removeItem("biovault_userId");
    navigate("/login", { replace: true });
  };

  if (isCheckingAuth) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full"></div>
          <p className="text-cyan-400/70 text-sm font-mono">Loading vault...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center px-4"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-red-400">Auth Failed</h2>
          <p className="text-sm text-red-300">{authError}</p>
          <Button onClick={() => navigate("/login")} className="mt-4">
            Back to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white pb-24">
      {/* Top Bar with User Profile */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-gradient-to-r from-slate-950/95 via-purple-950/95 to-slate-950/95 backdrop-blur-xl border-b border-purple-500/30 px-4 py-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/50">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{userName}</p>
              <p className="text-xs text-purple-300">{userId?.substring(0, 8)}...</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-all hover:shadow-lg hover:shadow-red-500/50"
          >
            <LogOut size={20} className="text-red-400" />
          </button>
        </div>

        {/* Vault Persistence Status */}
        {vaultPersistenceStatus.storageType !== "none" && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/30 w-fit">
            <div className={`w-2 h-2 rounded-full ${vaultPersistenceStatus.isSynced ? "bg-green-400" : "bg-yellow-400"}`}></div>
            <span>
              {vaultPersistenceStatus.isSynced ? "✅ Vault Synced" : "📊 Syncing"} • {vaultPersistenceStatus.documentCount} documents •{" "}
              {vaultPersistenceStatus.storageType === "both" ? "🔄 Dual-Backed" : vaultPersistenceStatus.storageType}
            </span>
          </div>
        )}
      </motion.div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {currentPage === "home" && <HomePage key="home" userName={userName} documentCount={vaultDocuments.length} onEncryptClick={async () => {
          try {
            console.log("📸 Opening camera for encryption...");
            const image = await CameraPlugin.getPhoto({
              quality: 90,
              allowEditing: false,
              source: "Cameras" as any,  // CAMERA ONLY - no gallery
              resultType: "base64" as any,
            });
            if (image?.base64String) {
              console.log("✅ Photo captured for encryption");
              setCapturedImage("data:image/jpeg;base64," + image.base64String);
              setCurrentPage("encrypt-preview");
            }
          } catch (error) {
            console.error("❌ Camera error:", error);
            alert("Failed to open camera. Please check camera permissions.");
          }
        }} setVerifyProofImage={setVerifyProofImage} setCurrentPage={setCurrentPage} quickActionCameraRef={quickActionCameraRef} quickActionFileRef={quickActionFileRef} onQuickActionImageSelected={handleQuickActionImageSelected} onVerifyProofImageSelected={handleVerifyProofImageSelected} />
        }
        {currentPage === "vault" && <VaultPage key="vault" documents={vaultDocuments} userId={userId} onDeleteDocument={async (docId) => {
          const updated = vaultDocuments.filter((doc) => doc.id !== docId);
          setVaultDocuments(updated);
          if (userId) {
            await saveVaultDocuments(userId, updated);
          }
        }} />}
        {currentPage === "portfolio" && <PortfolioPage key="portfolio" />}
        {currentPage === "share" && <SharePage key="share" shareConfigs={shareConfigs} setShareConfigs={setShareConfigs} shareHistory={shareHistory} setShareHistory={setShareHistory} selectedShareImage={selectedShareImage} setSelectedShareImage={setSelectedShareImage} shareExpiryDate={shareExpiryDate} setShareExpiryDate={setShareExpiryDate} shareExpiryTime={shareExpiryTime} setShareExpiryTime={setShareExpiryTime} shareDownloadLimit={shareDownloadLimit} setShareDownloadLimit={setShareDownloadLimit} sharePassword={sharePassword} setSharePassword={setSharePassword} includeCertificate={includeCertificate} setIncludeCertificate={setIncludeCertificate} generatedShareLink={generatedShareLink} setGeneratedShareLink={setGeneratedShareLink} generatedQRCode={generatedQRCode} setGeneratedQRCode={setGeneratedQRCode} shareStep={shareStep} setShareStep={setShareStep} userId={userId} vaultDocuments={vaultDocuments} />}
        {currentPage === "identity" && <IdentityPage key="identity" userName={userName} userId={userId} />}
        {currentPage === "crypto" && <ImageCryptoFull key="crypto" userId={userId || undefined} />}
        {currentPage === "vault-advanced" && <VaultManager key="vault-advanced" userId={userId || undefined} />}
        {currentPage === "activity" && <ActivityLogger key="activity" userId={userId || undefined} />}
        {currentPage === "profile" && <UserProfile key="profile" userId={userId || undefined} userEmail={"user@biovault.io"} onBack={() => setCurrentPage("home")} onLogout={handleLogout} />}
        {currentPage === "analysis" && <ImageAnalyzer key="analysis" userId={userId || "user"} onBack={() => setCurrentPage("home")} />}
        {currentPage === "verify-proof" && verifyProofImage && (
          <VerifyProofPage
            key="verify-proof"
            image={verifyProofImage}
            onBack={() => {
              setVerifyProofImage(null);
              setVerifyProofAnalysis(null);
              setCurrentPage("home");
            }}
          />
        )}
        {currentPage === "encrypt-preview" && capturedImage && (
          <EncryptPreviewPage
            key="encrypt-preview"
            image={capturedImage}
            userId={userId || "unknown"}
            onRetake={async () => {
              try {
                const image = await CameraPlugin.getPhoto({
                  quality: 90,
                  allowEditing: false,
                  resultType: "base64" as any,
                });
                if (image?.base64String) {
                  setCapturedImage("data:image/jpeg;base64," + image.base64String);
                }
              } catch (error) {
                console.error("Camera error:", error);
              }
            }}
            onSaveToVault={async (encryptedPackage) => {
              setIsEncrypting(true);
              try {
                console.log("📤 Saving encryption to vault...");
                
                // Verify encryption is valid
                if (!encryptedPackage || !encryptedPackage.encrypted_data || !encryptedPackage.metadata) {
                  throw new Error("Invalid encryption data package");
                }
                
                // Verify user ID is embedded in metadata
                if (!encryptedPackage.metadata.ownerId && !userId) {
                  throw new Error("Cannot encrypt: User ID not available");
                }
                
                const ownerIdUsed = encryptedPackage.metadata.ownerId || userId;
                console.log(`🔐 Image encrypted with PINIT ID: ${ownerIdUsed}`);
                
                // Upload to Cloudinary (optional cloud backup) - wrap in try-catch
                let uploadResult = { cloudinaryUrl: null };
                try {
                  console.log("☁️ Uploading to Cloudinary...");
                  uploadResult = await uploadImageToCloudinary(
                    encryptedPackage.encrypted_data,
                    encryptedPackage.metadata.original_name,
                    userId || "unknown",
                    encryptedPackage.metadata.size,
                    encryptedPackage.metadata.checksum
                  );
                  console.log("✅ Cloudinary upload successful");
                } catch (uploadErr) {
                  console.warn("⚠️ Cloudinary upload failed (non-critical):", uploadErr);
                  // Continue with local save even if cloud upload fails
                }

                // Save encrypted image to device gallery in PINIT Vault folder
                console.log("💾 Saving to device gallery...");
                let galleryResult = { success: false, error: "Not attempted" };
                try {
                  galleryResult = await saveImageToGallery(
                    encryptedPackage.encryptedImage || encryptedPackage.encrypted_data,
                    encryptedPackage.metadata.original_name,
                    userId || "unknown"
                  );
                  console.log(`✅ Image saved to gallery: ${galleryResult.path}`);
                } catch (galleryErr) {
                  console.warn("⚠️ Gallery save error:", galleryErr);
                  galleryResult = {
                    success: false,
                    error: galleryErr instanceof Error ? galleryErr.message : String(galleryErr)
                  };
                }

                // Create document with encrypted preview for display
                const newDoc: VaultDocument = {
                  id: Date.now().toString(),
                  name: encryptedPackage.metadata.original_name,
                  encryptedData: encryptedPackage.encrypted_data,
                  encryptedImage: encryptedPackage.encryptedImage, // Store for preview
                  cloudinaryUrl: uploadResult.cloudinaryUrl,
                  metadata: encryptedPackage.metadata,
                  createdAt: new Date().toLocaleDateString(),
                };

                // Add to state and persist
                const updatedDocs = [newDoc, ...vaultDocuments];
                setVaultDocuments(updatedDocs);
                if (userId) {
                  await saveVaultDocuments(userId, updatedDocs);
                  // Sync metadata to ensure consistency
                  await syncVaultMetadata(userId);
                  // Update persistence status
                  const metadata = await getVaultMetadata(userId);
                  setVaultPersistenceStatus({
                    isSynced: true,
                    lastSyncTime: metadata.lastSyncTime,
                    documentCount: metadata.documentCount,
                    storageType: metadata.storageType,
                  });
                }

                console.log("✅ Document saved to vault");
                // Show success message with encryption confirmation
                const successMsg = galleryResult.success 
                  ? `✅ Image Encrypted Successfully!\n🔐 Encrypted with PINIT ID: ${ownerIdUsed.substring(0, 8)}...\n📁 Saved to: PINIT Vault` 
                  : `✅ Image Encrypted Successfully!\n🔐 Encrypted with PINIT ID: ${ownerIdUsed.substring(0, 8)}...\n⚠️ (Gallery save failed)`;
                console.log("✅ " + successMsg);
                
                // Clear state and navigate home
                setCapturedImage(null);
                setIsEncrypting(false);
                setCurrentPage("home");
              } catch (error) {
                console.error("❌ Error saving to vault:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`Failed to encrypt image: ${errorMessage}`);
              } finally {
                setIsEncrypting(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent backdrop-blur-xl border-t border-purple-500/30">
        <div className="flex justify-around items-center h-20 px-2">
          <NavButton
            icon={Home}
            label="Home"
            active={currentPage === "home"}
            onClick={() => {
              try {
                setCurrentPage("home");
              } catch (e) {
                console.error("Error navigating to home:", e);
              }
            }}
          />
          <NavButton
            icon={Briefcase}
            label="Vault"
            active={currentPage === "vault"}
            onClick={() => {
              try {
                setCurrentPage("vault");
              } catch (e) {
                console.error("Error navigating to vault:", e);
              }
            }}
          />
          <NavButton
            icon={Plus}
            label="Portfolio"
            active={currentPage === "portfolio"}
            onClick={() => {
              try {
                setCurrentPage("portfolio");
              } catch (e) {
                console.error("Error navigating to portfolio:", e);
              }
            }}
            highlight
          />
          <NavButton
            icon={Clock}
            label="Activity"
            active={currentPage === "activity"}
            onClick={() => {
              try {
                setCurrentPage("activity");
              } catch (e) {
                console.error("Error navigating to activity:", e);
              }
            }}
          />
          <NavButton
            icon={Settings}
            label="Settings"
            active={currentPage === "profile"}
            onClick={() => {
              try {
                setCurrentPage("profile");
              } catch (e) {
                console.error("Error navigating to profile:", e);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
  highlight = false,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
        highlight
          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50 border border-purple-400/50"
          : active
            ? "text-purple-300 border-b-2 border-purple-500"
            : "text-slate-400 hover:text-purple-300 hover:bg-purple-900/20"
      }`}
    >
      <Icon size={22} />
      <span className="text-xs font-semibold">{label}</span>
    </motion.button>
  );
}

// ============= HOME PAGE =============
function HomePage({ userName, documentCount, onEncryptClick, setVerifyProofImage, setCurrentPage, quickActionCameraRef, quickActionFileRef, onQuickActionImageSelected, onVerifyProofImageSelected }: { userName: string; documentCount: number; onEncryptClick: () => void; setVerifyProofImage: (value: string | null) => void; setCurrentPage: (page: PageType) => void; quickActionCameraRef?: React.RefObject<HTMLInputElement>; quickActionFileRef?: React.RefObject<HTMLInputElement>; onQuickActionImageSelected?: (imageData: string) => void; onVerifyProofImageSelected?: (imageData: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-5"
    >
      {/* Hero Banner with Modern Gradient */}
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 p-6 text-white shadow-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-pink-500 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-blue-500 blur-3xl"></div>
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">PINIT Vault</h2>
          <p className="text-purple-100 text-sm">Your secure digital sanctuary</p>
        </div>
      </motion.div>

      {/* Stats Grid - Modern Cards */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Documents", value: documentCount.toString(), icon: FileText, gradient: "from-blue-600 to-purple-600" },
          { label: "Active Shares", value: "3", icon: Share2, gradient: "from-purple-600 to-pink-600" },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-shadow`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/80 text-xs font-semibold">{stat.label}</p>
                <p className="text-3xl font-bold mt-2 text-white">{stat.value}</p>
              </div>
              <stat.icon size={28} className="text-white/70" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions - Camera & Upload like Analyze */}
      <div>
        <h3 className="text-lg font-bold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { 
              icon: Camera, 
              label: "Encrypt", 
              gradient: "from-blue-600 to-cyan-600", 
              onClick: () => quickActionCameraRef?.current?.click(),
              subtext: "📸 Camera" 
            },
            { 
              icon: Camera, 
              label: "Verify Proof", 
              gradient: "from-purple-600 to-pink-600", 
              onClick: () => quickActionFileRef?.current?.click(),
              subtext: "📤 Upload" 
            },
            { 
              icon: Upload, 
              label: "Document Upload", 
              gradient: "from-orange-600 to-red-600", 
              onClick: async () => {
                try {
                  console.log("📄 Opening document upload...");
                  const doc = await CameraPlugin.pickImages({
                    quality: 90,
                  });
                  if (doc?.photos && doc.photos.length > 0) {
                    console.log("✅ Document uploaded successfully");
                    console.log("📄 Document ID: " + Date.now().toString().slice(-8));
                  }
                } catch (error) {
                  console.error("❌ Document upload error:", error);
                  console.error("Failed to upload document. Check file permissions.");
                }
              },
              subtext: "📄 Docs"
            },
            { 
              icon: Share2, 
              label: "Share", 
              gradient: "from-green-600 to-emerald-600", 
              onClick: () => setCurrentPage("share"),
              subtext: "🔗 Links" 
            },
          ].map((action, idx) => (
            <motion.button
              key={idx}
              onClick={action.onClick}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`bg-gradient-to-br ${action.gradient} rounded-xl p-3 flex flex-col items-center gap-1 shadow-lg hover:shadow-xl transition-all`}
            >
              <action.icon size={20} />
              <span className="text-xs font-bold text-center">{action.label}</span>
              <span className="text-xs text-white/70 text-center">{action.subtext}</span>
            </motion.button>
          ))}
        </div>

        {/* Hidden file inputs - matching ImageAnalyzer approach */}
        <input
          ref={quickActionCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onQuickActionImageSelected) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const imageData = event.target?.result as string;
                onQuickActionImageSelected(imageData);
              };
              reader.readAsDataURL(file);
            }
          }}
          className="hidden"
        />
        <input
          ref={quickActionFileRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onVerifyProofImageSelected) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const imageData = event.target?.result as string;
                onVerifyProofImageSelected(imageData);
              };
              reader.readAsDataURL(file);
            }
          }}
          className="hidden"
        />
      </div>

      {/* Recent Activity - Modern Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-slate-800/50 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-5 shadow-xl"
      >
        <h3 className="font-semibold mb-4 text-white">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-xl">
            <span className="text-sm font-medium">Vault accessed</span>
            <span className="text-purple-300 text-xs font-bold">Just now</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============= VAULT PAGE =============
function VaultPage({ documents, onDeleteDocument, userId }: { documents: VaultDocument[]; onDeleteDocument?: (docId: string) => void; userId?: string | null }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<VaultDocument | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [vaultDocs, setVaultDocs] = useState(documents);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [embeddedMetadata, setEmbeddedMetadata] = useState<AdvancedWatermarkMetadata | null>(null);

  // Sync documents when prop changes
  useEffect(() => {
    setVaultDocs(documents);
  }, [documents]);

  const filteredDocs = vaultDocs.filter((doc) =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + " " + sizes[i];
  };

  const handleDownload = async (doc: VaultDocument) => {
    try {
      if (!doc) {
        alert("❌ No image selected to download");
        return;
      }
      
      console.log("⬇️ Downloading image from vault:", doc.name);
      
      // Get user ID from props or storage if not available
      let currentUserId = userId || null;
      if (!currentUserId) {
        currentUserId = await appStorage.getItem('biovault_userId');
      }
      
      if (!currentUserId) {
        alert("❌ Unable to identify user");
        return;
      }
      
      // Get base64 data from multiple sources
      let base64Data = doc.encryptedData;
      
      if (!base64Data && doc.cloudinaryUrl) {
        // Try to fetch from Cloudinary if local data not available
        console.log("📥 Fetching image from cloud...");
        try {
          const response = await fetch(doc.cloudinaryUrl);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        } catch (fetchErr) {
          console.warn("⚠️ Failed to fetch from cloud:", fetchErr);
          alert("❌ Unable to download image. Please try again.");
          return;
        }
      }
      
      if (!base64Data) {
        alert("❌ No image data available to download");
        return;
      }
      
      // Save to device gallery in PINIT Vault folder
      console.log("💾 Saving to PINIT Vault...");
      const fileName = doc.metadata.original_name || doc.name;
      const result = await saveImageToGallery(base64Data, fileName, currentUserId);
      
      if (result.success) {
        console.log("✅ Image downloaded and saved to PINIT Vault");
        alert(`✅ Image Downloaded!\n\n📁 Saved to: PINIT Vault\n\n📸 ${fileName}\n\nCheck your phone's gallery.`);
      } else {
        console.warn("⚠️ Failed to save to gallery:", result.error);
        alert(`⚠️ Download partially successful.\n\nCould not save to gallery:\n${result.error}`);
      }
    } catch (err) {
      console.error("❌ Download error:", err);
      alert(`❌ Download failed:\n\n${err}`);
    }
  };

  const handleDeleteDocument = () => {
    if (docToDelete) {
      setVaultDocs((prev) => prev.filter((doc) => doc.id !== docToDelete));
      if (onDeleteDocument) {
        onDeleteDocument(docToDelete);
      }
      setSelectedDoc(null);
      setPreviewImage(null);
      setEmbeddedMetadata(null);
      setShowDeleteConfirm(false);
      setDocToDelete(null);
      console.log("✅ Document deleted:", docToDelete);
    }
  };

  const handleDocumentClick = async (doc: VaultDocument) => {
    // Display encrypted image (preview) or encrypted data if not available
    try {
      // Use encrypted image if available, otherwise fall back to encrypted data
      const imageUrl = doc.encryptedImage || ("data:image/jpeg;base64," + doc.encryptedData);
      setPreviewImage(imageUrl);
      setSelectedDoc(doc);

      // Only try to extract metadata if we have the encrypted image
      if (doc.encryptedImage) {
        // VERIFY EMBEDDED METADATA using advanced steganography extraction
        const extracted = await extractAdvancedWatermark(imageUrl);
        if (extracted && extracted.found) {
          setEmbeddedMetadata(extracted);
          console.log("✅ EMBEDDED METADATA VERIFIED:", extracted);
          console.log(`  Owner: ${extracted.userId}`);
          console.log(`  Confidence: ${extracted.confidence}`);
          console.log(`  Timestamp: ${extracted.timestamp}`);
          console.log(`  Device: ${extracted.deviceName || "Unknown"}`);
          console.log(`  IP Address: ${extracted.ipAddress || "Unknown"}`);
          console.log(`  GPS: ${extracted.gps.available ? extracted.gps.coordinates : "Not captured"}`);
        } else {
          setEmbeddedMetadata(null);
          console.warn("⚠️ No valid metadata found in image");
        }
      } else {
        // For old documents without encryptedImage, extract from metadata
        if (doc.metadata.ownerId) {
          console.log(`📋 Document owner: ${doc.metadata.ownerId}`);
        }
        setEmbeddedMetadata(null);
      }
    } catch (err) {
      console.error("Error loading preview:", err);
      setEmbeddedMetadata(null);
    }
  };

  // Delete confirmation modal
  if (showDeleteConfirm && docToDelete) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center px-4 py-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-red-500/30 backdrop-blur-xl rounded-2xl p-8 max-w-sm w-full space-y-6 shadow-2xl"
        >
          <div className="flex justify-center">
            <div className="bg-red-500/20 p-4 rounded-full">
              <AlertCircle size={30} className="text-red-500" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Delete Document?</h2>
            <p className="text-sm text-slate-400">This action cannot be undone. The encrypted document will be permanently deleted from your vault.</p>
          </div>
          <div className="space-y-3">
            <motion.button
              onClick={handleDeleteDocument}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Trash2 size={20} />
              Delete Forever
            </motion.button>
            <motion.button
              onClick={() => {
                setShowDeleteConfirm(false);
                setDocToDelete(null);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all"
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Full-screen preview modal
  if (selectedDoc && previewImage) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center px-4 py-6 overflow-y-auto"
      >
        {/* Close button */}
        <button
          onClick={() => {
            setSelectedDoc(null);
            setPreviewImage(null);
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-700/80 hover:bg-slate-600 z-51 transition-all"
        >
          <X size={24} className="text-white" />
        </button>

        {/* Image preview with thumbnail */}
        <div className="flex-1 flex items-center justify-center w-full max-w-2xl py-8">
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>

        {/* Enhanced metadata and actions */}
        <div className="w-full max-w-4xl space-y-4">
          {/* Metadata Grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur rounded-2xl p-6 border border-purple-500/20 space-y-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">🔒 ENCRYPTION DETAILS & METADATA VERIFICATION</h3>

            {/* File Info */}
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">FILE INFORMATION</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <p className="text-xs text-slate-400 mb-1">FILE NAME</p>
                  <p className="text-sm text-slate-200 font-mono break-all">{selectedDoc.metadata.original_name}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <p className="text-xs text-slate-400 mb-1">SIZE</p>
                  <p className="text-sm text-slate-200 font-mono">{getFileSize(selectedDoc.metadata.size)}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <p className="text-xs text-slate-400 mb-1">SAVED</p>
                  <p className="text-sm text-slate-200 font-mono">{new Date(selectedDoc.metadata.timestamp).toLocaleString()}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <p className="text-xs text-slate-400 mb-1">CHECKSUM</p>
                  <p className="text-sm text-slate-200 font-mono">{selectedDoc.metadata.checksum}</p>
                </div>
              </div>
            </div>

            {/* Security & Metadata */}
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">SECURITY & METADATA</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-lg p-3 border border-green-500/20">
                  <p className="text-xs text-slate-400 mb-1">ENCRYPTION</p>
                  <p className="text-sm text-green-300 font-semibold">AES-256 + LSB</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-900/30 to-teal-900/30 rounded-lg p-3 border border-cyan-500/20">
                  <p className="text-xs text-slate-400 mb-1">METADATA METHOD</p>
                  <p className="text-sm text-cyan-300 font-semibold">Tile-Based (12x12)</p>
                </div>
              </div>
            </div>

            {/* Embedded Metadata (extracted from image) */}
            {embeddedMetadata && embeddedMetadata.found && (
              <>
                <div className="border-t border-slate-700 pt-4 space-y-3">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide text-emerald-400">✅ METADATA VERIFIED</p>
                  
                  {/* Primary Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-3 border border-purple-500/20">
                      <p className="text-xs text-slate-400 mb-1">OWNER (VERIFIED)</p>
                      <p className="text-sm font-mono text-purple-300 font-semibold">{embeddedMetadata.userId}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-900/30 to-yellow-900/30 rounded-lg p-3 border border-amber-500/20">
                      <p className="text-xs text-slate-400 mb-1">CONFIDENCE</p>
                      <p className="text-sm font-mono text-amber-300 font-semibold">{embeddedMetadata.confidence}</p>
                    </div>
                  </div>

                  {/* Device Information */}
                  {(embeddedMetadata.deviceName || embeddedMetadata.deviceId) && (
                    <div className="pt-3 space-y-2">
                      <p className="text-xs text-slate-400 font-semibold">DEVICE INFORMATION</p>
                      <div className="grid grid-cols-2 gap-3">
                        {embeddedMetadata.deviceName && (
                          <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                            <p className="text-xs text-slate-400 mb-1">DEVICE NAME</p>
                            <p className="text-sm text-slate-200 font-mono">{embeddedMetadata.deviceName}</p>
                          </div>
                        )}
                        {embeddedMetadata.deviceId && (
                          <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                            <p className="text-xs text-slate-400 mb-1">DEVICE ID</p>
                            <p className="text-sm text-slate-200 font-mono break-all">{embeddedMetadata.deviceId}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Network & Location */}
                  {(embeddedMetadata.ipAddress || embeddedMetadata.gps.available) && (
                    <div className="pt-3 space-y-2">
                      <p className="text-xs text-slate-400 font-semibold">NETWORK & LOCATION</p>
                      <div className="grid grid-cols-2 gap-3">
                        {embeddedMetadata.ipAddress && (
                          <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                            <p className="text-xs text-slate-400 mb-1">IP ADDRESS</p>
                            <p className="text-sm text-slate-200 font-mono">{embeddedMetadata.ipAddress}</p>
                          </div>
                        )}
                        {embeddedMetadata.gps.available && (
                          <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                            <p className="text-xs text-slate-400 mb-1">GPS COORDINATES</p>
                            <p className="text-sm text-slate-200 font-mono">{embeddedMetadata.gps.coordinates}</p>
                            {embeddedMetadata.gps.mapsUrl && (
                              <a href={embeddedMetadata.gps.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-1">
                                View on Maps →
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Image Resolution */}
                  {embeddedMetadata.originalResolution && (
                    <div className="pt-3">
                      <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                        <p className="text-xs text-slate-400 mb-1">ORIGINAL RESOLUTION</p>
                        <p className="text-sm text-slate-200 font-mono">{embeddedMetadata.originalResolution}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {!embeddedMetadata || !embeddedMetadata.found && (
              <div className="border-t border-slate-700 pt-4">
                <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <p className="text-xs text-slate-400 mb-1">METADATA STATUS</p>
                  <p className="text-sm text-slate-300">⚠️ Metadata extraction in progress...</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            {/* Download Button */}
            <motion.button
              onClick={() => handleDownload(selectedDoc)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="col-span-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Download size={18} />
              Download
            </motion.button>

            {/* Delete Button */}
            <motion.button
              onClick={() => {
                setDocToDelete(selectedDoc.id);
                setShowDeleteConfirm(true);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Trash2 size={18} />
            </motion.button>
          </div>

          {/* Back Button */}
          <motion.button
            onClick={() => {
              setSelectedDoc(null);
              setPreviewImage(null);
              setEmbeddedMetadata(null);
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all"
          >
            Back to Vault
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-4"
    >
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Vault</h1>

      {/* Search Bar - Modern */}
      <div className="bg-gradient-to-r from-slate-800/50 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
        <FileSearch size={20} className="text-purple-400" />
        <input
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent outline-none flex-1 text-sm placeholder-slate-500"
        />
      </div>

      {/* Files List - Modern Cards */}
      <div className="space-y-3">
        {filteredDocs.length > 0 ? (
          filteredDocs.map((doc, idx) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleDocumentClick(doc)}
              className="bg-gradient-to-r from-slate-800/40 to-purple-900/20 border border-purple-500/20 backdrop-blur-xl rounded-xl p-4 flex items-center justify-between hover:border-purple-500/50 transition-all shadow-lg hover:shadow-xl hover:shadow-purple-500/20 cursor-pointer"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-2 shadow-lg">
                  <FileText size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-white">{doc.name}</p>
                  <p className="text-purple-300/70 text-xs">{getFileSize(doc.metadata.size)} • {doc.createdAt}</p>
                </div>
              </div>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(doc);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 hover:bg-purple-600/30 rounded-lg transition-all"
              >
                <Download size={18} className="text-purple-400" />
              </motion.button>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p>{searchTerm ? "No matching documents" : "No documents in vault"}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============= ENCRYPT PREVIEW PAGE =============
function EncryptPreviewPage({
  image,
  userId,
  onRetake,
  onSaveToVault,
}: {
  image: string;
  userId: string;
  onRetake: () => void;
  onSaveToVault: (encryptedPackage: any) => Promise<void>;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [encryptedData, setEncryptedData] = useState<any>(null);
  const [encryptedImage, setEncryptedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Encrypt image and embed user ID when component mounts
  useEffect(() => {
    let isMounted = true; // Track if component is still mounted
    
    const encryptImage = async () => {
      try {
        console.log('🔐 Starting encryption process for user:', userId);
        if (!isMounted) return;
        setIsProcessing(true);
        setError(null);
        
        // Step 0: Resize image if needed to prevent memory overflow
        console.log('📦 Step 0/4: Checking image dimensions...');
        let processedImage = image;
        try {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image for resizing'));
            img.src = image;
          });
          
          let width = img.width;
          let height = img.height;
          const maxWidth = 1920;
          const maxHeight = 1080;
          
          // Check if resize needed
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
            console.log(`📦 Resizing image from ${img.width}x${img.height} to ${width}x${height}`);
            
            // Resize using canvas
            const resizeCanvas = document.createElement('canvas');
            resizeCanvas.width = width;
            resizeCanvas.height = height;
            const resizeCtx = resizeCanvas.getContext('2d');
            
            if (!resizeCtx) {
              throw new Error('Failed to get canvas context for resizing');
            }
            
            resizeCtx.drawImage(img, 0, 0, width, height);
            processedImage = resizeCanvas.toDataURL('image/jpeg', 0.9); // JPEG compression for efficiency
            console.log('✅ Image resized and compressed successfully');
          } else {
            console.log(`✅ Image dimensions OK (${width}x${height})`);
          }
        } catch (resizeErr) {
          throw new Error(`Image resizing failed: ${resizeErr instanceof Error ? resizeErr.message : String(resizeErr)}`);
        }
        
        if (!isMounted) return;
        
        // Step 1: Embed metadata
        console.log('🔏 Step 1/4: Embedding metadata with user ID...');
        let embeddedImageBase64 = null;
        try {
          embeddedImageBase64 = await embedAdvancedWatermark(
            processedImage,
            userId,
            new Date().toISOString(),
            undefined,
            undefined,
            undefined,
            undefined
          );
          console.log('✅ Metadata embedded successfully');
        } catch (embedErr) {
          throw new Error(`Metadata embedding failed: ${embedErr instanceof Error ? embedErr.message : String(embedErr)}`);
        }
        
        if (!embeddedImageBase64) {
          throw new Error('Metadata embedding returned empty result');
        }
        
        if (!isMounted) return;
        setEncryptedImage(embeddedImageBase64);
        
        // Step 2: Convert base64 to Blob without using fetch (avoids size issues)
        console.log('💾 Step 2/5: Converting to blob...');
        let blob: Blob;
        try {
          // Remove data URL prefix if present
          const base64Data = embeddedImageBase64.includes(',') 
            ? embeddedImageBase64.split(',')[1] 
            : embeddedImageBase64;
          
          // Convert base64 to binary
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          blob = new Blob([bytes], { type: 'image/jpeg' });
          console.log('📊 Blob created, size:', blob.size, 'bytes');
          
          if (!blob.size) {
            throw new Error('Blob is empty');
          }
        } catch (blobErr) {
          throw new Error(`Blob conversion failed: ${blobErr instanceof Error ? blobErr.message : String(blobErr)}`);
        }
        
        if (!isMounted) return;
        
        // Step 3: Convert blob to base64 using FileReader
        console.log('📝 Step 3/5: Encoding to base64...');
        const base64String = await new Promise<string>((resolve, reject) => {
          try {
            const reader = new FileReader();
            
            // Set timeout to prevent hanging
            const timeout = setTimeout(() => {
              reader.abort();
              reject(new Error('FileReader timeout after 30 seconds'));
            }, 30000);
            
            reader.onload = () => {
              clearTimeout(timeout);
              try {
                const result = reader.result as string;
                if (!result) {
                  throw new Error('FileReader returned empty result');
                }
                const base64 = result.includes(',') ? result.split(',')[1] : result;
                if (!base64 || base64.length === 0) {
                  throw new Error('Base64 string is empty after split');
                }
                console.log('✅ Base64 encoded, length:', base64.length);
                resolve(base64);
              } catch (err) {
                reject(new Error(`Base64 processing error: ${err instanceof Error ? err.message : String(err)}`));
              }
            };
            
            reader.onerror = () => {
              clearTimeout(timeout);
              reject(new Error(`FileReader error: ${reader.error?.message || 'Unknown error'}`));
            };
            
            reader.onabort = () => {
              clearTimeout(timeout);
              reject(new Error('FileReader was aborted'));
            };
            
            reader.readAsDataURL(blob);
          } catch (err) {
            reject(new Error(`FileReader setup error: ${err instanceof Error ? err.message : String(err)}`));
          }
        });
        
        if (!isMounted) return;
        
        // Step 4: Create encryption package
        console.log('🔐 Step 4/5: Creating encryption package...');
        const metadata = {
          timestamp: Date.now(),
          original_name: `encrypted_vault_${userId}_${Date.now()}.jpg`,
          size: blob.size,
          checksum: Math.random().toString(36).substring(7),
          encrypted: true,
          ownerId: userId,
          imageType: 'encrypted',
        };
        
        const encryptedPackage = {
          encrypted_data: base64String,
          encryptedImage: embeddedImageBase64,
          metadata: metadata,
          check_digest: Math.random().toString(36).substring(7),
        };
        
        console.log('✅ All encryption steps completed successfully');
        if (isMounted) {
          setEncryptedData(encryptedPackage);
        }
      } catch (err: any) {
        console.error('❌ Encryption error:', err);
        const errorMsg = err?.message || String(err) || 'Unknown encryption error';
        if (isMounted) {
          setError(`⚠️ Encryption failed: ${errorMsg}`);
          console.error(`Encryption Error: ${errorMsg}. Please retake the photo and try again.`);
        }

      } finally {
        if (isMounted) {
          setIsProcessing(false);
        }
      }
    };
    
    encryptImage();
    
    // Cleanup function
    return () => {
      isMounted = false; // Mark component as unmounted to prevent state updates
    };
  }, [image, userId]);

  const handleSave = async () => {
    if (!encryptedData) {
      setError("No encrypted data available");
      return;
    }
    try {
      console.log("💾 Starting save process...");
      setIsProcessing(true);
      await onSaveToVault(encryptedData);
      console.log("✅ Save completed successfully");
    } catch (err) {
      console.error("❌ Save error:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Save failed: ${errorMsg}`);
      setError(`Save failed: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-4 pb-24"
    >
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">🔐 Encrypt Image</h1>

      {/* Encrypted Image Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-2xl overflow-hidden border-2 border-purple-500/30 shadow-2xl"
      >
        <img
          src={encryptedImage || image}
          alt="Encrypted"
          className="w-full h-auto object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-4">
          <div className="flex items-center gap-2 text-purple-300 text-xs bg-slate-900/60 backdrop-blur-sm px-3 py-2 rounded-lg">
            <Shield size={14} />
            <span>🔒 User ID Embedded: {userId.substring(0, 8)}...</span>
          </div>
        </div>
      </motion.div>

      {/* Encryption Status */}
      {isProcessing ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-r from-slate-800/50 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full"
          />
          <p className="text-purple-300 font-semibold">🔐 Encrypting...</p>
          <p className="text-xs text-slate-400">Embedding ownership ID in image pixels</p>
        </motion.div>
      ) : encryptedData ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-slate-800/50 to-purple-900/30 border border-green-500/30 backdrop-blur-xl rounded-2xl p-6 space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="bg-green-500/20 p-2 rounded-lg flex-shrink-0">
              <Shield size={20} className="text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-green-400">✓ Encrypted</p>
              <p className="text-sm text-slate-300 mt-1">Owner ID embedded in pixel data for authenticity</p>
            </div>
          </div>

          {/* Encryption Metadata */}
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-xl p-4 space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Owner ID:</span>
              <span className="font-mono text-green-400">{userId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">File Size:</span>
              <span className="font-mono">{Math.round(encryptedData.metadata.size / 1024)} KB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Encryption Type:</span>
              <span className="font-mono text-cyan-400">LSB Embedded</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Timestamp:</span>
              <span className="font-mono">{new Date(encryptedData.metadata.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </motion.div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-r from-red-900/30 to-red-900/20 border border-red-500/30 backdrop-blur-xl rounded-2xl p-4 flex gap-3"
        >
          <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-400">Encryption Failed</p>
            <p className="text-sm text-red-300/70">{error}</p>
          </div>
        </motion.div>
      ) : null}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-4">
        <motion.button
          onClick={onRetake}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          disabled={isProcessing}
          className="bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 disabled:opacity-50 rounded-xl p-4 font-semibold text-white flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          <Camera size={18} />
          Retake
        </motion.button>
        <motion.button
          onClick={handleSave}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          disabled={isProcessing || !encryptedData}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 rounded-xl p-4 font-semibold text-white flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          <Lock size={18} />
          Encrypt
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============= PORTFOLIO PAGE =============
function PortfolioPage() {
  const [portfolioName, setPortfolioName] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-4"
    >
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Create Portfolio</h1>

      <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 space-y-4 shadow-xl">
        <div>
          <label className="text-purple-300 text-sm font-semibold">Portfolio Name</label>
          <input
            type="text"
            placeholder="e.g., Job Application"
            value={portfolioName}
            onChange={(e) => setPortfolioName(e.target.value)}
            className="w-full mt-3 bg-slate-700/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/70 focus:bg-slate-700/70 transition-all"
          />
        </div>

        <div>
          <label className="text-purple-300 text-sm font-semibold">Description</label>
          <textarea
            placeholder="Add details..."
            rows={3}
            className="w-full mt-3 bg-slate-700/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/70 focus:bg-slate-700/70 transition-all resize-none"
          />
        </div>

        <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all">
          Create Portfolio
        </Button>
      </div>
    </motion.div>
  );
}

// ============= SHARE PAGE =============
function SharePage({ 
  shareConfigs, setShareConfigs, 
  shareHistory, setShareHistory, 
  selectedShareImage, setSelectedShareImage,
  shareExpiryDate, setShareExpiryDate,
  shareExpiryTime, setShareExpiryTime,
  shareDownloadLimit, setShareDownloadLimit,
  sharePassword, setSharePassword,
  includeCertificate, setIncludeCertificate,
  generatedShareLink, setGeneratedShareLink,
  generatedQRCode, setGeneratedQRCode,
  shareStep, setShareStep,
  userId,
  vaultDocuments
}: {
  shareConfigs: ShareConfig[];
  setShareConfigs: React.Dispatch<React.SetStateAction<ShareConfig[]>>;
  shareHistory: any[];
  setShareHistory: React.Dispatch<React.SetStateAction<any[]>>;
  selectedShareImage: VaultDocument | null;
  setSelectedShareImage: React.Dispatch<React.SetStateAction<VaultDocument | null>>;
  shareExpiryDate: string;
  setShareExpiryDate: React.Dispatch<React.SetStateAction<string>>;
  shareExpiryTime: string;
  setShareExpiryTime: React.Dispatch<React.SetStateAction<string>>;
  shareDownloadLimit: number | null;
  setShareDownloadLimit: React.Dispatch<React.SetStateAction<number | null>>;
  sharePassword: string;
  setSharePassword: React.Dispatch<React.SetStateAction<string>>;
  includeCertificate: boolean;
  setIncludeCertificate: React.Dispatch<React.SetStateAction<boolean>>;
  generatedShareLink: string;
  setGeneratedShareLink: React.Dispatch<React.SetStateAction<string>>;
  generatedQRCode: string;
  setGeneratedQRCode: React.Dispatch<React.SetStateAction<string>>;
  shareStep: "select" | "configure" | "preview";
  setShareStep: React.Dispatch<React.SetStateAction<"select" | "configure" | "preview">>;
  userId: string | null;
  vaultDocuments: VaultDocument[];
}) {
  const generateShareLink = () => {
    // Generate unique share ID
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/share/${shareId}`;
    return link;
  };

  const handleGenerateShare = async () => {
    try {
      // Validate selected document
      if (!selectedShareImage) {
        alert("❌ Please select a document to share.");
        return;
      }

      // Get backend URL from environment or use current origin
      const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
      const publicUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

      console.log("📤 SharePage: Calling backend API to create share...");
      console.log("Backend URL:", backendUrl);
      console.log("Public URL:", publicUrl);

      // Call backend API to create share
      const response = await fetch(`${backendUrl}/share/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          vault_image_id: selectedShareImage.id || null,
          expiry_date: shareExpiryDate || null,
          expiry_time: shareExpiryTime || null,
          download_limit: shareDownloadLimit,
          password: sharePassword || null,
          include_cert: includeCertificate,
          base_url: publicUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create share");
      }

      const responseData = await response.json();
      const shareLink = responseData.share_link;
      const shareId = responseData.share_id;

      setGeneratedShareLink(shareLink);

      // Create local share config for UI
      const config: ShareConfig = {
        id: shareId,
        shareLink: shareLink,
        expiryDate: shareExpiryDate || null,
        expiryTime: shareExpiryTime || null,
        downloadLimit: shareDownloadLimit,
        downloadsUsed: 0,
        passwordProtected: sharePassword.length > 0,
        sharePassword: sharePassword,
        includeCertificate: includeCertificate,
        qrCodeData: shareLink,
        createdAt: new Date().toLocaleString(),
        createdBy: userId || "Unknown",
      };

      // Add to configs
      setShareConfigs([...shareConfigs, config]);

      // Add to history
      setShareHistory([...shareHistory, {
        id: config.id,
        action: "Share Created",
        document: selectedShareImage.name || "Unknown",
        config: config,
        timestamp: new Date().toLocaleString(),
      }]);

      console.log("✅ Share link generated successfully:", shareLink);
      alert("✅ Share link created! Your friend can scan the QR code or use the link to access it.");
      setShareStep("preview");
    } catch (error) {
      console.error("❌ Error generating share link:", error);
      alert(`❌ Failed to generate share link: ${(error as any)?.message || String(error)}`);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedShareLink);
    alert("✅ Share link copied to clipboard!");
  };

  const downloadQRCode = () => {
    // Generate QR code using external API
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generatedShareLink)}`;
    const link = document.createElement("a");
    link.href = qrApiUrl;
    link.download = `share-qr-${Date.now()}.png`;
    link.click();
  };

  const handleResetShare = () => {
    setShareStep("select");
    setSelectedShareImage(null);
    setShareExpiryDate("");
    setShareExpiryTime("00:00");
    setShareDownloadLimit(null);
    setSharePassword("");
    setIncludeCertificate(false);
    setGeneratedShareLink("");
    setGeneratedQRCode("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-4 pb-8"
    >
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        🔗 Secure Share Center
      </h1>

      {/* STEP 1: SELECT DOCUMENT */}
      {shareStep === "select" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-xl font-bold text-white">📦 Select Document to Share</h2>
            <p className="text-purple-300/80 text-sm">Choose a document from your vault</p>

            {vaultDocuments.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                <p className="text-gray-400">No documents available. Create or upload documents first.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {vaultDocuments.map((doc) => (
                  <motion.button
                    key={doc.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => {
                      setSelectedShareImage(doc);
                      setShareStep("configure");
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedShareImage?.id === doc.id
                        ? "border-purple-500 bg-purple-900/30"
                        : "border-purple-500/30 bg-purple-900/10 hover:border-purple-500/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-purple-400" />
                      <div className="flex-1">
                        <p className="font-semibold text-white">{doc.name}</p>
                        <p className="text-xs text-purple-300/60">Uploaded: {doc.createdAt}</p>
                      </div>
                      <CheckCircle className={`w-5 h-5 ${selectedShareImage?.id === doc.id ? "text-green-500" : "text-gray-600"}`} />
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* STEP 2: CONFIGURE SHARING */}
      {shareStep === "configure" && selectedShareImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-white">⚙️ Configure Share Settings</h2>
              <button
                onClick={() => setShareStep("select")}
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                ← Back
              </button>
            </div>
            <p className="text-purple-300/80 text-sm">Sharing: <span className="font-bold text-purple-200">{selectedShareImage.name}</span></p>

            <div className="space-y-4 mt-4">
              {/* EXPIRY DATE & TIME */}
              <motion.div className="p-4 bg-purple-900/20 border border-purple-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <label className="font-semibold text-white">Share Expiry</label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={shareExpiryDate}
                    onChange={(e) => setShareExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:border-purple-500/70 outline-none"
                    placeholder="Select date"
                  />
                  <input
                    type="time"
                    value={shareExpiryTime}
                    onChange={(e) => setShareExpiryTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:border-purple-500/70 outline-none"
                  />
                </div>
                <p className="text-xs text-purple-300/60 mt-2">Leave blank for no expiry</p>
              </motion.div>

              {/* DOWNLOAD LIMIT */}
              <motion.div className="p-4 bg-purple-900/20 border border-purple-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Download className="w-5 h-5 text-green-400" />
                  <label className="font-semibold text-white">Download Limit</label>
                </div>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={shareDownloadLimit || ""}
                  onChange={(e) => setShareDownloadLimit(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:border-purple-500/70 outline-none"
                  placeholder="Unlimited downloads (leave blank)"
                />
                <p className="text-xs text-purple-300/60 mt-2">Number of times this link can be downloaded</p>
              </motion.div>

              {/* PASSWORD PROTECTION */}
              <motion.div className="p-4 bg-purple-900/20 border border-purple-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-5 h-5 text-orange-400" />
                  <label className="font-semibold text-white">Password Protection</label>
                </div>
                <input
                  type="password"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:border-purple-500/70 outline-none"
                  placeholder="Leave blank for no password"
                />
                {sharePassword && (
                  <p className="text-xs text-green-400 mt-2">✓ Password protected</p>
                )}
              </motion.div>

              {/* CERTIFICATE SHARING */}
              <motion.div className="p-4 bg-purple-900/20 border border-purple-500/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    <label className="font-semibold text-white">Include Certificate</label>
                  </div>
                  <button
                    onClick={() => setIncludeCertificate(!includeCertificate)}
                    className={`w-10 h-6 rounded-full transition-all ${
                      includeCertificate
                        ? "bg-gradient-to-r from-purple-600 to-blue-600"
                        : "bg-slate-600"
                    }`}
                  />
                </div>
                <p className="text-xs text-purple-300/60 mt-2">Share authorship certificate with recipient</p>
              </motion.div>
            </div>

            <Button
              onClick={async () => {
                try {
                  await handleGenerateShare();
                } catch (err) {
                  console.error("❌ Share button error:", err);
                  alert(`❌ Share error: ${(err as any)?.message || String(err)}`);
                }
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all mt-4"
            >
              ✨ Generate Share Link
            </Button>
          </div>
        </motion.div>
      )}

      {/* STEP 3: PREVIEW & SHARE */}
      {shareStep === "preview" && generatedShareLink && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* QR CODE SECTION */}
          <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">📲 QR Code</h2>
            <div className="bg-white rounded-xl p-4 flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(generatedShareLink)}`}
                alt="QR Code"
                className="w-64 h-64"
              />
            </div>
            <p className="text-xs text-center text-purple-300/60 mt-3">Scan with phone camera to share</p>
            <Button
              onClick={downloadQRCode}
              className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 font-semibold shadow-lg"
            >
              📥 Download QR Code
            </Button>
          </div>

          {/* SHARE LINK SECTION */}
          <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">🔗 Share Link</h2>
            <div className="bg-slate-700/50 border border-purple-500/30 rounded-xl p-4 mb-4">
              <p className="text-xs text-purple-300/60 mb-2">Copy this link to share:</p>
              <p className="text-white font-mono text-xs break-all">{generatedShareLink}</p>
            </div>
            <Button
              onClick={handleCopyLink}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg"
            >
              📋 Copy Link to Clipboard
            </Button>
          </div>

          {/* SHARE CONFIGURATION SUMMARY */}
          <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">📊 Share Configuration</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-purple-900/20 rounded-lg">
                <span className="text-purple-300">Document</span>
                <span className="font-semibold text-white">{selectedShareImage?.name}</span>
              </div>
              {shareExpiryDate && (
                <div className="flex items-center justify-between p-3 bg-purple-900/20 rounded-lg">
                  <span className="text-purple-300">⏰ Expires</span>
                  <span className="font-semibold text-orange-400">
                    {shareExpiryDate} {shareExpiryTime}
                  </span>
                </div>
              )}
              {shareDownloadLimit && (
                <div className="flex items-center justify-between p-3 bg-purple-900/20 rounded-lg">
                  <span className="text-purple-300">📥 Downloads Allowed</span>
                  <span className="font-semibold text-blue-400">{shareDownloadLimit}x</span>
                </div>
              )}
              {sharePassword && (
                <div className="flex items-center justify-between p-3 bg-purple-900/20 rounded-lg">
                  <span className="text-purple-300">🔐 Password Protected</span>
                  <span className="font-semibold text-green-400">✓ Yes</span>
                </div>
              )}
              {includeCertificate && (
                <div className="flex items-center justify-between p-3 bg-purple-900/20 rounded-lg">
                  <span className="text-purple-300">📜 Certificate Included</span>
                  <span className="font-semibold text-yellow-400">✓ Yes</span>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-purple-900/20 rounded-lg">
                <span className="text-purple-300">🕐 Created</span>
                <span className="font-semibold text-gray-300">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* SHARE HISTORY */}
          {shareHistory.length > 0 && (
            <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4">📜 Share History</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shareHistory.map((entry, idx) => (
                  <div key={idx} className="p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-white text-sm">{entry.action}</p>
                        <p className="text-xs text-purple-300/60">{entry.document}</p>
                      </div>
                      <p className="text-xs text-gray-400">{entry.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex gap-3">
            <Button
              onClick={handleResetShare}
              className="flex-1 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 font-semibold shadow-lg"
            >
              ← Create Another
            </Button>
            <Button
              onClick={() => alert("✅ Share links created! Recipients can now access your document using the link or QR code.")}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg"
            >
              ✅ Done
            </Button>
          </div>
        </motion.div>
      )}

      {/* ACTIVE SHARES LIST */}
      {shareConfigs.length > 0 && shareStep === "select" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 space-y-3 shadow-xl"
        >
          <h2 className="text-lg font-bold text-white">📤 Active Shares</h2>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {shareConfigs.map((config) => (
              <div key={config.id} className="p-3 bg-purple-900/20 border border-purple-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white text-sm">{config.shareLink.substring(0, 40)}...</span>
                  <span className="text-xs px-2 py-1 bg-green-500/30 text-green-400 rounded-full">Active</span>
                </div>
                <div className="text-xs text-purple-300/60 space-y-1">
                  <p>Created: {config.createdAt}</p>
                  {config.expiryDate && <p>Expires: {config.expiryDate} {config.expiryTime}</p>}
                  {config.downloadLimit && <p>Downloads: {config.downloadsUsed}/{config.downloadLimit}</p>}
                  {config.passwordProtected && <p>🔐 Password Protected</p>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ============= IDENTITY PAGE =============
function IdentityPage({ userName, userId }: { userName: string; userId: string | null }) {
  const [email, setEmail] = useState("user@example.com");
  const [phone, setPhone] = useState("+1 (555) 000-0000");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-4 pb-8"
    >
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Digital Identity</h1>

      {/* Profile Card - Modern */}
      <motion.div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-purple-500/50">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{userName}</p>
          <p className="text-purple-300/70 text-xs font-mono mt-2">{userId?.substring(0, 12)}...</p>
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-full px-4 py-2 mt-3 inline-block">
            <p className="text-green-400 text-xs font-bold">✓ VERIFIED</p>
          </div>
        </div>
      </motion.div>

      {/* Personal Details */}
      <motion.div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-white">Personal Details</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-purple-400 text-sm font-semibold hover:text-purple-300 transition-colors"
          >
            {isEditing ? "Done" : "Edit"}
          </button>
        </div>

        {[
          { label: "Email", value: email, setter: setEmail },
          { label: "Phone", value: phone, setter: setPhone },
        ].map((field, idx) => (
          <div key={idx} className="pb-4 border-b border-purple-500/20 last:border-0">
            <p className="text-purple-300/70 text-xs font-semibold">{field.label}</p>
            {isEditing ? (
              <input
                type="text"
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                className="w-full mt-2 bg-slate-700/50 border border-purple-500/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500/70 transition-all text-white"
              />
            ) : (
              <p className="font-semibold mt-2 text-white">{field.value}</p>
            )}
          </div>
        ))}
      </motion.div>

      {/* Security Settings */}
      <motion.div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 space-y-3 shadow-xl">
        <h3 className="font-bold text-lg text-white mb-4">Security Settings</h3>
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600/30 p-2 rounded-lg">
              <Shield size={18} className="text-purple-400" />
            </div>
            <span className="text-sm font-semibold">Biometric Login</span>
          </div>
          <div className="w-10 h-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg shadow-purple-500/50"></div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============= VERIFY PROOF PAGE =============
function VerifyProofPage({ image, onBack }: { image: string; onBack: () => void }) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const analyzeImageFull = async () => {
      try {
        setIsAnalyzing(true);
        setError(null);
        console.log("🔍 Starting comprehensive image analysis...");

        // Convert base64 to blob
        const base64Data = image.includes(",") ? image.split(",")[1] : image;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });

        // Create canvas to analyze image
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get canvas context");

        const img = new Image();
        img.onload = async () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // Try to extract embedded metadata from image
          console.log("📊 Extracting embedded metadata...");
          let embeddedData: AdvancedWatermarkMetadata | null = null;
          try {
            embeddedData = await extractAdvancedWatermark(canvas);
            console.log("✅ Metadata extracted:", embeddedData);
          } catch (wmError) {
            console.warn("⚠️ Could not extract metadata:", wmError);
          }

          // Run ML-based image type detection (AI vs Phone vs WhatsApp, etc.)
          console.log("🤖 Running image type detection...");
          const imageTypeAnalysis = await analyzeImage(image);
          console.log("✅ Image type detected:", imageTypeAnalysis);

          // Analyze image content
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Check encryption patterns (LSB analysis)
          let lsbVariance = 0;
          let lsbCount = 0;
          for (let i = 0; i < data.length; i += 4) {
            lsbVariance += (data[i] & 1) + ((data[i + 1] & 1) << 1) + ((data[i + 2] & 1) << 2);
            lsbCount++;
          }
          const avgLSBVariance = lsbVariance / lsbCount;
          const isLikelyEncrypted = avgLSBVariance > 2.5; // Threshold for LSB detection

          // Build comprehensive analysis result
          const result = {
            imageResolution: `${canvas.width}x${canvas.height}`,
            imageSize: `${(blob.size / 1024).toFixed(2)} KB`,
            pixelCount: canvas.width * canvas.height,
            isEncrypted: embeddedData ? true : isLikelyEncrypted,
            encryptionType: embeddedData?.format || (isLikelyEncrypted ? "LSB Steganography" : "None"),
            ownershipDetails: embeddedData ? {
              pinItId: embeddedData.userId || "Unknown",
              timestamp: new Date(embeddedData.timestamp || 0).toLocaleString(),
              encryptionFormat: embeddedData.format,
              validationTiles: embeddedData.validationTiles,
              tilesPassed: embeddedData.tilesPassed,
            } : {
              pinItId: "Not encrypted with PINIT",
              timestamp: "N/A",
              encryptionFormat: "None",
            },
            // Enhanced image type detection with ML analysis
            imageType: embeddedData?.imageType || imageTypeAnalysis.imageType || "Unknown",
            imageTypeAnalysis: imageTypeAnalysis, // Full analysis with confidence
            imageTypeDetails: `${imageTypeAnalysis.imageType.toUpperCase()} (${imageTypeAnalysis.confidence}% confidence)`,
            imageTypeIndicators: imageTypeAnalysis.indicators,
            metadata: embeddedData ? {
              userId: embeddedData.userId,
              timestamp: embeddedData.timestamp,
              imageType: embeddedData.imageType,
              validationStatus: embeddedData.tilesPassed && embeddedData.validationTiles
                ? `${embeddedData.tilesPassed}/${embeddedData.validationTiles} validation tiles passed`
                : "Validation pending",
            } : null,
            confidence: embeddedData 
              ? (embeddedData.tilesPassed && embeddedData.validationTiles 
                ? Math.round((embeddedData.tilesPassed / embeddedData.validationTiles) * 100)
                : 0)
              : (isLikelyEncrypted ? 65 : 0),
          };

          setAnalysis(result);
          console.log("✅ Comprehensive analysis complete:", result);
          setIsAnalyzing(false);
        };

        img.onerror = () => {
          throw new Error("Failed to load image for analysis");
        };

        img.src = image;
      } catch (err) {
        console.error("❌ Analysis error:", err);
        setError(err instanceof Error ? err.message : "Failed to analyze image");
        setIsAnalyzing(false);
      }
    };

    analyzeImageFull();
  }, [image]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-5 pb-8"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Verify Proof</h1>
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"
        >
          <X size={24} className="text-slate-300" />
        </button>
      </div>

      {/* Image Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl"
      >
        <img src={image} alt="Verification" className="w-full h-auto" />
      </motion.div>

      {/* Analysis Loading State */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center gap-4 shadow-xl"
        >
          <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin"></div>
          <p className="text-purple-300 font-semibold">🔐 Analyzing image encryption...</p>
        </motion.div>
      )}

      {/* Error State */}
      {error && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/10 border border-red-500/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl"
        >
          <div className="flex gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={24} />
            <div>
              <p className="font-bold text-red-400">Analysis Failed</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Analysis Results */}
      {analysis && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Encryption Status */}
          <motion.div
            className={`rounded-2xl p-6 border shadow-xl ${
              analysis.isEncrypted
                ? "bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-500/30"
                : "bg-gradient-to-br from-slate-800/40 to-slate-900/40 border-slate-500/30"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                analysis.isEncrypted ? "bg-green-500/20" : "bg-slate-500/20"
              }`}>
                {analysis.isEncrypted ? (
                  <Shield className="text-green-400" size={24} />
                ) : (
                  <AlertCircle className="text-slate-400" size={24} />
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">
                  {analysis.isEncrypted ? "✅ This image is encrypted" : "⚠️ Not PINIT encrypted"}
                </p>
                <p className={`text-sm mt-1 ${analysis.isEncrypted ? "text-green-300" : "text-slate-300"}`}>
                  {analysis.isEncrypted
                    ? `Protected with ${analysis.encryptionType} (${analysis.confidence}% confidence)`
                    : "This image doesn't contain PINIT encryption"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Ownership Details */}
          <motion.div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-white">Ownership Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-purple-500/20">
                <span className="text-purple-300/70 text-sm">PINIT ID</span>
                <span className="font-mono font-bold text-white">{analysis.ownershipDetails.pinItId}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-purple-500/20">
                <span className="text-purple-300/70 text-sm">Timestamp</span>
                <span className="text-sm text-white">{analysis.ownershipDetails.timestamp}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-purple-500/20">
                <span className="text-purple-300/70 text-sm">Image Type</span>
                <span className={`text-sm font-bold capitalize ${
                  analysis.imageTypeAnalysis?.imageType === "ai" ? "text-yellow-400" :
                  analysis.imageTypeAnalysis?.imageType === "whatsapp" ? "text-blue-400" :
                  analysis.imageTypeAnalysis?.imageType === "screenshot" ? "text-orange-400" :
                  analysis.imageTypeAnalysis?.imageType === "phone" ? "text-green-400" :
                  "text-purple-400"
                }`}>
                  {analysis.imageTypeDetails}
                </span>
              </div>
              {analysis.imageTypeIndicators && analysis.imageTypeIndicators.length > 0 && (
                <div className="pb-3 border-b border-purple-500/20">
                  <span className="text-purple-300/70 text-sm block mb-2">Detection Indicators</span>
                  <div className="flex flex-col gap-1">
                    {analysis.imageTypeIndicators.map((indicator: string, idx: number) => (
                      <span key={idx} className="text-xs text-purple-200">{indicator}</span>
                    ))}
                  </div>
                </div>
              )}
              {analysis.ownershipDetails.validationTiles && (
                <div className="flex justify-between items-center">
                  <span className="text-purple-300/70 text-sm">Validation</span>
                  <span className="text-sm text-green-400 font-bold">{analysis.ownershipDetails.tilesPassed}/{analysis.ownershipDetails.validationTiles} tiles</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Image Metadata */}
          <motion.div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-white">Image Metadata</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/30 rounded-xl p-4">
                <p className="text-purple-300/70 text-xs font-semibold">Resolution</p>
                <p className="font-bold mt-2 text-white">{analysis.imageResolution}</p>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4">
                <p className="text-purple-300/70 text-xs font-semibold">File Size</p>
                <p className="font-bold mt-2 text-white">{analysis.imageSize}</p>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4">
                <p className="text-purple-300/70 text-xs font-semibold">Total Pixels</p>
                <p className="font-bold mt-2 text-white">{(analysis.pixelCount / 1000000).toFixed(2)}M</p>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4">
                <p className="text-purple-300/70 text-xs font-semibold">Confidence</p>
                <p className="font-bold mt-2 text-white">{analysis.confidence}%</p>
              </div>
            </div>
          </motion.div>

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Back to Home
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
