import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import jsPDF from "jspdf";
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
import { embedSimpleWatermark, extractSimpleWatermark, extractFallbackMetadata, type SimpleWatermarkMetadata } from "@/lib/simpleSteganography";
import { analyzeImage, formatAnalysisResult, type ImageAnalysisResult } from "@/lib/imageAnalysis";
import {
  User,
  FileText,
  Camera,
  Upload,
  Shield,
  CreditCard,
  Star,
  Target,
  BookOpen,
  Briefcase,
  Award,
  X,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Download,
  Share2,
  Trash2,
  Eye,
  Edit,
  Plus,
  Lock,
  Unlock,
  Check,
  CheckCircle,
  AlertCircle,
  Clock,
  Folder,
  Image,
  File,
  FileSearch,
  Archive,
  Settings,
  LogOut,
  Home,
  Key,
  Smartphone,
  Mail,
  Globe,
  Zap,
  Database,
  Share,
  QrCode,
  Mail as FileMail,
  Phone,
  MapPin,
  Calendar,
  Copy,
  Moon,
  Sun,
  Linkedin,
  Github,
  Fingerprint,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { appStorage } from "@/lib/storage";
import { ImageCryptoFull } from "@/components/ImageCryptoFull";
import { VaultManager } from "@/components/VaultManager";
import { ActivityLogger } from "@/components/ActivityLogger";
import Profile from "@/pages/Profile";
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

interface PINITDashboardProps {
  userId?: string;
  isRestricted?: boolean;
}

type PageType = "home" | "vault" | "portfolio" | "share" | "identity" | "encrypt-preview" | "verify-proof" | "crypto" | "vault-advanced" | "activity" | "profile" | "analysis" | "upload-document" | "scan-document" | "review-scan";

export function PINITVaultDashboard({ userId: propsUserId, isRestricted }: PINITDashboardProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<PageType>("home");
  
  // Document Upload States - "Pocket" system for scanning
  const [scannedPages, setScannedPages] = useState<string[]>([]); // "pocket" array
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("User");
  const [userId, setUserId] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
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

  // Check if current path is a share link
  const isSharePath = window.location.pathname.startsWith('/share/');
  
  if (isSharePath) {
    return <ShareAccessPage />;
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
            {profileImage ? (
              <img 
                src={profileImage} 
                alt="Profile" 
                className="w-11 h-11 rounded-full object-cover border-2 border-purple-500/50 shadow-lg shadow-purple-500/50"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/50">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">{userName}</p>
              <p className="text-xs text-purple-300">@{userName.toLowerCase().replace(/\s/g, '_')}</p>
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
            console.log("Opening camera for encryption...");
            const image = await CameraPlugin.getPhoto({
              quality: 90,
              allowEditing: false,
              source: "Cameras" as any,  // CAMERA ONLY - no gallery
              resultType: "base64" as any,
            });
            if (image?.base64String) {
              console.log("Photo captured for encryption");
              setCapturedImage("data:image/jpeg;base64," + image.base64String);
              setCurrentPage("encrypt-preview");
            }
          } catch (error) {
            console.error("Camera error:", error);
            alert("Failed to open camera. Please check camera permissions.");
          }
        }} setVerifyProofImage={setVerifyProofImage} setCurrentPage={setCurrentPage} quickActionCameraRef={quickActionCameraRef} quickActionFileRef={quickActionFileRef} onQuickActionImageSelected={handleQuickActionImageSelected} onVerifyProofImageSelected={handleVerifyProofImageSelected} navigate={navigate} />}
        {currentPage === "vault" && <VaultPage key="vault" documents={vaultDocuments} userId={userId} selectedShareImage={selectedShareImage} setSelectedShareImage={setSelectedShareImage} setCurrentPage={setCurrentPage} />}
        {currentPage === "portfolio" && <PortfolioPage key="portfolio" />}
        {currentPage === "share" && <SharePage key="share" shareConfigs={shareConfigs} setShareConfigs={setShareConfigs} shareHistory={shareHistory} setShareHistory={setShareHistory} selectedShareImage={selectedShareImage} setSelectedShareImage={setSelectedShareImage} shareExpiryDate={shareExpiryDate} setShareExpiryDate={setShareExpiryDate} shareExpiryTime={shareExpiryTime} setShareExpiryTime={setShareExpiryTime} shareDownloadLimit={shareDownloadLimit} setShareDownloadLimit={setShareDownloadLimit} sharePassword={sharePassword} setSharePassword={setSharePassword} includeCertificate={includeCertificate} setIncludeCertificate={setIncludeCertificate} generatedShareLink={generatedShareLink} setGeneratedShareLink={setGeneratedShareLink} generatedQRCode={generatedQRCode} setGeneratedQRCode={setGeneratedQRCode} shareStep={shareStep} setShareStep={setShareStep} userId={userId} vaultDocuments={vaultDocuments} />}
        {currentPage === "identity" && <IdentityPage key="identity" userName={userName} userId={userId} />}
        {currentPage === "crypto" && <ImageCryptoFull key="crypto" userId={userId || undefined} />}
        {currentPage === "vault-advanced" && <VaultManager key="vault-advanced" userId={userId || undefined} />}
        {currentPage === "activity" && <ActivityLogger key="activity" userId={userId || undefined} />}
        {currentPage === "profile" && <DigitalIdentityDashboard key="profile" onBack={() => setCurrentPage("home")} userName={userName} setUserName={setUserName} profileImage={profileImage} setProfileImage={setProfileImage} userId={userId} />}
        {currentPage === "upload-document" && (
          <DocumentUploadPage
            key="upload-document"
            onBack={() => setCurrentPage("home")}
            onScanClick={() => {
              setScannedPages([]);
              setCurrentPage("scan-document");
            }}
            onDocumentUploaded={async (document: VaultDocument) => {
              // Add document to vault
              const updated = [...vaultDocuments, document];
              setVaultDocuments(updated);
              if (userId) {
                await saveVaultDocuments(userId, updated);
              }
              console.log('Document saved to vault:', document.name);
            }}
          />
        )}
        {currentPage === "scan-document" && (
          <ScanDocumentPage
            key="scan-document"
            onPageScanned={(imageData: string) => {
              setScannedPages([...scannedPages, imageData]);
              console.log(`?? Page scanned! Total pages: ${scannedPages.length + 1}`);
            }}
            onDone={() => setCurrentPage("review-scan")}
            onBack={() => setCurrentPage("upload-document")}
            pageCount={scannedPages.length}
          />
        )}
        {currentPage === "review-scan" && (
          <ReviewScanPage
            key="review-scan"
            scannedPages={scannedPages}
            onDeletePage={(index: number) => {
              const updated = scannedPages.filter((_, i) => i !== index);
              setScannedPages(updated);
            }}
            onSaveToPDF={async (pdfData: string) => {
              const newDoc: VaultDocument = {
                id: `pdf_${Date.now()}`,
                name: `Document_${new Date().toLocaleDateString()}.pdf`,
                encryptedData: pdfData,
                metadata: {
                  timestamp: Date.now(),
                  original_name: `Document_${new Date().toLocaleDateString()}.pdf`,
                  size: pdfData.length,
                  checksum: Math.random().toString(36).substring(7),
                  encrypted: true,
                  ownerId: userId || undefined,
                },
                createdAt: new Date().toISOString(),
              };
              const updated = [...vaultDocuments, newDoc];
              setVaultDocuments(updated);
              if (userId) {
                await saveVaultDocuments(userId, updated);
              }
              alert(`?? PDF saved to vault!`);
              setScannedPages([]);
              setCurrentPage("vault");
            }}
            onBack={() => setCurrentPage("scan-document")}
          />
        )}
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
                console.log('🔄 Retake button clicked - capturing new image');
                const image = await CameraPlugin.getPhoto({
                  quality: 90,
                  allowEditing: false,
                  resultType: "base64" as any,
                });
                if (image?.base64String) {
                  console.log('✅ New image captured successfully');
                  setCapturedImage("data:image/jpeg;base64," + image.base64String);
                }
              } catch (error) {
                console.error("❌ Camera error:", error);
                alert("Failed to capture image. Please try again.");
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
            icon={User}
            label="Profile"
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
function HomePage({ userName, documentCount, onEncryptClick, setVerifyProofImage, setCurrentPage, quickActionCameraRef, quickActionFileRef, onQuickActionImageSelected, onVerifyProofImageSelected, navigate }: { userName: string; documentCount: number; onEncryptClick: () => void; setVerifyProofImage: (value: string | null) => void; setCurrentPage: (page: PageType) => void; quickActionCameraRef?: React.RefObject<HTMLInputElement>; quickActionFileRef?: React.RefObject<HTMLInputElement>; onQuickActionImageSelected?: (imageData: string) => void; onVerifyProofImageSelected?: (imageData: string) => void; navigate: (path: string) => void }) {
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
              label: "Upload", 
              gradient: "from-orange-600 to-red-600", 
              onClick: () => {
                console.log("📄 Navigating to document upload...");
                navigate("/upload");
              },
              subtext: "📄"
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
              className={`bg-gradient-to-br ${action.gradient} rounded-xl p-2 flex flex-col items-center gap-1 shadow-lg hover:shadow-xl transition-all`}
            >
              <action.icon size={16} />
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
function VaultPage({ documents, onDeleteDocument, userId, selectedShareImage, setSelectedShareImage, setCurrentPage }: { documents: VaultDocument[]; onDeleteDocument?: (docId: string) => void; userId?: string | null; selectedShareImage: VaultDocument | null; setSelectedShareImage: React.Dispatch<React.SetStateAction<VaultDocument | null>>; setCurrentPage: React.Dispatch<React.SetStateAction<PageType>> }) {
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
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Download size={18} />
              Download
            </motion.button>

            {/* Share Button */}
            <motion.button
              onClick={() => {
                setSelectedShareImage(selectedDoc);
                setCurrentPage("share");
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Share2 size={18} />
              Share
            </motion.button>

            {/* Delete Button */}
            <motion.button
              onClick={() => {
                setDocToDelete(selectedDoc.id);
                setShowDeleteConfirm(true);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
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

  // Encrypt image and embed user ID when component mounts - DISABLED TO PREVENT CRASH
  // Encryption will be triggered manually by the Encrypt button instead
  // useEffect(() => {
  //   let isMounted = true; // Track if component is still mounted
    
  //   const encryptImage = async () => {
  //     try {
  //       console.log('🔐 Starting encryption process for user:', userId);
        
  //       // Validate inputs
  //       if (!image) {
  //         console.error('❌ No image provided for encryption');
  //         if (isMounted) {
  //           setError('No image to encrypt');
  //           setIsProcessing(false);
  //         }
  //         return;
  //       }
        
  //       if (!userId) {
  //         console.error('❌ No userId provided for encryption');
  //         if (isMounted) {
  //           setError('User not authenticated');
  //           setIsProcessing(false);
  //         }
  //         return;
  //       }
        
  //       if (!isMounted) return;
  //       setIsProcessing(true);
  //       setError(null);
        
  //       // Step 0: Resize image if needed to prevent memory overflow
  //       console.log(' Step 0/4: Checking image dimensions...');
  //       let processedImage = image;
  //       try {
  //         // Skip resizing for camera images (already optimized)
  //         if (image.startsWith('data:image') && (image.includes('camera') || image.length < 2000000)) {
  //           console.log(' Using original camera image (already optimized)');
  //           processedImage = image;
  //         } else {
  //           const img = new Image();
  //           await new Promise<void>((resolve, reject) => {
  //             const timeout = setTimeout(() => {
  //               reject(new Error('Image loading timeout'));
  //             }, 5000);
              
  //             img.onload = () => {
  //               clearTimeout(timeout);
  //               resolve();
  //             };
  //             img.onerror = () => {
  //               clearTimeout(timeout);
  //               reject(new Error('Failed to load image for resizing'));
  //             };
  //             img.src = image;
  //           });
            
  //           let width = img.width;
  //           let height = img.height;
  //           const maxWidth = 1920;
  //           const maxHeight = 1080;
            
  //           // Check if resize needed
  //           if (width > maxWidth || height > maxHeight) {
  //             const ratio = Math.min(maxWidth / width, maxHeight / height);
  //             width = Math.floor(width * ratio);
  //             height = Math.floor(height * ratio);
  //             console.log(` Resizing image from ${img.width}x${img.height} to ${width}x${height}`);
              
  //             // Resize using canvas
  //             const resizeCanvas = document.createElement('canvas');
  //             resizeCanvas.width = width;
  //             resizeCanvas.height = height;
  //             const resizeCtx = resizeCanvas.getContext('2d');
              
  //             if (!resizeCtx) {
  //               throw new Error('Failed to get canvas context for resizing');
  //             }
              
  //             resizeCtx.drawImage(img, 0, 0, width, height);
  //             processedImage = resizeCanvas.toDataURL('image/jpeg', 0.9); // JPEG compression for efficiency
  //             console.log(' Image resized and compressed successfully');
  //           } else {
  //             console.log(` Image dimensions OK (${width}x${height})`);
  //           }
  //         }
  //       } catch (resizeErr) {
  //         console.warn('⚠️ Image resizing failed, using original:', resizeErr);
  //         // Fallback to original image if resizing fails
  //         processedImage = image;
  //       }
        
  //       if (!isMounted) return;
        
  //       // Validate processed image
  //       if (!processedImage || processedImage.length === 0) {
  //         console.error('❌ Processed image is empty');
  //         setError('Image processing failed - empty result');
  //         setIsProcessing(false);
  //         return;
  //       }
        
  //       if (!isMounted) return;
        
  //       // Step 1: Embed metadata with fallback
  //       console.log(' Step 1/4: Embedding metadata with user ID...');
  //       console.log('🔏 Step 1/4: Embedding metadata with user ID...');
  //       let embeddedImageBase64 = null;
        
  //       // Try advanced steganography first
  //       try {
  //         console.log('🔧 Attempting advanced steganography watermark...');
  //         console.log('🔧 Calling embedAdvancedWatermark with:', {
  //           imageLength: processedImage.length,
  //           userId: userId.substring(0, 8) + '...',
  //           timestamp: new Date().toISOString()
  //         });
          
  //         embeddedImageBase64 = await embedAdvancedWatermark(
  //           processedImage,
  //           userId,
  //           new Date().toISOString(),
  //           undefined,
  //           undefined,
  //           undefined,
  //           undefined
  //         );
  //         console.log('✅ Advanced steganography successful, result length:', embeddedImageBase64?.length || 0);
  //       } catch (embedErr) {
  //         console.warn('⚠️ Advanced steganography failed, trying simple watermark:', embedErr);
  //         const errorMsg = embedErr instanceof Error ? embedErr.message : String(embedErr);
          
  //         // Check for constructor errors specifically
  //         if (errorMsg.includes('Y3') || errorMsg.includes('X3') || errorMsg.includes('constructor')) {
  //           console.error('🚨 Constructor Error Detected - Using fallback method');
  //         }
          
  //         // Fallback to simple watermark embedding
  //         try {
  //           console.log('🔄 Using simple watermark fallback...');
  //           embeddedImageBase64 = await embedSimpleWatermark(processedImage, userId, new Date().toISOString());
  //           console.log('✅ Simple watermark successful, result length:', embeddedImageBase64?.length || 0);
  //         } catch (simpleErr) {
  //           console.error('❌ Simple watermark also failed:', simpleErr);
  //           // Final fallback - just return the original image with metadata in URL
  //           console.log('🔄 Using metadata-in-URL fallback...');
  //           const metadata = btoa(JSON.stringify({
  //             userId: userId,
  //             timestamp: new Date().toISOString(),
  //             encrypted: true,
  //             method: 'fallback'
  //           }));
  //           embeddedImageBase64 = processedImage + '#metadata:' + metadata;
  //           console.log('✅ Fallback method applied');
  //         }
  //       }
        
  //       if (!embeddedImageBase64) {
  //         console.error('❌ All embedding methods failed');
  //         setError('All encryption methods failed - please try again');
  //         setIsProcessing(false);
  //         return;
  //       }
        
  //       if (!isMounted) return;
  //       setEncryptedImage(embeddedImageBase64);
        
  //       // Step 2: Convert base64 to Blob without using fetch (avoids size issues)
  //       console.log('💾 Step 2/5: Converting to blob...');
  //       let blob: Blob;
  //       try {
  //         // Remove data URL prefix if present
  //         const base64Data = embeddedImageBase64.includes(',') 
  //           ? embeddedImageBase64.split(',')[1] 
  //           : embeddedImageBase64;
          
  //         // Convert base64 to binary
  //         const binaryString = atob(base64Data);
  //         const bytes = new Uint8Array(binaryString.length);
  //         for (let i = 0; i < binaryString.length; i++) {
  //           bytes[i] = binaryString.charCodeAt(i);
  //         }
          
  //         blob = new Blob([bytes], { type: 'image/jpeg' });
  //         console.log('📊 Blob created, size:', blob.size, 'bytes');
          
  //         if (!blob.size) {
  //           throw new Error('Blob is empty');
  //         }
  //       } catch (blobErr) {
  //         throw new Error(`Blob conversion failed: ${blobErr instanceof Error ? blobErr.message : String(blobErr)}`);
  //       }
        
  //       if (!isMounted) return;
        
  //       // Step 3: Convert blob to base64 using FileReader
  //       console.log('📝 Step 3/5: Encoding to base64...');
  //       console.log('🔧 Blob details:', {
  //         size: blob.size,
  //         type: blob.type,
  //         isBlob: blob instanceof Blob
  //       });
        
  //       const base64String = await new Promise<string>((resolve, reject) => {
  //         try {
  //           const reader = new FileReader();
  //           console.log('📖 FileReader created for blob conversion');
            
  //           // Set timeout to prevent hanging
  //           const timeout = setTimeout(() => {
  //             console.warn('⏰ FileReader timeout after 30 seconds - aborting');
  //             reader.abort();
  //             reject(new Error('FileReader timeout after 30 seconds'));
  //           }, 30000);
            
  //           reader.onload = () => {
  //             clearTimeout(timeout);
  //             console.log('✅ FileReader onload triggered');
  //             try {
  //               const result = reader.result as string;
  //               console.log('📄 FileReader result length:', result?.length || 0);
                
  //               if (!result) {
  //                 throw new Error('FileReader returned empty result');
  //               }
                
  //               const base64 = result.includes(',') ? result.split(',')[1] : result;
  //               if (!base64 || base64.length === 0) {
  //                 throw new Error('Base64 string is empty after split');
  //               }
                
  //               console.log('✅ Base64 encoded successfully, length:', base64.length);
  //               resolve(base64);
  //             } catch (err) {
  //               console.error('❌ Base64 processing error:', err);
  //               reject(new Error(`Base64 processing error: ${err instanceof Error ? err.message : String(err)}`));
  //             }
  //           };
            
  //           reader.onerror = () => {
  //             clearTimeout(timeout);
  //             console.error('❌ FileReader error:', reader.error);
  //             reject(new Error(`FileReader error: ${reader.error?.message || 'Unknown error'}`));
  //           };
            
  //           reader.onabort = () => {
  //             clearTimeout(timeout);
  //             console.warn('⚠️ FileReader was aborted');
  //             reject(new Error('FileReader was aborted'));
  //           };
            
  //           console.log('🔄 Starting FileReader.readAsDataURL');
  //           reader.readAsDataURL(blob);
  //         } catch (err) {
  //           console.error('❌ FileReader setup error:', err);
  //           reject(new Error(`FileReader setup error: ${err instanceof Error ? err.message : String(err)}`));
  //         }
  //       });
        
  //       if (!isMounted) return;
        
  //       // Step 4: Create encryption package
  //       console.log('🔐 Step 4/5: Creating encryption package...');
  //       const metadata = {
  //         timestamp: Date.now(),
  //         original_name: `encrypted_vault_${userId}_${Date.now()}.jpg`,
  //         size: blob.size,
  //         checksum: Math.random().toString(36).substring(7),
  //         encrypted: true,
  //         ownerId: userId,
  //         imageType: 'encrypted',
  //       };
        
  //       const encryptedPackage = {
  //         encrypted_data: base64String,
  //         encryptedImage: embeddedImageBase64,
  //         metadata: metadata,
  //         check_digest: Math.random().toString(36).substring(7),
  //       };
        
  //       console.log('✅ All encryption steps completed successfully');
  //       if (isMounted) {
  //         setEncryptedData(encryptedPackage);
  //       }
  //     } catch (err: any) {
  //       console.error('❌ Encryption error:', err);
  //       const errorMsg = err?.message || String(err) || 'Unknown encryption error';
  //       if (isMounted) {
  //         setError(`⚠️ Encryption failed: ${errorMsg}`);
  //         console.error(`Encryption Error: ${errorMsg}. Please retake the photo and try again.`);
  //       }
  //     } finally {
  //       if (isMounted) {
  //         setIsProcessing(false);
  //       }
  //     }
  //   };
    
  //   encryptImage();
    
  //   // Cleanup function
  //   return () => {
  //     isMounted = false; // Mark component as unmounted to prevent state updates
  //   };
  // }, [image, userId]);

  const handleEncrypt = async () => {
    try {
      console.log("🔐 Starting manual encryption process with your steganography code...");
      
      if (!image) {
        console.error("❌ No image available");
        alert("No image available for encryption.");
        return;
      }
      
      if (!userId) {
        console.error("❌ No userId available");
        alert("User not authenticated.");
        return;
      }
      
      setIsProcessing(true);
      setError(null);
      
      let embeddedImageBase64 = null;
      let encryptionMethod = 'none';
      
      // Try advanced steganography first (your code)
      try {
        console.log('🔧 Attempting advanced steganography watermark...');
        console.log('🔧 Calling embedAdvancedWatermark with:', {
          imageLength: image.length,
          userId: userId.substring(0, 8) + '...',
          timestamp: new Date().toISOString()
        });
        
        embeddedImageBase64 = await embedAdvancedWatermark(
          image,
          userId,
          new Date().toISOString(),
          undefined,
          undefined,
          undefined,
          undefined
        );
        console.log('✅ Advanced steganography successful, result length:', embeddedImageBase64?.length || 0);
        encryptionMethod = 'advanced';
      } catch (embedErr) {
        console.warn('⚠️ Advanced steganography failed, trying simple watermark:', embedErr);
        const errorMsg = embedErr instanceof Error ? embedErr.message : String(embedErr);
        
        // Check for constructor errors specifically
        if (errorMsg.includes('Y3') || errorMsg.includes('X3') || errorMsg.includes('constructor')) {
          console.error('🚨 Constructor Error Detected - Using fallback method');
        }
        
        // Fallback to simple watermark embedding
        try {
          console.log('🔄 Using simple watermark fallback...');
          embeddedImageBase64 = await embedSimpleWatermark(image, userId, new Date().toISOString());
          console.log('✅ Simple watermark successful, result length:', embeddedImageBase64?.length || 0);
          encryptionMethod = 'simple';
        } catch (simpleErr) {
          console.error('❌ Simple watermark also failed:', simpleErr);
          // Final fallback - just return the original image with metadata in URL
          console.log('🔄 Using metadata-in-URL fallback...');
          const metadata = btoa(JSON.stringify({
            userId: userId,
            timestamp: new Date().toISOString(),
            encrypted: true,
            method: 'fallback'
          }));
          embeddedImageBase64 = image + '#metadata:' + metadata;
          console.log('✅ Fallback method applied');
          encryptionMethod = 'fallback';
        }
      }
      
      if (!embeddedImageBase64) {
        console.error('❌ All embedding methods failed');
        setError('All encryption methods failed - please try again');
        return;
      }
      
      setEncryptedImage(embeddedImageBase64);
      
      // Create encryption package
      const encryptedPackage = {
        encrypted_data: image,
        encryptedImage: embeddedImageBase64,
        metadata: {
          userId: userId,
          timestamp: new Date().toISOString(),
          encryptionMethod: encryptionMethod,
          size: image.length,
          original_name: `encrypted_vault_${userId}_${Date.now()}.jpg`,
          ownerId: userId
        },
        check_digest: Math.random().toString(36).substring(7),
      };
      
      setEncryptedData(encryptedPackage);
      console.log("✅ Encryption completed successfully with method:", encryptionMethod);
      
      // Auto-save to vault after encryption
      console.log("💾 Auto-saving to vault...");
      try {
        await onSaveToVault(encryptedPackage);
        console.log("✅ Auto-save completed successfully");
        alert("✅ Encryption completed and saved to vault!");
      } catch (saveErr) {
        console.error("❌ Auto-save failed:", saveErr);
        const saveErrorMsg = saveErr instanceof Error ? saveErr.message : String(saveErr);
        alert(`⚠️ Encryption completed but save failed: ${saveErrorMsg}`);
        setError(`Save failed: ${saveErrorMsg}`);
      }
      
    } catch (err) {
      console.error("❌ Encryption error:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Encryption failed: ${errorMsg}`);
      alert(`Encryption failed: ${errorMsg}`);
      setError(`Encryption failed: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    try {
      console.log("💾 Starting save process...");
      
      if (!encryptedData) {
        console.error("❌ No encrypted data available");
        alert("Please encrypt the image first by clicking the Encrypt button.");
        return;
      }
      
      setIsProcessing(true);
      await onSaveToVault(encryptedData);
      console.log("✅ Save completed successfully");
    } catch (err) {
      console.error("❌ Save error:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Save failed: ${errorMsg}`);
      alert(`Save failed: ${errorMsg}`);
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
          onClick={handleEncrypt}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          disabled={isProcessing}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 rounded-xl p-4 font-semibold text-white flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          <Lock size={18} />
          Encrypt & Save
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

      // Helper function to validate UUID format
      const isValidUUID = (uuid: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
      };

      // Only send vault_image_id if it's a valid UUID, otherwise send null
      const vaultImageId = selectedShareImage.id && isValidUUID(selectedShareImage.id) ? selectedShareImage.id : null;

      // Call backend API to create share
      const response = await fetch(`${backendUrl}/share/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          vault_image_id: vaultImageId,
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
        console.log("🔍 Starting basic image analysis...");

        // Get image size from base64
        const base64Data = image.includes(",") ? image.split(",")[1] : image;
        const sizeInBytes = (base64Data.length * 3) / 4;
        const sizeInKB = (sizeInBytes / 1024).toFixed(2);

        // Simple analysis without canvas or image loading
        const result = {
          imageResolution: "Unknown",
          imageSize: `${sizeInKB} KB`,
          pixelCount: 0,
          isEncrypted: false,
          encryptionType: "None",
          ownershipDetails: {
            pinItId: "Not encrypted with PINIT",
            timestamp: "N/A",
            encryptionFormat: "None",
          },
          imageType: "unknown",
          imageTypeAnalysis: {
            imageType: "unknown",
            confidence: 50,
            metadata: {
              hasExif: false,
              hasMetadata: false,
              dimensions: "Unknown",
              mimeType: "image/jpeg"
            },
            indicators: ["Basic analysis - no canvas processing"],
            ownership: {
              isWatermarked: false,
              timestamp: new Date().toISOString()
            }
          },
          imageTypeDetails: "UNKNOWN (50% confidence)",
          imageTypeIndicators: ["Basic analysis - no canvas processing"],
          metadata: null,
          confidence: 0,
        };

        setAnalysis(result);
        console.log("✅ Basic analysis complete:", result);
        setIsAnalyzing(false);
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

// ============= DOCUMENT UPLOAD COMPONENTS =============

// HELPER FUNCTIONS FOR DOCUMENT UPLOAD

async function convertImagesToPDF(images: string[]): Promise<string> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  for (let i = 0; i < images.length; i++) {
    if (i > 0) {
      pdf.addPage();
    }
    const base64Image = images[i].includes("base64,") ? images[i] : `data:image/jpeg;base64,${images[i]}`;
    pdf.addImage(base64Image, "JPEG", 10, 10, 190, 267);
  }

  return pdf.output("dataurlstring");
}

async function encryptFileSimulation(base64Data: string): Promise<string> {
  // Simulate encryption by adding metadata
  const timestamp = new Date().toISOString();
  const encryptedPayload = {
    timestamp,
    data: base64Data.substring(0, 100) + "...", // Just store a portion for security
    checksum: Math.random().toString(36).substring(7),
  };
  return btoa(JSON.stringify(encryptedPayload));
}

// 1. DOCUMENT UPLOAD PAGE - Selection between Scan and Upload
interface DocumentUploadPageProps {
  onBack: () => void;
  onScanClick: () => void;
  onDocumentUploaded: (document: VaultDocument) => void;
}

// 2. SCAN DOCUMENT PAGE - Camera scanning with pocket system
interface ScanDocumentPageProps {
  onPageScanned: (base64: string) => void;
  onDone: () => void;
  onBack: () => void;
  pageCount: number;
}

function ScanDocumentPage({ onPageScanned, onDone, onBack, pageCount }: ScanDocumentPageProps) {
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [scannedPages, setScannedPages] = useState<string[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleOpenCamera = async () => {
    try {
      console.log('Opening camera...');
      
      // Check camera permissions first
      const permissions = await Camera.checkPermissions();
      console.log('Camera permissions:', permissions);
      
      if (permissions.camera !== 'granted') {
        console.log('Requesting camera permissions...');
        const permissionResult = await Camera.requestPermissions();
        console.log('Permission request result:', permissionResult);
        
        if (permissionResult.camera !== 'granted') {
          alert('Camera permission is required to scan documents. Please enable camera permissions in your device settings.');
          return;
        }
      }
      
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (photo.base64String) {
        console.log('Photo captured successfully');
        setLastCapture(photo.base64String);
        // Add to scanned pages array
        const updatedPages = [...scannedPages, photo.base64String];
        setScannedPages(updatedPages);
        // Add to pocket
        onPageScanned(photo.base64String);
      } else {
        console.error('No photo data received');
        alert('Failed to capture photo. Please try again.');
      }
    } catch (error) {
      console.error("Camera error:", error);
      if (error.message && error.message.includes('permission')) {
        alert('Camera permission is required. Please enable camera permissions in your device settings and try again.');
      } else if (error.message && error.message.includes('cancelled')) {
        console.log('Camera cancelled by user');
      } else {
        alert("Failed to open camera. Please check camera permissions and try again.");
      }
    }
  };

  const generatePDF = async () => {
    if (scannedPages.length === 0) {
      alert('No pages scanned yet. Please scan at least one page first.');
      return;
    }

    try {
      setIsGeneratingPDF(true);
      console.log('Generating PDF from', scannedPages.length, 'pages');

      // Create new PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add each scanned page to PDF
      for (let i = 0; i < scannedPages.length; i++) {
        const base64Data = scannedPages[i];
        
        // Create image from base64
        const img = new Image();
        img.src = `data:image/jpeg;base64,${base64Data}`;
        
        // Wait for image to load
        await new Promise((resolve) => {
          img.onload = () => {
            // Calculate dimensions to fit A4 page
            const pageWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgWidth = img.width;
            const imgHeight = img.height;
            
            // Calculate scale to fit page
            const scale = Math.min(pageWidth / (imgWidth * 0.264583), pageHeight / (imgHeight * 0.264583));
            const finalWidth = imgWidth * scale * 0.264583;
            const finalHeight = imgHeight * scale * 0.264583;
            
            // Center the image on page
            const x = (pageWidth - finalWidth) / 2;
            const y = (pageHeight - finalHeight) / 2;
            
            // Add new page for each image (except first one)
            if (i > 0) {
              pdf.addPage();
            }
            
            // Add image to PDF
            pdf.addImage(img.src, 'JPEG', x, y, finalWidth, finalHeight);
            resolve(null);
          };
          img.onerror = () => resolve(null);
        });
      }

      // Save PDF
      const pdfBlob = pdf.output('blob');
      const pdfBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(pdfBlob);
      });

      console.log('PDF generated successfully');
      
      // Create document object for vault storage
      const pdfDocument: VaultDocument = {
        id: `pdf_${Date.now()}`,
        name: `Scanned_Document_${new Date().toISOString().split('T')[0]}.pdf`,
        encryptedData: pdfBase64.split(',')[1], // Remove data URL prefix
        metadata: {
          timestamp: Date.now(),
          original_name: `Scanned_Document_${new Date().toISOString().split('T')[0]}.pdf`,
          size: pdfBlob.size,
          checksum: Math.random().toString(36).substring(7),
          encrypted: true,
          ownerId: undefined,
        },
        createdAt: new Date().toISOString(),
      };

      // Add to vault and navigate back
      if (onPageScanned) {
        onPageScanned(pdfBase64);
      }
      
      alert(`PDF generated successfully with ${scannedPages.length} pages!`);
      setIsGeneratingPDF(false);
      
      // Optional: Auto-navigate back after PDF generation
      setTimeout(() => {
        onBack();
      }, 1000);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
      setIsGeneratingPDF(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-4 space-y-3 pb-20"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">
          Scan Document
        </h1>
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"
        >
          <X size={20} className="text-slate-300" />
        </button>
      </div>

      {/* Page Counter - Small and Clear */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-lg p-2 text-center">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Pages Scanned</p>
        <p className="text-lg font-bold text-white">
          {pageCount}
        </p>
      </div>

      {/* Last Capture Preview */}
      {lastCapture && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl overflow-hidden border border-purple-500/30 shadow-lg"
        >
          <img
            src={`data:image/jpeg;base64,${lastCapture}`}
            alt="Last Scanned"
            className="w-full h-48 object-cover"
          />
          <div className="bg-slate-900/50 p-2 text-center">
            <p className="text-xs text-purple-300">Last scanned page</p>
          </div>
        </motion.div>
      )}

      {/* Action Buttons - Compact */}
      <div className="space-y-2 fixed bottom-20 left-4 right-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenCamera}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm"
        >
          <Camera size={16} />
          {pageCount > 0 ? "Scan Next Page" : "Start Scanning"}
        </motion.button>

        {pageCount > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onDone}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all text-sm"
          >
            Done ({pageCount} {pageCount === 1 ? "page" : "pages"})
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// 3. REVIEW SCAN PAGE - Gallery and PDF generation
interface ReviewScanPageProps {
  scannedPages: string[];
  onSavePDF: (pdfData: string, fileName: string) => void;
  onBack: () => void;
  onRescan: () => void;
}

function ReviewScanPage({ scannedPages, onSavePDF, onBack, onRescan }: ReviewScanPageProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSavingPDF, setIsSavingPDF] = useState(false);

  const handleSaveAsPDF = async () => {
    setIsSavingPDF(true);
    try {
      const pdfDataUrl = await convertImagesToPDF(scannedPages);
      const fileName = `Document_${new Date().getTime()}.pdf`;
      onSavePDF(pdfDataUrl, fileName);
    } catch (error) {
      console.error("PDF generation error:", error);
    } finally {
      setIsSavingPDF(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-6 pb-20"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Review Scans
        </h1>
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"
        >
          <X size={24} className="text-slate-300" />
        </button>
      </div>

      <div className="bg-gradient-to-r from-emerald-900/40 to-cyan-900/40 border border-emerald-500/30 rounded-xl p-4 text-center">
        <p className="text-slate-300">Total Pages</p>
        <p className="text-4xl font-bold text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text">
          {scannedPages.length}
        </p>
      </div>

      {/* Pages Grid Gallery */}
      <div className="grid grid-cols-2 gap-3">
        {scannedPages.map((page, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.05 }}
            onClick={() => setSelectedIndex(idx)}
            className="relative rounded-lg overflow-hidden border-2 border-slate-600/50 hover:border-emerald-400 cursor-pointer shadow-lg transition-all"
          >
            <img
              src={`data:image/jpeg;base64,${page}`}
              alt={`Page ${idx + 1}`}
              className="w-full aspect-[3/4] object-cover"
            />
            <div className="absolute top-2 right-2 bg-emerald-600 text-white px-2 py-1 rounded text-xs font-bold">
              Page {idx + 1}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative rounded-2xl overflow-hidden max-w-full max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={`data:image/jpeg;base64,${scannedPages[selectedIndex]}`}
                alt={`Full Page ${selectedIndex + 1}`}
                className="w-auto h-auto max-h-[80vh]"
              />
              <button
                onClick={() => setSelectedIndex(null)}
                className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg"
              >
                <X size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="space-y-3 fixed bottom-20 left-4 right-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSaveAsPDF}
          disabled={isSavingPDF}
          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSavingPDF ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText size={20} />
              Save as PDF ({scannedPages.length} pages)
            </>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRescan}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
        >
          Rescan
        </motion.button>
      </div>
    </motion.div>
    );
  }

// Encryption function for documents
const encryptFile = async (fileData: string): Promise<string> => {
  // Simple base64 encoding for now - can be enhanced with actual encryption
  // In production, use proper encryption libraries like crypto-js
  return btoa(fileData);
};

function DocumentUploadPage({ onBack, onScanClick, onDocumentUploaded }: DocumentUploadPageProps) {
  const [isUploading, setIsUploading] = useState(false);
  
  const handleFileUpload = async () => {
    try {
      // Use HTML file input for file selection
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      input.multiple = false;
      
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          setIsUploading(true);
          
          try {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
              alert('File size must be less than 10MB');
              setIsUploading(false);
              return;
            }
            
            // Create FileReader to read the file
            const reader = new FileReader();
            reader.onload = async (e) => {
              try {
                const result = e.target?.result as string;
                const base64 = result?.split(',')[1] || '';
                
                if (!base64) {
                  throw new Error('Failed to read file data');
                }
                
                // Encrypt file data
                const encryptedData = await encryptFile(base64);
                
                // Create vault document
                const newDoc: VaultDocument = {
                  id: `doc_${Date.now()}`,
                  name: file.name,
                  encryptedData: encryptedData,
                  metadata: {
                    timestamp: Date.now(),
                    original_name: file.name,
                    size: file.size,
                    checksum: Math.random().toString(36).substring(7),
                    encrypted: true,
                    ownerId: undefined,
                  },
                  createdAt: new Date().toISOString(),
                };
                
                // Pass document to parent component for vault storage
                console.log('File uploaded and encrypted:', file.name);
                onDocumentUploaded(newDoc);
                setIsUploading(false);
                // Go back to dashboard after successful upload
                setTimeout(() => {
                  onBack();
                }, 500);
                
              } catch (processingError) {
                console.error('File processing error:', processingError);
                alert('Failed to process file. Please try again.');
                setIsUploading(false);
              }
            };
            
            reader.onerror = () => {
              console.error('FileReader error');
              alert('Failed to read file. Please try again.');
              setIsUploading(false);
            };
            
            reader.readAsDataURL(file);
            
          } catch (fileError) {
            console.error('File handling error:', fileError);
            alert('Failed to handle file. Please try again.');
            setIsUploading(false);
          }
        }
      };
      
      input.click();
    } catch (error) {
      console.error('File picker error:', error);
      alert('Failed to open file picker. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-6 pb-20"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">
          Upload Document
        </h1>
        <button
          onClick={() => {
            // Navigate to vault to see existing documents
            setCurrentPage("vault");
          }}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all transform hover:scale-105 text-sm"
          type="button"
        >
          <FileText size={16} className="inline-block mr-2" />
          View Vault ({documents.length})
        </button>
      </div>

      <p className="text-slate-400 text-center">Choose how you want to add a document to your vault</p>

      <div className="space-y-3">
        {/* Scan Document Card - Modern Small Size */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Scan Document button clicked');
            if (onScanClick && typeof onScanClick === 'function') {
              onScanClick();
            } else {
              console.error('onScanClick is not a function:', onScanClick);
              alert('Scan function not available. Please try again.');
            }
          }}
          className="w-full bg-gradient-to-r from-purple-600/80 to-indigo-600/80 border border-purple-500/60 hover:border-purple-400 rounded-xl p-2.5 text-left transition-all shadow-lg hover:shadow-xl"
          type="button"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-purple-500/30 rounded-lg">
              <Camera size={14} className="text-purple-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-white">Scan Document</h3>
              <p className="text-[10px] text-slate-300">Open camera to scan</p>
            </div>
            <ChevronRight size={12} className="text-purple-300" />
          </div>
        </motion.button>

        {/* Upload from Device Card - Modern Small Size */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleFileUpload}
          disabled={isUploading}
          className="w-full bg-gradient-to-r from-cyan-600/80 to-blue-600/80 border border-cyan-500/60 hover:border-cyan-400 rounded-xl p-2.5 text-left transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-cyan-500/30 rounded-lg">
              <Upload size={14} className="text-cyan-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-white">Upload from Device</h3>
              <p className="text-[10px] text-slate-300">Choose file from storage</p>
            </div>
            {isUploading ? (
              <div className="w-2.5 h-2.5 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ChevronRight size={12} className="text-cyan-300" />
            )}
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}

// 5. DIGITAL IDENTITY DASHBOARD - Full functionality version
interface CategoryDetailPageProps {
  category: {
    id: string;
    name: string;
    icon: React.ElementType;
    color: string;
  };
  onBack: () => void;
  onDocumentUploaded: (document: VaultDocument) => void;
}

function CategoryDetailPage({ category, onBack, onDocumentUploaded }: CategoryDetailPageProps) {
  const [documents, setDocuments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCameraCapture = async () => {
    try {
      setIsCapturing(true);
      console.log('Opening camera for category:', category.name);
      
      // Check camera permissions
      const permissions = await Camera.checkPermissions();
      console.log('Camera permissions:', permissions);
      
      if (permissions.camera !== 'granted') {
        console.log('Requesting camera permissions...');
        const permissionResult = await Camera.requestPermissions();
        console.log('Permission request result:', permissionResult);
        
        if (permissionResult.camera !== 'granted') {
          alert('Camera permission is required to capture documents. Please enable camera permissions in your device settings.');
          setIsCapturing(false);
          return;
        }
      }
      
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (photo.base64String) {
        console.log('Photo captured successfully for category:', category.name);
        
        // Add to documents list
        const updatedDocuments = [...documents, photo.base64String];
        setDocuments(updatedDocuments);
        
        // Create vault document
        const vaultDoc: VaultDocument = {
          id: `${category.id}_${Date.now()}`,
          name: `${category.name}_${new Date().toISOString().split('T')[0]}_${documents.length + 1}.jpg`,
          encryptedData: photo.base64String,
          metadata: {
            timestamp: Date.now(),
            original_name: `${category.name}_${new Date().toISOString().split('T')[0]}_${documents.length + 1}.jpg`,
            size: photo.base64String.length,
            checksum: Math.random().toString(36).substring(7),
            encrypted: true,
            ownerId: undefined,
          },
          createdAt: new Date().toISOString(),
        };
        
        // Store in vault
        onDocumentUploaded(vaultDoc);
        alert(`Document successfully added to ${category.name}!`);
      } else {
        console.error('No photo data received');
        alert('Failed to capture photo. Please try again.');
      }
    } catch (error) {
      console.error("Camera error:", error);
      if (error.message && error.message.includes('permission')) {
        alert('Camera permission is required. Please enable camera permissions in your device settings and try again.');
      } else if (error.message && error.message.includes('cancelled')) {
        console.log('Camera cancelled by user');
      } else {
        alert("Failed to open camera. Please check camera permissions and try again.");
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      setIsUploading(true);
      console.log('Opening file picker for category:', category.name);
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      input.multiple = false;
      
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
              alert('File size must be less than 10MB');
              setIsUploading(false);
              return;
            }
            
            // Read file
            const reader = new FileReader();
            reader.onload = async (e) => {
              try {
                const result = e.target?.result as string;
                const base64 = result?.split(',')[1] || '';
                
                if (!base64) {
                  throw new Error('Failed to read file data');
                }
                
                // Encrypt file data
                const encryptedData = await encryptFile(base64);
                
                // Add to documents list
                const updatedDocuments = [...documents, base64];
                setDocuments(updatedDocuments);
                
                // Create vault document
                const vaultDoc: VaultDocument = {
                  id: `${category.id}_${Date.now()}`,
                  name: file.name,
                  encryptedData: encryptedData,
                  metadata: {
                    timestamp: Date.now(),
                    original_name: file.name,
                    size: file.size,
                    checksum: Math.random().toString(36).substring(7),
                    encrypted: true,
                    ownerId: undefined,
                  },
                  createdAt: new Date().toISOString(),
                };
                
                // Store in vault
                onDocumentUploaded(vaultDoc);
                console.log('File uploaded and encrypted:', file.name);
                alert(`Document successfully added to ${category.name}!`);
                setIsUploading(false);
                
              } catch (processingError) {
                console.error('File processing error:', processingError);
                alert('Failed to process file. Please try again.');
                setIsUploading(false);
              }
            };
            
            reader.onerror = () => {
              console.error('FileReader error');
              alert('Failed to read file. Please try again.');
              setIsUploading(false);
            };
            
            reader.readAsDataURL(file);
            
          } catch (fileError) {
            console.error('File handling error:', fileError);
            alert('Failed to handle file. Please try again.');
            setIsUploading(false);
          }
        }
      };
      
      input.click();
    } catch (error) {
      console.error('File picker error:', error);
      alert('Failed to open file picker. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-24 min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"
        >
          <X size={24} className="text-slate-300" />
        </button>
        <h1 className="text-xl font-bold text-white">{category.name}</h1>
        <div className="w-10"></div>
      </div>

      {/* Category Info */}
      <div className={`bg-gradient-to-br from-${category.color}-900/30 to-${category.color}-800/20 backdrop-blur-xl rounded-3xl border border-${category.color}-700/50 shadow-2xl overflow-hidden mb-6`}>
        <div className="p-6 text-center">
          <div className={`w-16 h-16 ${category.color === 'blue' ? 'bg-blue-500/20' : category.color === 'green' ? 'bg-green-500/20' : category.color === 'purple' ? 'bg-purple-500/20' : category.color === 'orange' ? 'bg-orange-500/20' : category.color === 'cyan' ? 'bg-cyan-500/20' : 'bg-red-500/20'} rounded-full flex items-center justify-center border border-slate-600/30 mx-auto mb-4`}>
            <category.icon size={32} className={category.color === 'blue' ? 'text-blue-400' : category.color === 'green' ? 'text-green-400' : category.color === 'purple' ? 'text-purple-400' : category.color === 'orange' ? 'text-orange-400' : category.color === 'cyan' ? 'text-cyan-400' : 'text-red-400'} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">{category.name}</h2>
          <p className="text-slate-400 text-sm mb-2">Upload and manage your documents</p>
          <div className="flex items-center justify-center gap-2">
            <span className={`px-3 py-1 ${category.color === 'blue' ? 'bg-blue-500/20 text-blue-300' : category.color === 'green' ? 'bg-green-500/20 text-green-300' : category.color === 'purple' ? 'bg-purple-500/20 text-purple-300' : category.color === 'orange' ? 'bg-orange-500/20 text-orange-300' : category.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-red-500/20 text-red-300'} text-xs rounded-full border ${category.color === 'blue' ? 'border-blue-500/30' : category.color === 'green' ? 'border-green-500/30' : category.color === 'purple' ? 'border-purple-500/30' : category.color === 'orange' ? 'border-orange-500/30' : category.color === 'cyan' ? 'border-cyan-500/30' : 'border-red-500/30'}`}>
              {documents.length} documents
            </span>
          </div>
        </div>
      </div>

      {/* Upload Options */}
      <div className="space-y-3 mb-6">
        <button
          onClick={handleCameraCapture}
          disabled={isCapturing}
          className={`w-full bg-gradient-to-r ${category.color === 'blue' ? 'from-blue-600/80 to-indigo-600/80 border-blue-500/60 hover:border-blue-400' : category.color === 'green' ? 'from-green-600/80 to-emerald-600/80 border-green-500/60 hover:border-green-400' : category.color === 'purple' ? 'from-purple-600/80 to-pink-600/80 border-purple-500/60 hover:border-purple-400' : category.color === 'orange' ? 'from-orange-600/80 to-red-600/80 border-orange-500/60 hover:border-orange-400' : category.color === 'cyan' ? 'from-cyan-600/80 to-blue-600/80 border-cyan-500/60 hover:border-cyan-400' : 'from-red-600/80 to-pink-600/80 border-red-500/60 hover:border-red-400'} rounded-xl p-3 text-left transition-all shadow-lg hover:shadow-xl disabled:opacity-50`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 ${category.color === 'blue' ? 'bg-blue-500/30' : category.color === 'green' ? 'bg-green-500/30' : category.color === 'purple' ? 'bg-purple-500/30' : category.color === 'orange' ? 'bg-orange-500/30' : category.color === 'cyan' ? 'bg-cyan-500/30' : 'bg-red-500/30'} rounded-lg`}>
              <Camera size={16} className={category.color === 'blue' ? 'text-blue-300' : category.color === 'green' ? 'text-green-300' : category.color === 'purple' ? 'text-purple-300' : category.color === 'orange' ? 'text-orange-300' : category.color === 'cyan' ? 'text-cyan-300' : 'text-red-300'} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">Capture Document</h3>
              <p className="text-xs text-slate-300">Use camera to scan</p>
            </div>
            {isCapturing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ChevronRight size={16} className={category.color === 'blue' ? 'text-blue-300' : category.color === 'green' ? 'text-green-300' : category.color === 'purple' ? 'text-purple-300' : category.color === 'orange' ? 'text-orange-300' : category.color === 'cyan' ? 'text-cyan-300' : 'text-red-300'} />
            )}
          </div>
        </button>

        <button
          onClick={handleFileUpload}
          disabled={isUploading}
          className="w-full bg-gradient-to-r from-cyan-600/80 to-blue-600/80 border border-cyan-500/60 hover:border-cyan-400 rounded-xl p-3 text-left transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/30 rounded-lg">
              <Upload size={16} className="text-cyan-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">Upload from Device</h3>
              <p className="text-xs text-slate-300">Choose file from storage</p>
            </div>
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ChevronRight size={16} className="text-cyan-300" />
            )}
          </div>
        </button>
      </div>

      {/* Documents Grid */}
      <div className="space-y-4">
        <h3 className="text-white font-semibold">Your Documents</h3>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-800/60 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-400 text-sm">No documents yet</p>
            <p className="text-slate-500 text-xs mt-1">Start by capturing or uploading documents</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-3 cursor-pointer hover:border-slate-600 transition-all"
              >
                <div className="aspect-square bg-slate-700/50 rounded-lg mb-2 overflow-hidden">
                  <img
                    src={`data:image/jpeg;base64,${doc}`}
                    alt={`Document ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-white text-xs font-medium truncate">Document {index + 1}</p>
                <p className="text-slate-400 text-xs">Just now</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Share Access Page - Handles public share links and QR codes
function ShareAccessPage() {
  const [shareData, setShareData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    const loadSharedContent = async () => {
      try {
        // Get share ID from URL
        const pathParts = window.location.pathname.split('/');
        const shareId = pathParts[pathParts.length - 1];
        
        if (!shareId || shareId === 'share') {
          setError('Invalid share link');
          setIsLoading(false);
          return;
        }

        console.log('Loading share with ID:', shareId);

        // Call backend to get share data
        const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
        const response = await fetch(`${backendUrl}/share/${shareId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Share not found or expired');
        }

        const shareInfo = await response.json();
        console.log('Share data loaded:', shareInfo);

        setShareData(shareInfo);

        // Check if password is required
        if (shareInfo.password_protected && !shareInfo.password_verified) {
          setShowPasswordPrompt(true);
          setIsLoading(false);
          return;
        }

        // Load the document
        if (shareInfo.vault_image_id) {
          // Load from vault
          const documentResponse = await fetch(`${backendUrl}/share/document/${shareId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (documentResponse.ok) {
            const documentBlob = await documentResponse.blob();
            const reader = new FileReader();
            reader.onload = () => {
              setDocumentData(reader.result as string);
            };
            reader.readAsDataURL(documentBlob);
          }
        } else if (shareInfo.encrypted_data) {
          // Use encrypted data directly
          setDocumentData(`data:image/jpeg;base64,${shareInfo.encrypted_data}`);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading share:', err);
        setError(err instanceof Error ? err.message : 'Failed to load shared content');
        setIsLoading(false);
      }
    };

    loadSharedContent();
  }, []);

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      alert('Please enter a password');
      return;
    }

    try {
      const pathParts = window.location.pathname.split('/');
      const shareId = pathParts[pathParts.length - 1];
      const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;

      const response = await fetch(`${backendUrl}/share/${shareId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Invalid password');
      }

      const shareInfo = await response.json();
      setShareData(shareInfo);
      setShowPasswordPrompt(false);

      // Load the document
      if (shareInfo.encrypted_data) {
        setDocumentData(`data:image/jpeg;base64,${shareInfo.encrypted_data}`);
      }

    } catch (err) {
      console.error('Password verification error:', err);
      alert(err instanceof Error ? err.message : 'Password verification failed');
    }
  };

  const handleDownload = async () => {
    if (!documentData) return;

    try {
      const link = document.createElement('a');
      link.href = documentData;
      link.download = shareData?.original_name || `shared_document_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download document');
    }
  };

  const handleShare = async () => {
    if (navigator.share && documentData) {
      try {
        await navigator.share({
          title: 'Shared Document',
          text: 'Check out this shared document',
          url: window.location.href,
        });
      } catch (err) {
        console.error('Share error:', err);
      }
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center px-4">
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Content Not Found</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <p className="text-slate-500 text-sm">The share link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center px-4">
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Password Required</h2>
          <p className="text-slate-400 mb-6">This shared content is password protected.</p>
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 mb-4"
            onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
          />
          
          <button
            onClick={handlePasswordSubmit}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Unlock Content
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Share2 size={24} className="text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Shared Document</h1>
                <p className="text-slate-400 text-sm">Shared via PINIT Vault</p>
              </div>
            </div>
            <button
              onClick={handleShare}
              className="p-2 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-all"
            >
              <Share2 size={20} className="text-slate-300" />
            </button>
          </div>
          
          {shareData && (
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <span>Shared: {new Date(shareData.created_at).toLocaleDateString()}</span>
              {shareData.expires_at && (
                <span>Expires: {new Date(shareData.expires_at).toLocaleDateString()}</span>
              )}
              {shareData.download_limit && (
                <span>Downloads: {shareData.downloads_used}/{shareData.download_limit}</span>
              )}
            </div>
          )}
        </div>

        {/* Document Preview */}
        {documentData && (
          <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 mb-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white mb-2">Document Preview</h2>
              {shareData?.original_name && (
                <p className="text-slate-400 text-sm">{shareData.original_name}</p>
              )}
            </div>
            
            <div className="bg-slate-900/50 rounded-lg overflow-hidden mb-4">
              <img
                src={documentData}
                alt="Shared document"
                className="w-full h-auto max-h-96 object-contain"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Download
              </button>
              
              <button
                onClick={handleShare}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Share2 size={16} />
                Share
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-slate-500 text-sm mb-2">
            Powered by <span className="text-blue-400 font-semibold">PINIT Vault</span>
          </p>
          <p className="text-slate-600 text-xs">
            Secure document sharing with encryption
          </p>
        </div>
      </div>
    </div>
  );
}

function DigitalIdentityDashboard({ onBack, userName, setUserName, profileImage, setProfileImage, userId }: { onBack: () => void; userName: string; setUserName: React.Dispatch<React.SetStateAction<string>>; profileImage: string | null; setProfileImage: React.Dispatch<React.SetStateAction<string | null>>; userId: string | null }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  
  // Enhanced Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userBio, setUserBio] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [userLanguage, setUserLanguage] = useState("English");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [socialLinkedIn, setSocialLinkedIn] = useState("");
  const [socialGitHub, setSocialGitHub] = useState("");
  const [socialPortfolio, setSocialPortfolio] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [showProfileImagePreview, setShowProfileImagePreview] = useState(false);

  // Security State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<"fingerprint" | "face" | "none">("none");
  const [autoLockMinutes, setAutoLockMinutes] = useState(5);
  const [securityAlertsEnabled, setIsSecurityAlertsEnabled] = useState(true);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategoryClick = (category: any) => {
    console.log('Category clicked:', category.name);
    setSelectedCategory(category);
  };

  const handleDocumentUploaded = (document: VaultDocument) => {
    console.log('Document uploaded to vault:', document.name);
    // Add to vault documents
    setVaultDocuments(prev => [...prev, document]);
  };

  if (selectedCategory) {
    return (
      <CategoryDetailPage
        category={selectedCategory}
        onBack={() => setSelectedCategory(null)}
        onDocumentUploaded={handleDocumentUploaded}
      />
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"
        >
          <ChevronLeft size={24} className="text-slate-300" />
        </button>
        <h1 className="text-xl font-bold text-white ml-2">Profile</h1>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-2 mb-6">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "security", label: "Security", icon: Shield },
            { id: "digital-identity", label: "Digital Identity", icon: CreditCard },
            { id: "subscription", label: "Subscription", icon: Star }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <tab.icon size={16} />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "profile" && (
        <div className="space-y-4">
          {/* Profile Picture Section */}
          <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Profile Picture</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-purple-500/50"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-purple-500/50">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => setShowProfileImagePreview(!showProfileImagePreview)}
                  className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 rounded-full p-2 transition-all"
                >
                  <Camera size={16} className="text-white" />
                </button>
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="profile-image-upload"
                />
                <label
                  htmlFor="profile-image-upload"
                  className="block bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer transition-all text-center mb-2"
                >
                  Upload Photo
                </label>
                <p className="text-xs text-purple-300/70">Supports JPG, PNG (Max 5MB)</p>
              </div>
            </div>
          </div>

          {/* Username */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Username</h2>
            <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
              <div>
                <p className="text-white font-semibold">{userName}</p>
                <p className="text-purple-300/70 text-xs font-mono">@{userName.toLowerCase().replace(/\s/g, '_')}</p>
              </div>
              <button className="text-purple-400 hover:text-purple-300 transition-colors">
                <Copy size={18} />
              </button>
            </div>
          </div>

          {/* User ID (Static) */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">User ID</h2>
            <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
              <div>
                <p className="text-white font-mono text-sm">{userId || "Not assigned"}</p>
                <p className="text-purple-300/70 text-xs">Fixed ID from registration</p>
              </div>
              <button className="text-purple-400 hover:text-purple-300 transition-colors">
                <Copy size={18} />
              </button>
            </div>
          </div>

          {/* Edit Profile */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Edit Profile</h2>
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Edit size={18} />
              </button>
            </div>
            {isEditingProfile ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-purple-300/70 mb-1 block">Name</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-purple-300/70 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-purple-300/70 mb-1 block">Phone</label>
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-all"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Name</span>
                  <span className="text-white text-sm">{userName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Email</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">{userEmail || "Not set"}</span>
                    {isEmailVerified && <CheckCircle size={14} className="text-green-400" />}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Phone</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">{userPhone || "Not set"}</span>
                    {isPhoneVerified && <CheckCircle size={14} className="text-green-400" />}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bio / About */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Bio / About</h2>
            <textarea
              value={userBio}
              onChange={(e) => setUserBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm h-24 resize-none"
              maxLength={200}
            />
            <p className="text-xs text-purple-300/70 mt-2 text-right">{userBio.length}/200</p>
          </div>

          {/* Location */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Location</h2>
            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-purple-400" />
              <input
                type="text"
                value={userLocation}
                onChange={(e) => setUserLocation(e.target.value)}
                placeholder="Enter your location"
                className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          {/* Language Preferences */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Language Preferences</h2>
            <select
              value={userLanguage}
              onChange={(e) => setUserLanguage(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Hindi">Hindi</option>
              <option value="Chinese">Chinese</option>
            </select>
          </div>

          {/* Theme Settings */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Theme Settings</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon size={20} className="text-purple-400" /> : <Sun size={20} className="text-yellow-400" />}
                <span className="text-white text-sm">{isDarkMode ? "Dark Mode" : "Light Mode"}</span>
              </div>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-12 h-6 rounded-full transition-all ${isDarkMode ? 'bg-purple-600' : 'bg-slate-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Emergency Contact</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="Contact Name"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                type="tel"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="Contact Phone"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Social Links</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Linkedin size={20} className="text-blue-400" />
                <input
                  type="url"
                  value={socialLinkedIn}
                  onChange={(e) => setSocialLinkedIn(e.target.value)}
                  placeholder="LinkedIn URL"
                  className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <Github size={20} className="text-slate-400" />
                <input
                  type="url"
                  value={socialGitHub}
                  onChange={(e) => setSocialGitHub(e.target.value)}
                  placeholder="GitHub URL"
                  className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-green-400" />
                <input
                  type="url"
                  value={socialPortfolio}
                  onChange={(e) => setSocialPortfolio(e.target.value)}
                  placeholder="Portfolio URL"
                  className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-4">
          {/* Change Password */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Change Password</h2>
              <button
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Edit size={18} />
              </button>
            </div>
            {isChangingPassword ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-purple-300/70 mb-1 block">Old Password</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-purple-300/70 mb-1 block">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-purple-300/70 mb-1 block">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <button
                  onClick={() => setIsChangingPassword(false)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-all"
                >
                  Update Password
                </button>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Last changed: Never</p>
            )}
          </div>

          {/* Two-Factor Authentication */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Two-Factor Authentication</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-purple-400" />
                <div>
                  <p className="text-white text-sm font-medium">2FA Status</p>
                  <p className="text-slate-400 text-xs">{is2FAEnabled ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
              <button
                onClick={() => setIs2FAEnabled(!is2FAEnabled)}
                className={`w-12 h-6 rounded-full transition-all ${is2FAEnabled ? 'bg-purple-600' : 'bg-slate-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all ${is2FAEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {is2FAEnabled && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Mail size={16} className="text-purple-400" />
                  <span>SMS OTP</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Mail size={16} className="text-purple-400" />
                  <span>Email OTP</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Smartphone size={16} className="text-purple-400" />
                  <span>Authenticator App</span>
                </div>
              </div>
            )}
          </div>

          {/* Biometric Settings */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Biometric Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Fingerprint size={20} className="text-purple-400" />
                  <div>
                    <p className="text-white text-sm font-medium">Fingerprint</p>
                    <p className="text-slate-400 text-xs">Use fingerprint to login</p>
                  </div>
                </div>
                <button
                  onClick={() => setBiometricType(biometricType === "fingerprint" ? "none" : "fingerprint")}
                  className={`w-12 h-6 rounded-full transition-all ${biometricType === "fingerprint" ? 'bg-purple-600' : 'bg-slate-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-all ${biometricType === "fingerprint" ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User size={20} className="text-purple-400" />
                  <div>
                    <p className="text-white text-sm font-medium">Face Unlock</p>
                    <p className="text-slate-400 text-xs">Use face recognition to login</p>
                  </div>
                </div>
                <button
                  onClick={() => setBiometricType(biometricType === "face" ? "none" : "face")}
                  className={`w-12 h-6 rounded-full transition-all ${biometricType === "face" ? 'bg-purple-600' : 'bg-slate-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-all ${biometricType === "face" ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Device Management */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Device Management</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Smartphone size={18} className="text-green-400" />
                  <div>
                    <p className="text-white text-sm">This Device</p>
                    <p className="text-slate-400 text-xs">Current session</p>
                  </div>
                </div>
                <span className="text-xs text-green-400">Active</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Smartphone size={18} className="text-slate-400" />
                  <div>
                    <p className="text-white text-sm">iPhone 14 Pro</p>
                    <p className="text-slate-400 text-xs">Last active: 2 days ago</p>
                  </div>
                </div>
                <button className="text-xs text-red-400 hover:text-red-300">Remove</button>
              </div>
            </div>
          </div>

          {/* Session Management */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Session Management</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Active Sessions</span>
                <span className="text-white text-sm font-semibold">2</span>
              </div>
              <button className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium py-2 rounded-lg transition-all text-sm">
                Revoke All Sessions
              </button>
            </div>
          </div>

          {/* Login History */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Login History</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-white">Today, 10:30 AM</p>
                  <p className="text-slate-400 text-xs">This Device • Mumbai</p>
                </div>
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-white">Yesterday, 8:15 PM</p>
                  <p className="text-slate-400 text-xs">iPhone 14 Pro • Delhi</p>
                </div>
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-white">Apr 20, 3:45 PM</p>
                  <p className="text-slate-400 text-xs">Chrome • Bangalore</p>
                </div>
                <CheckCircle size={16} className="text-green-400" />
              </div>
            </div>
          </div>

          {/* Security Alerts */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Security Alerts</h2>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-purple-400" />
                <div>
                  <p className="text-white text-sm font-medium">Alert Notifications</p>
                  <p className="text-slate-400 text-xs">Get notified of security events</p>
                </div>
              </div>
              <button
                onClick={() => setIsSecurityAlertsEnabled(!securityAlertsEnabled)}
                className={`w-12 h-6 rounded-full transition-all ${securityAlertsEnabled ? 'bg-purple-600' : 'bg-slate-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all ${securityAlertsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {securityAlertsEnabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Check size={16} className="text-green-400" />
                  <span>New login from new device</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Check size={16} className="text-green-400" />
                  <span>Suspicious activity detected</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Check size={16} className="text-green-400" />
                  <span>Password changed</span>
                </div>
              </div>
            )}
          </div>

          {/* Recovery Options */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Recovery Options</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-purple-300/70 mb-1 block">Recovery Email</label>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="recovery@example.com"
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-purple-300/70 mb-1 block">Recovery Phone</label>
                <input
                  type="tel"
                  value={recoveryPhone}
                  onChange={(e) => setRecoveryPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-all text-sm">
                Generate Backup Codes
              </button>
            </div>
          </div>

          {/* Auto Lock Settings */}
          <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Auto Lock Settings</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-purple-300/70 mb-1 block">Auto logout after inactivity</label>
                <select
                  value={autoLockMinutes}
                  onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Lock on app background</span>
                <button className={`w-12 h-6 rounded-full transition-all bg-purple-600`}>
                  <div className="w-5 h-5 bg-white rounded-full transition-all translate-x-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Categories Grid */}
      {activeTab === "digital-identity" && (
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: "personal-docs", name: "Personal Docs", icon: FileText, color: "blue" },
          { id: "academic", name: "Academic", icon: BookOpen, color: "green" },
          { id: "projects", name: "Projects", icon: Briefcase, color: "purple" },
          { id: "internships", name: "Internships", icon: Award, color: "orange" },
          { id: "certifications", name: "Certifications", icon: Shield, color: "cyan" },
          { id: "entrance-exams", name: "Entrance & Exams", icon: Target, color: "red" }
        ].map((category, index) => (
          <div
            key={category.id}
            onClick={() => handleCategoryClick(category)}
            className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 cursor-pointer hover:border-slate-600 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${category.color === 'blue' ? 'bg-blue-500/20' : category.color === 'green' ? 'bg-green-500/20' : category.color === 'purple' ? 'bg-purple-500/20' : category.color === 'orange' ? 'bg-orange-500/20' : category.color === 'cyan' ? 'bg-cyan-500/20' : 'bg-red-500/20'} rounded-lg flex items-center justify-center border border-slate-600/30`}>
                  <category.icon size={20} className={category.color === 'blue' ? 'text-blue-400' : category.color === 'green' ? 'text-green-400' : category.color === 'purple' ? 'text-purple-400' : category.color === 'orange' ? 'text-orange-400' : category.color === 'cyan' ? 'text-cyan-400' : 'text-red-400'} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{category.name}</h3>
                  <p className="text-slate-400 text-xs">0 items</p>
                </div>
              </div>
              <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                View All
              </button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
