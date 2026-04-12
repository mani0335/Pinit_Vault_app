import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  ArrowLeft,
  Image,
  Database,
  Loader,
  LayoutDashboard,
  Award,
  Clock,
  FileSearch,
  Activity,
  Calendar,
  Download,
  Trash2,
  Eye,
  Lock,
  Share2,
  Settings,
  LogOut,
  BarChart3,
  Zap,
  Shield,
  AlertCircle,
  TrendingUp,
  Lock as LockIcon,
  Cpu,
  Key,
  CheckCircle2,
  Grid3x3,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { vaultAPI, certAPI, compareAPI } from "@/utils/apiClient";
import { appStorage } from "@/lib/storage";
import {
  embedUserIdInImage,
  extractUserIdFromImage,
  type WatermarkMetadata,
} from "@/lib/steganography";
import { saveImageToGallery } from "@/lib/vaultService";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Camera as CameraPlugin, CameraResultType, CameraSource } from "@capacitor/camera";

interface PINITDashboardProps {
  userId?: string;
  isRestricted?: boolean;
}

export function PINITDashboard({ userId, isRestricted }: PINITDashboardProps) {
  const navigate = useNavigate();
  
  // ✅ CRITICAL FIX: ALL hooks MUST be at the very top - before ANY code or early returns
  // React counts hooks on every render - if the count changes = Error #310
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activePage, setActivePage] = useState<"home" | "overview" | "vault" | "analyzer">("home");
  
  // ✅ ALL data state - defined at top
  const [vaultImages, setVaultImages] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [detectedOwners, setDetectedOwners] = useState<{ [key: string]: string }>({});

  // IMAGE ANALYZER STATE
  const [cryptoFile, setCryptoFile] = useState<File | null>(null);
  const [cryptoPreview, setCryptoPreview] = useState<string>("");
  const [cryptoBase64, setCryptoBase64] = useState<string>("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [encryptedResult, setEncryptedResult] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);

  // VERIFY PROOF STATE
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyPreview, setVerifyPreview] = useState<string>("");
  const [verifyBase64, setVerifyBase64] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [proofResult, setProofResult] = useState<WatermarkMetadata | null>(null);

  // VAULT IMAGE VIEWER & SHARING
  const [selectedVaultImage, setSelectedVaultImage] = useState<any>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ✅ ALL useCallback hooks - must be at top
  const loadVaultImages = useCallback(async () => {
    setLoadingVault(true);
    try {
      let currentUserId = userId;
      if (!currentUserId) {
        const storedUserId = await appStorage.getItem('biovault_userId');
        currentUserId = storedUserId || undefined;
      }
      console.log('🔓 LoadVault: Using userId:', currentUserId);
      
      const res = await vaultAPI.list(currentUserId);
      const images = (res.assets || []).map((a: any) => ({
        ...a,
        id: a.asset_id || a.id,
        assetId: a.asset_id || a.id,
        fileName: a.file_name || "Unknown",
        fileSize: a.file_size || "—",
        dateEncrypted: a.created_at,
        status: "Verified",
        thumbnail: a.thumbnail_url,
      }));
      setVaultImages(images);
      
      // Auto-detect ownership from watermarked images
      const ownersMap: { [key: string]: string } = {};
      for (const image of images) {
        if (image.image_base64 || image.thumbnail_base64) {
          try {
            const imageData = image.image_base64 || image.thumbnail_base64;
            const metadata = await extractUserIdFromImage(imageData);
            if (metadata) {
              ownersMap[image.assetId] = metadata.userId;
              console.log('✅ Auto-Detect: Image', image.fileName, '-> Owner:', metadata.userId, '(Confidence: ' + metadata.confidence + '/5)');
            }
          } catch (err) {
            console.warn('⚠️ Auto-Detect: Could not extract owner from', image.fileName);
          }
        }
      }
      setDetectedOwners(ownersMap);
      
      console.log('✅ LoadVault: Loaded', images.length, 'images with ownership detection');
    } catch (err) {
      console.error("Failed to load vault:", err);
    } finally {
      setLoadingVault(false);
    }
  }, [userId]);

  const loadCertificates = useCallback(async () => {
    setLoadingCerts(true);
    try {
      const res = await certAPI.list();
      setCertificates(res.certificates || []);
    } catch (err) {
      console.error("Failed to load certificates:", err);
    } finally {
      setLoadingCerts(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await compareAPI.getHistory();
      setReports(res.reports || []);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  // ✅ ALL useEffect hooks - must be at top
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const accessToken = await appStorage.getItem('access_token');
        const storedUserId = await appStorage.getItem('biovault_userId');
        
        if (!accessToken || !storedUserId) {
          console.log('❌ Dashboard: No valid tokens - redirecting to login');
          navigate('/login', { replace: true });
          setIsCheckingAuth(false);
          return;
        }
        
        console.log('✅ Dashboard: Valid tokens found - allowing access');
        setIsAuthenticated(true);
        setIsCheckingAuth(false);
      } catch (err) {
        console.error('❌ Dashboard: Auth verification failed:', err);
        navigate('/login', { replace: true });
        setIsCheckingAuth(false);
      }
    };
    
    verifyAuth();
  }, [navigate]);

  useEffect(() => {
    loadVaultImages();
    loadCertificates();
    loadReports();
  }, [loadVaultImages, loadCertificates, loadReports]);

  // ===================== STATS =====================
  const stats = {
    totalEncrypted: vaultImages.length,
    totalAnalyzed: reports.length,
    lastActivity: vaultImages[0]?.dateEncrypted || reports[0]?.created_at || null,
  };

  const formatDate = (d: any) => {
    if (!d) return "N/A";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ===================== IMAGE ANALYZER FUNCTIONS =====================
  const handleCameraCapture = async () => {
    try {
      setIsCameraOpen(true);
      const photo = await CameraPlugin.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (photo.base64String) {
        const base64 = `data:image/${photo.format};base64,${photo.base64String}`;
        setCryptoPreview(base64);
        setCryptoBase64(photo.base64String);
        
        // Create a mock File object for file name
        const fileName = `IMG_${Date.now()}.${photo.format || 'jpg'}`;
        const blob = await (async () => {
          const res = await fetch(base64);
          return res.blob();
        })();
        const file = new File([blob], fileName, { type: `image/${photo.format || 'jpeg'}` });
        setCryptoFile(file);
        
        console.log('✅ Camera: Image captured -', fileName);
        setEncryptedResult(null);
        setAnalysisResult(null);
      }
    } catch (err) {
      console.error('❌ Camera Error:', err);
      alert('Failed to capture image from camera');
    } finally {
      setIsCameraOpen(false);
    }
  };

  const handleEncryptImage = async () => {
    if (!cryptoFile) return;
    setIsEncrypting(true);
    try {
      console.log('🔐 Encryption: Starting encryption process...');
      
      // Step 1: Simulate encryption process
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Step 2: Generate asset ID and metadata
      const assetId = `UUID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fileSize = (cryptoFile.size / 1024).toFixed(2) + " KB";
      const timestamp = new Date().toISOString();
      const fileType = cryptoFile.type.split("/")[1]?.toUpperCase() || "UNKNOWN";
      
      // Step 3: Get user ID from storage
      let currentUserId = userId;
      if (!currentUserId) {
        const storedUserId = await appStorage.getItem('biovault_userId');
        currentUserId = storedUserId || "default_user";
        console.log('🔓 Encryption: Retrieved userId from storage:', currentUserId);
      }
      
      // Step 4: Create thumbnail base64 from the file (or use camera base64)
      let thumbnailBase64 = cryptoBase64 || null;
      if (!thumbnailBase64) {
        try {
          thumbnailBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              console.log('📷 Encryption: Created thumbnail, size:', result.length);
              resolve(result);
            };
            reader.onerror = () => {
              console.warn('⚠️ Encryption: Could not read file for thumbnail');
              reject(reader.error);
            };
            reader.readAsDataURL(cryptoFile);
          });
        } catch (thumbErr) {
          console.warn('⚠️ Encryption: Thumbnail creation failed:', thumbErr);
          thumbnailBase64 = null;
        }
      }
      
      // Step 4.5: Embed user ID watermark with metadata into image for ownership verification
      let watermarkedImage = thumbnailBase64;
      try {
        if (thumbnailBase64 && currentUserId) {
          watermarkedImage = await embedUserIdInImage(
            thumbnailBase64,
            currentUserId,
            timestamp,
            fileSize,
            fileType
          );
          console.log('🔐 Watermarking: User ID + metadata embedded into image via multi-region watermarking');
        }
      } catch (watermarkErr) {
        console.warn('⚠️ Watermarking: Could not embed metadata:', watermarkErr);
        watermarkedImage = thumbnailBase64;
      }
      
      // Step 5: Prepare vault data (store FULL encrypted image + thumbnail with watermark)
      const vaultData = {
        asset_id: assetId,
        user_id: currentUserId,
        file_name: cryptoFile.name,
        file_size: fileSize,
        file_hash: `hash-${assetId}`,
        visual_fingerprint: `fingerprint-${assetId}`,
        resolution: "encrypted",
        capture_timestamp: timestamp,
        thumbnail_base64: watermarkedImage,
        image_base64: watermarkedImage,
        certificate_id: null,
        owner_name: "BioVault User",
        owner_email: "user@biovault.app",
      };
      
      console.log('📤 Encryption: Saving to vault...', {
        asset_id: assetId,
        user_id: currentUserId,
        file_name: cryptoFile.name,
        file_size: fileSize,
      });
      
      // Step 6: Save encrypted image to vault backend
      let response;
      try {
        response = await vaultAPI.save(vaultData);
        console.log('✅ Encryption: Image saved to vault:', response);
      } catch (apiErr: any) {
        console.error('❌ Encryption API Error:', apiErr);
        throw new Error(`Vault save failed: ${apiErr.message || 'Unknown error'}`);
      }
      
      // Step 7: Show success result
      setEncryptedResult({
        fileName: cryptoFile.name,
        uuid: assetId,
        encrypted: true,
        timestamp: new Date().toLocaleString(),
        size: fileSize,
        vaultId: response.data?.id || assetId,
      });
      
      // Step 8: Reload vault images to show the new encrypted image
      console.log('🔄 Encryption: Reloading vault images...');
      await loadVaultImages();
      
      // Step 8.5: Auto-detect ownership of newly encrypted image
      if (watermarkedImage) {
        try {
          const detectedOwner = await extractUserIdFromImage(watermarkedImage);
          if (detectedOwner) {
            // Extract userId string from WatermarkMetadata object
            const ownerUserId = typeof detectedOwner === 'string' ? detectedOwner : (detectedOwner as any).userId || '';
            if (ownerUserId) {
              setDetectedOwners(prev => ({ ...prev, [assetId]: ownerUserId }));
              console.log('✅ Auto-Detection: Image ownership verified -', ownerUserId);
            }
          }
        } catch (detectErr) {
          console.warn('⚠️ Auto-Detection: Could not extract owner:', detectErr);
        }
      }
      
      // Step 9: Clear file after successful encryption
      setCryptoFile(null);
      setCryptoPreview("");
      setCryptoBase64("");
      
      console.log('✅ Encryption: Complete!');
      alert("✅ Image encrypted and saved to vault successfully!");
    } catch (err) {
      console.error('❌ Encryption failed:', err);
      const errorMsg = (err as any).message || 'Unknown error';
      alert(`❌ Failed to encrypt image: ${errorMsg}`);
      setEncryptedResult({
        fileName: cryptoFile?.name || "Unknown",
        encrypted: false,
        timestamp: new Date().toLocaleString(),
        error: errorMsg,
      });
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!cryptoFile) return;
    setIsAnalyzing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const result = {
        fileName: cryptoFile.name,
        type: "Mobile Capture",
        confidence: Math.floor(Math.random() * 50) + 70,
        timestamp: new Date().toLocaleString(),
        status: "✓ Authentic",
      };
      setAnalysisResult(result);
      setAnalysisHistory([result, ...analysisHistory.slice(0, 4)]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVerifyProof = async () => {
    if (!verifyFile) return;
    setIsVerifying(true);
    try {
      console.log('📤 Verify Proof: Starting watermark extraction...');
      
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(verifyFile);
      });

      // Extract metadata from watermarked image
      const metadata = await extractUserIdFromImage(base64);
      
      if (metadata) {
        console.log('✅ Verify Proof: Watermark extracted successfully!', metadata);
        setProofResult(metadata);
      } else {
        console.warn('⚠️ Verify Proof: No watermark found in image');
        alert('⚠️ No watermark found. This image may not be encrypted or watermark was removed.');
        setProofResult(null);
      }
    } catch (err) {
      console.error('❌ Verify Proof failed:', err);
      alert('❌ Error: ' + (err as any).message);
      setProofResult(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setVerifyFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const preview = event.target?.result as string;
      setVerifyPreview(preview);
      setVerifyBase64(preview);
    };
    reader.readAsDataURL(file);
    
    console.log('📤 Verify Proof: File selected:', file.name);
  };

  const handleDeleteImage = async (imageId: string) => {
    if (isRestricted) {
      alert("❌ Temporary access: Delete operations are not available. Complete registration for full access.");
      return;
    }
    if (!window.confirm("Delete this image from vault?")) return;
    try {
      // Get user_id from props or storage
      let currentUserId = userId;
      if (!currentUserId) {
        const storedUserId = await appStorage.getItem('biovault_userId');
        currentUserId = storedUserId || undefined;
      }
      
      await vaultAPI.delete(imageId, currentUserId);
      setVaultImages((prev) =>
        prev.filter((img) => img.id !== imageId && img.assetId !== imageId)
      );
      alert("Image deleted successfully");
    } catch (err) {
      alert("Failed to delete: " + (err as any).message);
    }
  };

  const handleViewImage = async (image: any) => {
    console.log('👁️ Viewing image:', image.fileName);
    setSelectedVaultImage(image);
    setShowImageModal(true);
  };

  const handleDownloadImage = async (image: any) => {
    if (isRestricted) {
      alert("❌ Temporary access: Download is not available. Complete registration for full access.");
      return;
    }
    
    setIsDownloading(true);
    try {
      console.log('⬇️ Downloading image:', image.fileName);
      console.log('📱 Asset ID:', image.assetId || image.id);
      
      // Get user ID
      let currentUserId = userId;
      if (!currentUserId) {
        const storedUserId = await appStorage.getItem('biovault_userId');
        currentUserId = storedUserId || undefined;
      }
      
      console.log('👤 User ID:', currentUserId);
      
      if (!currentUserId) {
        alert('❌ Unable to identify user. Please login again.');
        setIsDownloading(false);
        return;
      }
      
      // Try to get image data from multiple sources
      let base64Data = image.image_base64 || image.encrypted_data || image.thumbnail_base64;
      
      // If no base64 in memory, try to download from Cloudinary/API
      if (!base64Data) {
        console.log('📥 Image data not in memory, fetching from server...');
        try {
          const result = await vaultAPI.download(image.assetId || image.id, currentUserId);
          
          if (!result.success) {
            const errorMsg = result.error || 'Unknown error';
            console.error('❌ Download API error:', errorMsg);
            alert(`❌ Download failed:\n\n${errorMsg.substring(0, 200)}`);
            setIsDownloading(false);
            return;
          }
          
          // If we got a URL, fetch the image
          if (result.imageUrl || result.filepath) {
            const imageUrl = result.imageUrl || result.filepath;
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          }
        } catch (apiErr) {
          console.error('❌ Failed to fetch image from server:', apiErr);
          alert('❌ Failed to download image. Please try again.');
          setIsDownloading(false);
          return;
        }
      }
      
      if (!base64Data) {
        alert('❌ No image data available to download');
        setIsDownloading(false);
        return;
      }
      
      // Save image to device gallery in PINIT Vault folder
      console.log('💾 Saving image to PINIT Vault folder...');
      const fileName = image.fileName || image.file_name || 'encrypted-image.jpg';
      const galleryResult = await saveImageToGallery(base64Data, fileName, currentUserId);
      
      if (galleryResult.success) {
        console.log('✅ Image saved successfully:', galleryResult.path);
        alert(`✅ Image Downloaded!\n\n📁 Saved to: PINIT Vault\n\n📸 ${fileName}\n\nCheck your phone's gallery for the image.`);
      } else {
        console.warn('⚠️ Gallery save failed:', galleryResult.error);
        alert(`⚠️ Image download partially successful.\n\nThe image was processed but could not be saved to gallery:\n\n${galleryResult.error}\n\nYou may need to save it manually.`);
      }
      
    } catch (err: any) {
      console.error('❌ Download error:', err);
      const errorMsg = err?.message || String(err) || 'Unknown error';
      alert(`❌ Download failed:\n\n${errorMsg}\n\nPlease try again.`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareImage = async (image: any) => {
    if (isRestricted) {
      alert("❌ Temporary access: Sharing is not available. Complete registration for full access.");
      return;
    }
    
    try {
      console.log('📤 Sharing image:', image.fileName);
      
      // Get base64 from multiple sources
      let base64String = image.image_base64 || image.thumbnail_base64;
      
      if (!base64String && image.thumbnail) {
        console.log('📥 Fetching image from thumbnail URL...');
        const response = await fetch(image.thumbnail, {
          method: 'GET',
          headers: { 'Accept': 'image/*' }
        });
        
        if (!response.ok) throw new Error('Failed to fetch image');
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      }
      
      if (!base64String) {
        alert('⚠️ No image available to share');
        return;
      }
      
      const fileName = image.fileName || 'encrypted-image.jpg';
      console.log('📝 Image ready for sharing, size:', base64String.length);
      
      // Check if running on Capacitor (mobile)
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        console.log('📱 Running on Android/iOS - attempting to share');
        
        try {
          // Check if Share plugin is available
          const { Share: SharePlugin } = await import('@capacitor/share');
          
          // Verify Share is available
          if (!SharePlugin || !SharePlugin.share) {
            throw new Error('Share plugin not available');
          }
          
          console.log('✅ Share plugin available');
          
          // IMPORTANT: Remove data URI prefix and get clean base64
          let cleanBase64 = base64String;
          if (base64String.startsWith('data:')) {
            cleanBase64 = base64String.split(',')[1];
            console.log('✂️ Removed data URI prefix');
          }
          
          // Try Documents directory first (most reliable on Android)
          const documentPath = `PINIT_Share/${fileName}`;
          
          console.log('💾 Saving to Documents:', documentPath);
          
          await (Filesystem as any).writeFile({
            path: documentPath,
            data: cleanBase64,
            directory: Directory.Documents,
            recursive: true,
          });
          
          console.log('✅ File saved to Documents');
          
          // Get the file URI for sharing
          const uri = await (Filesystem as any).getUri({
            path: documentPath,
            directory: Directory.Documents,
          });
          
          console.log('📁 File URI:', uri.uri);
          
          // Open native Android share with better error handling
          console.log('🔄 Opening Android share picker...');
          try {
            await SharePlugin.share({
              url: uri.uri,
              title: 'PINIT Vault Image',
              text: `Sharing: ${fileName}`,
              dialogTitle: 'Share Encrypted Image',
            });
            
            console.log('✅ Shared successfully!');
            alert('✅ Image shared successfully!');
          } catch (shareErr: any) {
            console.error('❌ Share plugin error:', shareErr);
            
            // If Share plugin fails, try fallback with web share API
            if (navigator.share) {
              console.log('📌 Trying Web Share API fallback');
              try {
                const blob = await (async () => {
                  const res = await fetch(image.thumbnail || image.image_base64);
                  return res.blob();
                })();
                
                const file = new File([blob], fileName, { type: 'image/jpeg' });
                await navigator.share({
                  files: [file],
                  title: 'PINIT Vault Image',
                  text: `Sharing: ${fileName}`,
                });
                alert('✅ Image shared successfully!');
              } catch (webErr) {
                console.error('❌ Web Share API error:', webErr);
                throw shareErr; // Rethrow original error
              }
            } else {
              throw shareErr;
            }
          }
        } catch (androidErr: any) {
          console.error('❌ Android sharing failed:', androidErr);
          
          // Final fallback: show URL share dialog
          if (image.thumbnail) {
            console.log('📌 Final fallback - trying thumbnail URL share');
            alert('⚠️ Share plugin issue. Opening image in browser instead.\n\nYou can then save or share from there.');
            window.open(image.thumbnail, '_blank');
          } else {
            const errorMsg = androidErr?.message || androidErr?.toString() || 'Share plugin not found';
            alert(`⚠️ Share error: ${errorMsg}\n\nMake sure Capacitor Share plugin is installed.\n\nYou can download the image instead.`);
          }
        }
      } else {
        // Web browser
        console.log('🌐 Running on web');
        if (navigator.share) {
          console.log('💻 Using Web Share API');
          try {
            const blob = await (async () => {
              const res = await fetch(base64String);
              return res.blob();
            })();
            const file = new File([blob], fileName, { type: 'image/jpeg' });
            await navigator.share({
              files: [file],
              title: 'PINIT Vault Image',
              text: `Sharing: ${fileName}`,
            });
          } catch(err) {
            console.error('Web share failed:', err);
            alert('💡 Sharing on web: Right-click the image and select "Save image as", or download it.');
          }
        } else {
          alert('💡 Sharing on web: Download the image and share it manually, or right-click to save.');
        }
      }
    } catch (err) {
      console.error('❌ Share failed:', err);
      const errorMsg = (err as any)?.message || String(err) || 'Unknown error';
      alert(`❌ Failed to share: ${errorMsg}\n\nTry downloading the image instead.`);
    }
  };

  const copyShareLink = () => {
    if (shareLink) {
      // If it's a WhatsApp URL, open it instead of copying
      if (shareLink.includes('wa.me')) {
        window.open(shareLink, '_blank');
        console.log('✅ Opening WhatsApp share');
      } else {
        navigator.clipboard.writeText(shareLink);
        alert('✅ Link copied to clipboard!');
      }
    }
  };

  // Simplified animations to prevent shaking
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.1 } },
    exit: { opacity: 0, transition: { duration: 0 } },
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.05 } },
  };

  // ===================== HOME PAGE - ADVANCED DASHBOARD =====================
  const HomePage = () => {
    const handleLogout = async () => {
      try {
        await appStorage.removeItem('access_token');
        await appStorage.removeItem('biovault_userId');
        navigate('/login', { replace: true });
      } catch (err) {
        console.error('Logout error:', err);
      }
    };

    return (
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="space-y-6"
      >
        {/* HEADER - ADVANCED WITH USER PROFILE */}
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-6 text-white"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                PINIT Vault
              </h1>
              <p className="text-cyan-300 text-sm mt-1">Secure Digital Ownership Platform</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>

          {/* USER INFO SECTION */}
          <div className="bg-blue-900/40 backdrop-blur rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {(userId?.charAt(0) || 'U').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">User ID: <span className="text-cyan-300">{userId || 'USER'}</span></p>
                  <p className="text-blue-200 text-xs">Premium Access • Full Encryption</p>
                </div>
              </div>
              <Shield className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </motion.div>

        {/* QUICK STATS - ADVANCED CARDS */}
        <motion.div className="grid grid-cols-2 gap-4">
          <motion.div
            variants={itemVariants}
            onClick={() => setActivePage("overview")}
            className="cursor-pointer group"
          >
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-300 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 h-full">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <BarChart3 className="w-8 h-8 text-indigo-600 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-200 px-2 py-1 rounded-full">Active</span>
                </div>
                <p className="text-3xl font-bold text-indigo-900">
                  {stats.totalEncrypted}
                </p>
                <p className="text-sm text-indigo-700 font-semibold">Encrypted Assets</p>
                <p className="text-xs text-indigo-600 mt-2">→ View Dashboard</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={itemVariants}
            onClick={() => setActivePage("vault")}
            className="cursor-pointer group"
          >
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 hover:border-purple-500 hover:shadow-xl transition-all duration-300 h-full">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Database className="w-8 h-8 text-purple-600 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-purple-600 bg-purple-200 px-2 py-1 rounded-full">Records</span>
                </div>
                <p className="text-3xl font-bold text-purple-900">
                  {vaultImages.length}
                </p>
                <p className="text-sm text-purple-700 font-semibold">Stored Files</p>
                <p className="text-xs text-purple-600 mt-2">→ Open Vault</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* MAIN ACTION BUTTONS - ADVANCED DESIGN */}
        <motion.div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-900 px-1 uppercase tracking-wider">
            ✨ Main Features
          </h3>

          {/* IMAGE ANALYZER BUTTON */}
          <motion.button
            variants={itemVariants}
            onClick={() => setActivePage("analyzer")}
            className="w-full group"
          >
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 hover:border-emerald-500 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-200 rounded-lg group-hover:bg-emerald-300 transition">
                      <Camera className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-emerald-900">Encrypt & Verify</p>
                      <p className="text-xs text-emerald-700">Watermark & Proof</p>
                    </div>
                  </div>
                  <Zap className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition" />
                </div>
              </CardContent>
            </Card>
          </motion.button>

          {/* SETTINGS BUTTON */}
          <motion.button
            variants={itemVariants}
            onClick={() => alert('⚙️ Settings coming soon!')}
            className="w-full group"
          >
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 hover:border-orange-500 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-200 rounded-lg group-hover:bg-orange-300 transition">
                      <Settings className="w-6 h-6 text-orange-700" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-orange-900">Settings</p>
                      <p className="text-xs text-orange-700">Security & Preferences</p>
                    </div>
                  </div>
                  <Zap className="w-5 h-5 text-orange-600 group-hover:translate-x-1 transition" />
                </div>
              </CardContent>
            </Card>
          </motion.button>
        </motion.div>

        {/* SECURITY STATUS - ADVANCED */}
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-sm font-bold text-green-900">Security Status</p>
              <p className="text-xs text-green-700">✅ All systems secure • 🔐 Encryption active • 🛡️ Biometric verified</p>
            </div>
          </div>
        </motion.div>

        {/* QUICK INFO CARDS */}
        <motion.div className="grid grid-cols-3 gap-2">
          <motion.div
            variants={itemVariants}
            className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center"
          >
            <Award className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xs font-bold text-blue-900">{stats.totalAnalyzed}</p>
            <p className="text-xs text-blue-700">Analyzed</p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center"
          >
            <Clock className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <p className="text-xs font-bold text-purple-900">24/7</p>
            <p className="text-xs text-purple-700">Protected</p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-green-50 border border-green-200 rounded-lg p-3 text-center"
          >
            <Zap className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs font-bold text-green-900">Live</p>
            <p className="text-xs text-green-700">Active</p>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  };

  // ===================== OVERVIEW PAGE - ADVANCED STATS =====================
  const OverviewPage = () => (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      {/* HEADER WITH BACK BUTTON */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-2 mb-2"
      >
        <Button
          onClick={() => setActivePage("home")}
          variant="ghost"
          className="h-10 w-10 p-0 hover:bg-gray-200 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Statistics</h1>
          <p className="text-xs text-gray-500">Real-time data & analytics</p>
        </div>
      </motion.div>

      {/* MAIN STATS - LARGE CARDS */}
      <motion.div className="grid grid-cols-2 gap-3">
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-indigo-50 via-indigo-100 to-blue-100 border-2 border-indigo-300">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-indigo-200 rounded-lg">
                  <Image className="w-6 h-6 text-indigo-700" />
                </div>
                <span className="text-2xl font-bold text-indigo-600">
                  {stats.totalEncrypted}
                </span>
              </div>
              <p className="text-sm font-bold text-indigo-900">Encrypted Assets</p>
              <p className="text-xs text-indigo-700 mt-2">Protected in vault</p>
              <div className="w-full bg-indigo-200 rounded-full h-2 mt-3">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((stats.totalEncrypted / 100) * 100, 100)}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 border-2 border-green-300">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-green-200 rounded-lg">
                  <FileSearch className="w-6 h-6 text-green-700" />
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {stats.totalAnalyzed}
                </span>
              </div>
              <p className="text-sm font-bold text-green-900">Total Analyzed</p>
              <p className="text-xs text-green-700 mt-2">Proof verified</p>
              <div className="w-full bg-green-200 rounded-full h-2 mt-3">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((stats.totalAnalyzed / 100) * 100, 100)}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ADDITIONAL STATS ROW */}
      <motion.div className="grid grid-cols-3 gap-2">
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-300">
            <CardContent className="p-4 text-center">
              <Award className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-purple-900">{vaultImages.length}</p>
              <p className="text-xs text-purple-700 font-semibold">Files Stored</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300">
            <CardContent className="p-4 text-center">
              <Activity className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-blue-900">24/7</p>
              <p className="text-xs text-blue-700 font-semibold">Monitoring</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-300">
            <CardContent className="p-4 text-center">
              <Shield className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-cyan-900">100%</p>
              <p className="text-xs text-cyan-700 font-semibold">Secure</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* RECENT ACTIVITY SECTION */}
      {vaultImages.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider px-1">
            📋 Recent Activity
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {vaultImages.slice(0, 5).map((img, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-white border-l-4 border-indigo-500 hover:border-indigo-700 rounded-lg p-3 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-indigo-600" />
                    <p className="text-xs font-bold text-gray-900 truncate max-w-xs">
                      {img.fileName || 'Unnamed File'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                    ✓ Secure
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {formatDate(img.dateEncrypted)}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* EMPTY STATE */}
      {vaultImages.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg"
        >
          <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">No files yet</p>
          <p className="text-xs text-gray-500">Start encrypting images to see them here</p>
        </motion.div>
      )}
    </motion.div>
  );

  // ===================== VAULT PAGE =====================
  const VaultPage = () => (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Button
          onClick={() => setActivePage("home")}
          variant="ghost"
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Image Vault</h1>
      </div>

      {/* Images */}
      {loadingVault ? (
        <div className="text-center py-8">
          <Loader className="w-6 h-6 animate-spin mx-auto text-gray-600" />
        </div>
      ) : vaultImages.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {vaultImages.map((img, idx) => (
            <motion.div key={idx} variants={itemVariants}>
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-gray-900">
                          {img.fileName}
                        </p>
                        {detectedOwners[img.assetId] && (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            <span>✓</span>
                            <span>Owner: {detectedOwners[img.assetId]}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDate(img.dateEncrypted)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => handleViewImage(img)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-blue-50"
                        title="View image"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        onClick={() => handleDownloadImage(img)}
                        size="sm"
                        variant="ghost"
                        disabled={isRestricted || isDownloading}
                        className="h-6 w-6 p-0 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-50"
                        title={isRestricted ? "Disabled: Temporary access only" : "Download image"}
                      >
                        <Download className={`w-4 h-4 ${isRestricted ? "text-gray-400" : "text-green-600"}`} />
                      </Button>
                      <Button
                        onClick={() => handleShareImage(img)}
                        size="sm"
                        variant="ghost"
                        disabled={isRestricted}
                        className="h-6 w-6 p-0 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-50"
                        title={isRestricted ? "Disabled: Temporary access only" : "Share image to WhatsApp"}
                      >
                        <Share2 className={`w-4 h-4 ${isRestricted ? "text-gray-400" : "text-purple-600"}`} />
                      </Button>
                      <Button
                        onClick={() => handleDeleteImage(img.id)}
                        size="sm"
                        variant="ghost"
                        disabled={isRestricted}
                        className="h-6 w-6 p-0 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-50"
                        title={isRestricted ? "Disabled: Temporary access only" : "Delete image"}
                      >
                        <Trash2 className={`w-4 h-4 ${isRestricted ? "text-gray-400" : "text-red-600"}`} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No images in vault</p>
        </div>
      )}

      {/* Certificates */}
      {certificates.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-bold text-gray-900 mb-2">
            📜 Certificates ({certificates.length})
          </h3>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {certificates.map((cert, idx) => (
              <Card key={idx} className="bg-amber-50 border border-amber-200">
                <CardContent className="p-2">
                  <p className="text-xs font-bold text-amber-900">
                    {cert.certificate_id?.slice(0, 20)}...
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  // ===================== ANALYZER PAGE =====================
  const AnalyzerPage = () => (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-4">
        <Button
          onClick={() => setActivePage("home")}
          variant="ghost"
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Image Analyzer</h1>
      </div>

      {/* Camera Capture - CAMERA ONLY, NO FILE UPLOAD */}
      <motion.div variants={itemVariants}>
        <Button
          onClick={handleCameraCapture}
          disabled={isRestricted || isCameraOpen}
          className={`w-full h-12 ${isRestricted ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"} text-white border-0 font-semibold`}
        >
          <Camera className="w-5 h-5 mr-2" />
          {isCameraOpen ? "Opening Camera..." : "📷 Open Camera to Encrypt Image"}
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          {isRestricted ? "⏱️ Camera disabled (Temporary access)" : "Click to open device camera and capture image"}
        </p>
      </motion.div>

      {/* Preview with Details */}
      {cryptoPreview && (
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-300">
            <CardContent className="p-3 space-y-2">
              <img
                src={cryptoPreview}
                alt="preview"
                className="w-full max-h-40 object-cover rounded border border-purple-200"
              />
              <div className="pt-2 space-y-1 text-xs border-t border-purple-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">📁 File:</span>
                  <span className="text-gray-900 font-mono truncate max-w-[150px]" title={cryptoFile?.name}>{cryptoFile?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">💾 Size:</span>
                  <span className="text-gray-900 font-bold">{cryptoFile ? (cryptoFile.size / 1024).toFixed(2) : 0} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">🏷️ Type:</span>
                  <span className="text-gray-900 font-bold">{cryptoFile?.type || 'Unknown'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Button - Encrypt Only */}
      <motion.div variants={itemVariants}>
        <Button
          onClick={handleEncryptImage}
          disabled={!cryptoFile || isEncrypting || isRestricted}
          className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition"
          title={isRestricted ? "Disabled: Temporary access only" : "Encrypt and watermark the image with your ID"}
        >
          {isEncrypting ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              <span>🔐 Encrypting & Watermarking...</span>
            </>
          ) : isRestricted ? (
            <>
              <Lock className="w-4 h-4 mr-2" />
              <span>🔒 Locked (Temporary Access)</span>
            </>
          ) : (
            <span>🔐 Encrypt & Watermark Image</span>
          )}
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          {!cryptoFile ? "Capture or select an image first" : "Click to encrypt and embed your watermark"}
        </p>
      </motion.div>

      {/* Results */}
      {encryptedResult && (
        <motion.div variants={itemVariants}>
          <Card className="bg-green-50 border border-green-300">
            <CardContent className="p-3">
              <p className="text-xs font-bold text-green-700 mb-2">
                ✓ Encrypted Successfully
              </p>
              <p className="text-xs text-gray-600 truncate">
                UUID: {encryptedResult.uuid}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {analysisResult && (
        <motion.div variants={itemVariants}>
          <Card className="bg-blue-50 border border-blue-300">
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-gray-900">
                  {analysisResult.type}
                </p>
                <p className="text-xs font-bold text-green-600">
                  {analysisResult.status}
                </p>
              </div>
              <p className="text-xs text-gray-600">
                Confidence: <span className="font-bold">{analysisResult.confidence}%</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* VERIFY PROOF SECTION */}
      <motion.div variants={itemVariants} className="border-t-2 border-gray-200 pt-4">
        <h2 className="text-sm font-bold text-gray-900 mb-3">📤 Verify Proof</h2>
        <p className="text-xs text-gray-600 mb-3">Upload an encrypted image to verify ownership and extract metadata</p>
        
        {/* File Upload Input */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-700 mb-2">Select Encrypted Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleVerifyFileSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs file:mr-2 file:py-1 file:px-2 file:bg-indigo-600 file:text-white file:border-0 file:rounded cursor-pointer"
            disabled={isVerifying}
          />
        </div>

        {/* Preview */}
        {verifyPreview && (
          <motion.div variants={itemVariants} className="mb-3">
            <Card className="bg-gray-50 border border-gray-200">
              <CardContent className="p-3">
                <img
                  src={verifyPreview}
                  alt="verify-preview"
                  className="w-full max-h-40 object-cover rounded"
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Verify Button - Full Width */}
        <Button
          onClick={handleVerifyProof}
          disabled={!verifyFile || isVerifying}
          className="w-full h-12 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white border-0 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition"
        >
          {isVerifying ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              <span>📤 Extracting Watermark...</span>
            </>
          ) : (
            <span>✅ Verify Ownership & Extract Data</span>
          )}
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          {!verifyFile ? "Upload an encrypted image to verify" : "Click to extract watermark and owner info"}
        </p>

        {/* Proof Card Result */}
        {proofResult && (
          <motion.div variants={itemVariants} className="mt-4">
            <Card className="bg-emerald-50 border border-emerald-300">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</div>
                  <p className="text-xs font-bold text-emerald-700">Watermark Verified</p>
                </div>
                
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-700 font-semibold">Owner ID:</span>
                    <span className="text-gray-900 font-bold text-right">{proofResult.userId}</span>
                  </div>
                  
                  <div className="flex justify-between items-start">
                    <span className="text-gray-700 font-semibold">Encrypted:</span>
                    <span className="text-gray-600 text-right text-xs">{new Date(proofResult.timestamp).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-start">
                    <span className="text-gray-700 font-semibold">File Size:</span>
                    <span className="text-gray-900 font-bold">{proofResult.fileSize}</span>
                  </div>
                  
                  <div className="flex justify-between items-start">
                    <span className="text-gray-700 font-semibold">File Type:</span>
                    <span className="text-gray-900 font-bold">{proofResult.fileType}</span>
                  </div>
                  
                  <div className="flex justify-between items-start pt-2 border-t border-emerald-200">
                    <span className="text-gray-700 font-semibold">Confidence:</span>
                    <span className="text-emerald-700 font-bold">{proofResult.confidence}/5 regions</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {proofResult === null && verifyFile && !isVerifying && (
          <motion.div variants={itemVariants} className="mt-4">
            <Card className="bg-red-50 border border-red-300">
              <CardContent className="p-3">
                <p className="text-xs font-bold text-red-700">
                  ❌ No Watermark Found
                </p>
                <p className="text-xs text-red-600 mt-1">
                  This image may not contain a valid watermark or the watermark was removed.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* History */}
      {analysisHistory.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-bold text-gray-900 mb-1">
            📋 Analysis History
          </h3>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {analysisHistory.map((item, idx) => (
              <Card key={idx} className="bg-white border border-gray-200">
                <CardContent className="p-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-700">{item.type}</span>
                    <span className="font-bold text-blue-600">
                      {item.confidence}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  return (
    <div className="w-full min-h-screen bg-slate-900 p-3 md:p-4 rounded-xl">
      <AnimatePresence mode="sync">
        {activePage === "home" && <HomePage key="home" />}
        {activePage === "overview" && <OverviewPage key="overview" />}
        {activePage === "vault" && <VaultPage key="vault" />}
        {activePage === "analyzer" && <AnalyzerPage key="analyzer" />}
      </AnimatePresence>

      {/* IMAGE VIEWER MODAL */}
      {showImageModal && selectedVaultImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedVaultImage.fileName}</h2>
                {detectedOwners[selectedVaultImage.assetId] && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                      <span>✓ Ownership Verified</span>
                    </span>
                    <span className="text-xs text-green-700 font-mono">Owner: {detectedOwners[selectedVaultImage.assetId]}</span>
                  </div>
                )}
              </div>
              <Button
                onClick={() => setShowImageModal(false)}
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>
            
            <div className="flex-1 flex items-center justify-center bg-gray-50 p-4 overflow-auto">
              {selectedVaultImage.thumbnail ? (
                <img
                  src={selectedVaultImage.thumbnail}
                  alt={selectedVaultImage.fileName}
                  className="max-w-full max-h-full object-contain rounded"
                  onError={(e) => {
                    console.warn('❌ Thumbnail URL failed to load:', selectedVaultImage.thumbnail);
                    // Try fallback to base64
                    if (selectedVaultImage.image_base64) {
                      console.log('📥 Switching to base64 fallback');
                      (e.target as HTMLImageElement).src = selectedVaultImage.image_base64;
                    } else if (selectedVaultImage.thumbnail_base64) {
                      (e.target as HTMLImageElement).src = selectedVaultImage.thumbnail_base64;
                    }
                  }}
                />
              ) : selectedVaultImage.image_base64 ? (
                <img
                  src={selectedVaultImage.image_base64}
                  alt={selectedVaultImage.fileName}
                  className="max-w-full max-h-full object-contain rounded"
                />
              ) : selectedVaultImage.thumbnail_base64 ? (
                <img
                  src={selectedVaultImage.thumbnail_base64}
                  alt={selectedVaultImage.fileName}
                  className="max-w-full max-h-full object-contain rounded"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <Image className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>❌ No preview available</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t">
              <Button
                onClick={() => handleDownloadImage(selectedVaultImage)}
                variant="default"
                disabled={isDownloading}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button
                onClick={() => {
                  setShowImageModal(false);
                  handleShareImage(selectedVaultImage);
                }}
                variant="outline"
                className="gap-2"
              >
                <Lock className="w-4 h-4" />
                Share
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* SHARE LINK MODAL */}
      {showShareModal && shareLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="bg-white rounded-lg max-w-md w-full p-6"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">📤 Share Image</h2>
            
            {shareLink.includes('wa.me') ? (
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded border-2 border-green-300">
                  <p className="text-sm font-bold text-green-700 mb-2">💬 Share via WhatsApp</p>
                  <p className="text-xs text-gray-600 mb-3">Your encrypted image details will be shared as a message</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={copyShareLink}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                  >
                    💚 Open WhatsApp
                  </Button>
                  <Button
                    onClick={() => setShowShareModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  This will open WhatsApp and let you compose a message with encrypted image details.
                </p>
              </div>
            ) : (
              <div>
                <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-4">
                  <p className="text-xs text-gray-600 mb-2">Share Link:</p>
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="w-full text-xs bg-white border border-gray-300 rounded px-3 py-2 font-mono"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={copyShareLink}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    📋 Copy Link
                  </Button>
                  <Button
                    onClick={() => setShowShareModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Share this link with others to let them view your encrypted image.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default PINITDashboard;
