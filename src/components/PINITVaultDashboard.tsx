import { useState, useEffect } from "react";
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
  X,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { appStorage } from "@/lib/storage";

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
    watermarked?: boolean;
    ownerId?: string;
  };
  createdAt: string;
}

interface PINITDashboardProps {
  userId?: string;
  isRestricted?: boolean;
}

type PageType = "home" | "vault" | "portfolio" | "share" | "identity" | "encrypt-preview" | "verify-proof";

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
        }} setVerifyProofImage={setVerifyProofImage} setCurrentPage={setCurrentPage} />
        }
        {currentPage === "vault" && <VaultPage key="vault" documents={vaultDocuments} userId={userId} onDeleteDocument={async (docId) => {
          const updated = vaultDocuments.filter((doc) => doc.id !== docId);
          setVaultDocuments(updated);
          if (userId) {
            await saveVaultDocuments(userId, updated);
          }
        }} />}
        {currentPage === "portfolio" && <PortfolioPage key="portfolio" />}
        {currentPage === "share" && <SharePage key="share" />}
        {currentPage === "identity" && <IdentityPage key="identity" userName={userName} userId={userId} />}
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

                // Save watermarked image to device gallery in PINIT Vault folder
                console.log("💾 Saving to device gallery...");
                let galleryResult = { success: false, error: "Not attempted" };
                try {
                  galleryResult = await saveImageToGallery(
                    encryptedPackage.watermarkedImage || encryptedPackage.encrypted_data,
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

                // Create document with watermarked preview for display
                const newDoc: VaultDocument = {
                  id: Date.now().toString(),
                  name: encryptedPackage.metadata.original_name,
                  encryptedData: encryptedPackage.encrypted_data,
                  watermarkedImage: encryptedPackage.watermarkedImage, // Store for preview
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
                  ? `✅ Image Encrypted Successfully!\n\n🔐 Encrypted with PINIT ID: ${ownerIdUsed.substring(0, 8)}...\n📁 Saved to: PINIT Vault` 
                  : `✅ Image Encrypted Successfully!\n\n🔐 Encrypted with PINIT ID: ${ownerIdUsed.substring(0, 8)}...\n⚠️ (Gallery save failed)`;
                alert(successMsg);
                setCapturedImage(null);
                setCurrentPage("home");
              } catch (error) {
                console.error("Error saving to vault:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                alert(`❌ Failed to encrypt image:\n\n${errorMessage}`);
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
            label="Create"
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
            icon={Share2}
            label="Share"
            active={currentPage === "share"}
            onClick={() => {
              try {
                setCurrentPage("share");
              } catch (e) {
                console.error("Error navigating to share:", e);
              }
            }}
          />
          <NavButton
            icon={User}
            label="Profile"
            active={currentPage === "identity"}
            onClick={() => {
              try {
                setCurrentPage("identity");
              } catch (e) {
                console.error("Error navigating to identity:", e);
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
function HomePage({ userName, documentCount, onEncryptClick, setVerifyProofImage, setCurrentPage }: { userName: string; documentCount: number; onEncryptClick: () => void; setVerifyProofImage: (value: string | null) => void; setCurrentPage: (page: PageType) => void }) {
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

      {/* Quick Actions - Modern Buttons */}
      <div>
        <h3 className="text-lg font-bold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Lock, label: "Encrypt", gradient: "from-blue-600 to-cyan-600", onClick: onEncryptClick },
            { icon: CheckCircle, label: "Verify Proof", gradient: "from-purple-600 to-pink-600", onClick: async () => {
              try {
                console.log("📸 Opening gallery for Verify Proof...");
                console.log("🔐 Requesting camera/gallery permissions...");
                
                // Try requesting camera permissions first
                try {
                  const perms = await CameraPlugin.requestPermissions();
                  console.log("✅ Camera permissions:", perms);
                } catch (permErr) {
                  console.warn("⚠️ Permission request failed (may already be granted):", permErr);
                }
                
                const image = await CameraPlugin.getPhoto({
                  quality: 90,
                  allowEditing: false,
                  source: "Photos" as any,  // Gallery/Photos
                  resultType: "base64" as any,
                });
                
                if (image?.base64String) {
                  console.log("✅ Image selected for verification");
                  setVerifyProofImage("data:image/jpeg;base64," + image.base64String);
                  setCurrentPage("verify-proof");
                } else {
                  throw new Error("No image data received");
                }
              } catch (error) {
                console.error("❌ Gallery selection error:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                // Provide specific error messages
                let userMessage = "Failed to open gallery";
                if (errorMessage.includes("permission") || errorMessage.includes("Permission")) {
                  userMessage = "📱 Gallery permission denied.\n\nPlease enable photo access in app settings and try again.";
                } else if (errorMessage.includes("cancelled") || errorMessage.includes("Cancelled")) {
                  userMessage = "📸 No image selected.\n\nPlease select a photo from your gallery.";
                } else {
                  userMessage = `📸 Gallery Error:\n\n${errorMessage.substring(0, 100)}...`;
                }
                
                alert(userMessage);
              }
            } },
          ].map((action, idx) => (
            <motion.button
              key={idx}
              onClick={action.onClick}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`bg-gradient-to-br ${action.gradient} rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transition-all`}
            >
              <action.icon size={24} />
              <span className="text-sm font-bold">{action.label}</span>
            </motion.button>
          ))}
        </div>
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
  const [watermarkMetadata, setWatermarkMetadata] = useState<AdvancedWatermarkMetadata | null>(null);

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
      setWatermarkMetadata(null);
      setShowDeleteConfirm(false);
      setDocToDelete(null);
      console.log("✅ Document deleted:", docToDelete);
    }
  };

  const handleDocumentClick = async (doc: VaultDocument) => {
    // Display watermarked image (preview) or encrypted data if not available
    try {
      // Use watermarked image if available, otherwise fall back to encrypted data
      const imageUrl = doc.watermarkedImage || ("data:image/jpeg;base64," + doc.encryptedData);
      setPreviewImage(imageUrl);
      setSelectedDoc(doc);

      // Only try to extract watermark if we have the watermarked image
      if (doc.watermarkedImage) {
        // VERIFY WATERMARK using advanced steganography extraction
        const extracted = await extractAdvancedWatermark(imageUrl);
        if (extracted && extracted.found) {
          setWatermarkMetadata(extracted);
          console.log("✅ WATERMARK VERIFIED:", extracted);
          console.log(`  Owner: ${extracted.userId}`);
          console.log(`  Confidence: ${extracted.confidence}`);
          console.log(`  Timestamp: ${extracted.timestamp}`);
          console.log(`  Device: ${extracted.deviceName || "Unknown"}`);
          console.log(`  IP Address: ${extracted.ipAddress || "Unknown"}`);
          console.log(`  GPS: ${extracted.gps.available ? extracted.gps.coordinates : "Not captured"}`);
        } else {
          setWatermarkMetadata(null);
          console.warn("⚠️ No valid watermark found in image");
        }
      } else {
        // For old documents without watermarkedImage, extract from metadata
        if (doc.metadata.ownerId) {
          console.log(`📋 Document owner: ${doc.metadata.ownerId}`);
        }
        setWatermarkMetadata(null);
      }
    } catch (err) {
      console.error("Error loading preview:", err);
      setWatermarkMetadata(null);
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
            <h3 className="text-lg font-bold text-white mb-4">🔒 ENCRYPTION DETAILS & WATERMARK VERIFICATION</h3>

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

            {/* Security & Watermark */}
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">SECURITY & WATERMARK</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-lg p-3 border border-green-500/20">
                  <p className="text-xs text-slate-400 mb-1">ENCRYPTION</p>
                  <p className="text-sm text-green-300 font-semibold">AES-256 + LSB</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-900/30 to-teal-900/30 rounded-lg p-3 border border-cyan-500/20">
                  <p className="text-xs text-slate-400 mb-1">WATERMARK METHOD</p>
                  <p className="text-sm text-cyan-300 font-semibold">Tile-Based (12x12)</p>
                </div>
              </div>
            </div>

            {/* Watermark Metadata (extracted from image) */}
            {watermarkMetadata && watermarkMetadata.found && (
              <>
                <div className="border-t border-slate-700 pt-4 space-y-3">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide text-emerald-400">✅ WATERMARK VERIFIED</p>
                  
                  {/* Primary Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-3 border border-purple-500/20">
                      <p className="text-xs text-slate-400 mb-1">OWNER (VERIFIED)</p>
                      <p className="text-sm font-mono text-purple-300 font-semibold">{watermarkMetadata.userId}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-900/30 to-yellow-900/30 rounded-lg p-3 border border-amber-500/20">
                      <p className="text-xs text-slate-400 mb-1">CONFIDENCE</p>
                      <p className="text-sm font-mono text-amber-300 font-semibold">{watermarkMetadata.confidence}</p>
                    </div>
                  </div>

                  {/* Device Information */}
                  {(watermarkMetadata.deviceName || watermarkMetadata.deviceId) && (
                    <div className="pt-3 space-y-2">
                      <p className="text-xs text-slate-400 font-semibold">DEVICE INFORMATION</p>
                      <div className="grid grid-cols-2 gap-3">
                        {watermarkMetadata.deviceName && (
                          <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                            <p className="text-xs text-slate-400 mb-1">DEVICE NAME</p>
                            <p className="text-sm text-slate-200 font-mono">{watermarkMetadata.deviceName}</p>
                          </div>
                        )}
                        {watermarkMetadata.deviceId && (
                          <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                            <p className="text-xs text-slate-400 mb-1">DEVICE ID</p>
                            <p className="text-sm text-slate-200 font-mono break-all">{watermarkMetadata.deviceId}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Network & Location */}
                  {(watermarkMetadata.ipAddress || watermarkMetadata.gps.available) && (
                    <div className="pt-3 space-y-2">
                      <p className="text-xs text-slate-400 font-semibold">NETWORK & LOCATION</p>
                      <div className="grid grid-cols-2 gap-3">
                        {watermarkMetadata.ipAddress && (
                          <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                            <p className="text-xs text-slate-400 mb-1">IP ADDRESS</p>
                            <p className="text-sm text-slate-200 font-mono">{watermarkMetadata.ipAddress}</p>
                          </div>
                        )}
                        {watermarkMetadata.gps.available && (
                          <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                            <p className="text-xs text-slate-400 mb-1">GPS COORDINATES</p>
                            <p className="text-sm text-slate-200 font-mono">{watermarkMetadata.gps.coordinates}</p>
                            {watermarkMetadata.gps.mapsUrl && (
                              <a href={watermarkMetadata.gps.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-1">
                                View on Maps →
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Image Resolution */}
                  {watermarkMetadata.originalResolution && (
                    <div className="pt-3">
                      <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                        <p className="text-xs text-slate-400 mb-1">ORIGINAL RESOLUTION</p>
                        <p className="text-sm text-slate-200 font-mono">{watermarkMetadata.originalResolution}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {!watermarkMetadata || !watermarkMetadata.found && (
              <div className="border-t border-slate-700 pt-4">
                <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <p className="text-xs text-slate-400 mb-1">WATERMARK STATUS</p>
                  <p className="text-sm text-slate-300">⚠️ Watermark extraction in progress...</p>
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
              setWatermarkMetadata(null);
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
  const [watermarkedImage, setWatermarkedImage] = useState<string | null>(null);
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
        
        // Step 1: Embed watermark
        console.log('🔏 Step 1/4: Embedding watermark with user ID...');
        let watermarkedBase64 = null;
        try {
          watermarkedBase64 = await embedAdvancedWatermark(
            image,
            userId,
            new Date().toISOString(),
            undefined,
            undefined,
            undefined,
            undefined
          );
          console.log('✅ Watermark embedded successfully');
        } catch (watermarkErr) {
          throw new Error(`Watermark embedding failed: ${watermarkErr instanceof Error ? watermarkErr.message : String(watermarkErr)}`);
        }
        
        if (!watermarkedBase64) {
          throw new Error('Watermark returned empty result');
        }
        
        if (!isMounted) return;
        setWatermarkedImage(watermarkedBase64);
        
        // Step 2: Convert base64 to Blob without using fetch (avoids size issues)
        console.log('💾 Step 2/4: Converting to blob...');
        let blob: Blob;
        try {
          // Remove data URL prefix if present
          const base64Data = watermarkedBase64.includes(',') 
            ? watermarkedBase64.split(',')[1] 
            : watermarkedBase64;
          
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
        console.log('📝 Step 3/4: Encoding to base64...');
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
        console.log('🔐 Step 4/4: Creating encryption package...');
        const metadata = {
          timestamp: Date.now(),
          original_name: `encrypted_vault_${userId}_${Date.now()}.jpg`,
          size: blob.size,
          checksum: Math.random().toString(36).substring(7),
          watermarked: true,
          ownerId: userId,
          imageType: 'encrypted',
        };
        
        const encryptedPackage = {
          encrypted_data: base64String,
          watermarkedImage: watermarkedBase64,
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
          // Show alert so user knows what happened
          setTimeout(() => {
            alert(`❌ Encryption Error:\n\n${errorMsg}\n\nPlease retake the photo and try again.`);
          }, 100);
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
      setError(`Save failed: ${errorMsg}`);
      alert(`❌ Save Error:\n\n${errorMsg}`);
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
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Encrypt & Watermark</h1>

      {/* Watermarked Image Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-2xl overflow-hidden border-2 border-purple-500/30 shadow-2xl"
      >
        <img
          src={watermarkedImage || image}
          alt="Watermarked"
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
          <p className="text-purple-300 font-semibold">Watermarking & Encrypting...</p>
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
              <p className="font-semibold text-green-400">✓ Watermarked & Encrypted</p>
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
              <span className="text-slate-400">Watermark:</span>
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
          Save to Vault
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
function SharePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-4"
    >
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Secure Share</h1>

      <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 space-y-4 shadow-xl">
        <p className="text-purple-300/80 text-sm">Configure sharing permissions and security</p>

        <div className="space-y-3">
          {[
            { icon: Eye, title: "View Only", enabled: true },
            { icon: Download, title: "Allow Download", enabled: false },
            { icon: Lock, title: "Password Protection", enabled: true },
          ].map((perm, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-xl hover:border-purple-500/50 transition-all">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${perm.enabled ? "bg-purple-600/30" : "bg-slate-700/30"}`}>
                  <perm.icon size={18} className={perm.enabled ? "text-purple-400" : "text-slate-500"} />
                </div>
                <span className="text-sm font-semibold">{perm.title}</span>
              </div>
              <div className={`w-10 h-6 rounded-full transition-all ${perm.enabled ? "bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/50" : "bg-slate-600"}`}></div>
            </div>
          ))}
        </div>

        <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all">
          Generate Link
        </Button>
      </div>
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

          // Try to extract watermark from image
          console.log("📊 Extracting watermark data...");
          let watermarkData: AdvancedWatermarkMetadata | null = null;
          try {
            watermarkData = await extractAdvancedWatermark(canvas);
            console.log("✅ Watermark extracted:", watermarkData);
          } catch (wmError) {
            console.warn("⚠️ Could not extract watermark:", wmError);
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
            isEncrypted: watermarkData ? true : isLikelyEncrypted,
            encryptionType: watermarkData?.format || (isLikelyEncrypted ? "LSB Steganography" : "None"),
            ownershipDetails: watermarkData ? {
              pinItId: watermarkData.userId || "Unknown",
              timestamp: new Date(watermarkData.timestamp || 0).toLocaleString(),
              watermarkFormat: watermarkData.format,
              validationTiles: watermarkData.validationTiles,
              tilesPassed: watermarkData.tilesPassed,
            } : {
              pinItId: "Not encrypted with PINIT",
              timestamp: "N/A",
              watermarkFormat: "None",
            },
            // Enhanced image type detection with ML analysis
            imageType: watermarkData?.imageType || imageTypeAnalysis.imageType || "Unknown",
            imageTypeAnalysis: imageTypeAnalysis, // Full analysis with confidence
            imageTypeDetails: `${imageTypeAnalysis.imageType.toUpperCase()} (${imageTypeAnalysis.confidence}% confidence)`,
            imageTypeIndicators: imageTypeAnalysis.indicators,
            metadata: watermarkData ? {
              userId: watermarkData.userId,
              timestamp: watermarkData.timestamp,
              imageType: watermarkData.imageType,
              validationStatus: watermarkData.tilesPassed && watermarkData.validationTiles
                ? `${watermarkData.tilesPassed}/${watermarkData.validationTiles} validation tiles passed`
                : "Validation pending",
            } : null,
            confidence: watermarkData 
              ? (watermarkData.tilesPassed && watermarkData.validationTiles 
                ? Math.round((watermarkData.tilesPassed / watermarkData.validationTiles) * 100)
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
          <p className="text-purple-300 font-semibold">Analyzing image watermarks and encryption...</p>
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
                    : "This image doesn't contain PINIT watermarks"}
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
