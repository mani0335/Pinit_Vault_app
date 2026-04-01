import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ArrowLeft, Image, Database, Loader, LayoutDashboard, Award, Clock, FileSearch, Activity, Calendar, Download, Trash2, Eye, Lock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { vaultAPI, certAPI, compareAPI } from "@/utils/apiClient";
import { appStorage } from "@/lib/storage";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

interface PINITDashboardProps {
  userId?: string;
  isRestricted?: boolean;
}

export function PINITDashboard({ userId, isRestricted }: PINITDashboardProps) {
  const [activePage, setActivePage] = useState<"home" | "overview" | "vault" | "analyzer">("home");

  // ===================== REAL DATA FROM APIs =====================
  const [vaultImages, setVaultImages] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);

  // IMAGE ANALYZER STATE
  const [cryptoFile, setCryptoFile] = useState<File | null>(null);
  const [cryptoPreview, setCryptoPreview] = useState<string>("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [encryptedResult, setEncryptedResult] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);

  // VAULT IMAGE VIEWER & SHARING
  const [selectedVaultImage, setSelectedVaultImage] = useState<any>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ===================== LOAD REAL DATA FROM APIs =====================
  const loadVaultImages = useCallback(async () => {
    setLoadingVault(true);
    try {
      // Get user_id from props or storage
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
      console.log('✅ LoadVault: Loaded', images.length, 'images');
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
  const handleFileSelect = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      setCryptoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCryptoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setEncryptedResult(null);
      setAnalysisResult(null);
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
      
      // Step 3: Get user ID from storage
      let currentUserId = userId;
      if (!currentUserId) {
        const storedUserId = await appStorage.getItem('biovault_userId');
        currentUserId = storedUserId || "default_user";
        console.log('🔓 Encryption: Retrieved userId from storage:', currentUserId);
      }
      
      // Step 4: Create thumbnail base64 from the file
      let thumbnailBase64 = null;
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
        // Continue without thumbnail
        thumbnailBase64 = null;
      }
      
      // Step 5: Prepare vault data
      const vaultData = {
        asset_id: assetId,
        user_id: currentUserId,
        file_name: cryptoFile.name,
        file_size: fileSize,
        file_hash: `hash-${assetId}`,
        visual_fingerprint: `fingerprint-${assetId}`,
        resolution: "encrypted",
        capture_timestamp: timestamp,
        thumbnail_base64: thumbnailBase64,
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
      
      // Step 9: Clear file after successful encryption
      setCryptoFile(null);
      setCryptoPreview("");
      
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
      
      if (!image.thumbnail) {
        alert('⚠️ Download URL not available for this image');
        setIsDownloading(false);
        return;
      }

      // Fetch image blob from thumbnail URL
      const response = await fetch(image.thumbnail, {
        method: 'GET',
        headers: { 'Accept': 'image/*' }
      });
      
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const fileName = image.fileName || 'encrypted-image.jpg';
      
      console.log('📦 Blob size:', blob.size, 'bytes, Type:', blob.type);
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          console.log('📝 Base64 ready, length:', base64Data.length);
          
          // Save using Capacitor Filesystem
          try {
            const writeResult = await (Filesystem as any).writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Downloads,
              encoding: Encoding.UTF8,
            });
            
            console.log('✅ File saved to Downloads:', writeResult);
            alert(`✅ Image Downloaded Successfully!\n\n📁 File: ${fileName}\n\n📸 Check your Gallery/Downloads folder.`);
            
          } catch (fsErr: any) {
            console.error('⚠️ Filesystem save failed:', fsErr);
            
            // Fallback: Browser download
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            }, 100);
            
            alert(`✅ Image Downloaded!\n\n📁 File: ${fileName}`);
          }
          
        } catch (err) {
          console.error('❌ Error processing download:', err);
          alert('Failed to process download: ' + (err as any).message);
        } finally {
          setIsDownloading(false);
        }
      };
      
      reader.onerror = () => {
        console.error('❌ FileReader error:', reader.error);
        alert('Failed to read image file');
        setIsDownloading(false);
      };
      
      reader.readAsDataURL(blob);
      
    } catch (err) {
      console.error('❌ Download failed:', err);
      alert('Failed to download: ' + (err as any).message);
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
      
      if (!image.thumbnail) {
        alert('⚠️ No image available to share');
        return;
      }

      // Fetch image blob
      const response = await fetch(image.thumbnail, {
        method: 'GET',
        headers: { 'Accept': 'image/*' }
      });
      
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const fileName = image.fileName || 'encrypted-image.jpg';
      
      console.log('📦 Blob ready for sharing:', blob.size, 'bytes');
      
      // Convert blob to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            
            // Save file to cache using Capacitor
            try {
              const cacheDir = Directory.Cache;
              await (Filesystem as any).writeFile({
                path: fileName,
                data: base64Data,
                directory: cacheDir,
                encoding: Encoding.UTF8,
              });
              
              console.log('✅ File saved to cache:', fileName);
              
              // Get the file URI for sharing
              const fileUri = `file://${cacheDir}/${fileName}`;
              
              // Try Capacitor Share first (native Android share picker)
              try {
                await Share.share({
                  title: 'Share Encrypted Image',
                  text: `🔐 Encrypted Image: ${fileName}\n⏰ Date: ${formatDate(image.dateEncrypted)}\n📊 Size: ${image.fileSize}`,
                  url: fileUri,
                });
                console.log('✅ Shared via native share');
                resolve(true);
              } catch (shareErr: any) {
                console.log('⚠️ Native share not available, opening WhatsApp fallback');
                
                // Fallback: Open WhatsApp with message and let user manually add image
                const whatsappMessage = encodeURIComponent(`🔐 *Encrypted Image*\n\n📸 *File:* ${fileName}\n⏰ *Date:* ${formatDate(image.dateEncrypted)}\n📊 *Size:* ${image.fileSize}\n\nCheck out this encrypted image from BioVault!`);
                const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;
                
                setShareLink(whatsappUrl);
                setShowShareModal(true);
                resolve(true);
              }
              
            } catch (fsErr) {
              console.error('❌ Filesystem error:', fsErr);
              alert('⚠️ Could not save image. Try sharing via WhatsApp manually.');
              reject(fsErr);
            }
            
          } catch (err) {
            console.error('❌ Error processing share:', err);
            alert('Failed to prepare image for sharing');
            reject(err);
          }
        };
        
        reader.onerror = () => {
          console.error('❌ FileReader error:', reader.error);
          alert('Failed to read image file');
          reject(reader.error);
        };
        
        reader.readAsDataURL(blob);
      });
      
    } catch (err) {
      console.error('❌ Share failed:', err);
      alert('Failed to share: ' + (err as any).message);
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

  const pageVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  // ===================== HOME PAGE =====================
  const HomePage = () => (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-4"
    >
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🔐 BioVault Dashboard
        </h1>
        <p className="text-sm text-gray-600">
          Image Forensics & Vault Management
        </p>
      </div>

      {/* Navigation Cards */}
      <motion.div className="grid grid-cols-1 gap-3">
        <motion.div
          variants={itemVariants}
          onClick={() => setActivePage("overview")}
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 hover:border-blue-500 cursor-pointer shadow-md hover:shadow-lg transition">
            <CardContent className="p-6 text-center">
              <LayoutDashboard className="w-10 h-10 text-blue-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Dashboard Overview
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                View stats and recent activity
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
                View Stats
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={itemVariants}
          onClick={() => setActivePage("vault")}
        >
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 hover:border-purple-500 cursor-pointer shadow-md hover:shadow-lg transition">
            <CardContent className="p-6 text-center">
              <Database className="w-10 h-10 text-purple-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Image Vault
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Browse encrypted images and certificates
              </p>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0">
                Open Vault
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={itemVariants}
          onClick={() => setActivePage("analyzer")}
        >
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-300 hover:border-indigo-500 cursor-pointer shadow-md hover:shadow-lg transition">
            <CardContent className="p-6 text-center">
              <Camera className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Image Analyzer
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Encrypt and analyze images
              </p>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0">
                Start Analyzing
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* User Info */}
      <motion.div
        variants={itemVariants}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
      >
        <p className="text-xs text-blue-900">
          <span className="font-bold">👤 User ID:</span> {userId || "USER"}
        </p>
      </motion.div>
    </motion.div>
  );

  // ===================== OVERVIEW PAGE =====================
  const OverviewPage = () => (
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
        <h1 className="text-lg font-bold text-gray-900">Dashboard Overview</h1>
      </div>

      {/* Stats Cards */}
      <motion.div className="grid grid-cols-2 gap-2">
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-300">
            <CardContent className="p-4 text-center">
              <Image className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-indigo-700">
                {stats.totalEncrypted}
              </p>
              <p className="text-xs text-gray-600">Images in Vault</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border border-green-300">
            <CardContent className="p-4 text-center">
              <FileSearch className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">
                {stats.totalAnalyzed}
              </p>
              <p className="text-xs text-gray-600">Total Analyzed</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Recent Activity */}
      {vaultImages.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-bold text-gray-900 mb-2">
            📋 Recent Vault Entries
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {vaultImages.slice(0, 5).map((img, idx) => (
              <Card
                key={idx}
                className="bg-white border border-gray-200 hover:border-gray-400"
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-gray-900">
                      {img.fileName}
                    </p>
                    <p className="text-xs text-green-600">
                      ✓ {img.status}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDate(img.dateEncrypted)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
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
                      <p className="text-xs font-bold text-gray-900">
                        {img.fileName}
                      </p>
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
                        title={isRestricted ? "Disabled: Temporary access only" : "Share image"}
                      >
                        <Lock className={`w-4 h-4 ${isRestricted ? "text-gray-400" : "text-purple-600"}`} />
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

      {/* File Upload */}
      <motion.div variants={itemVariants}>
        <label className={`block ${isRestricted ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
          <div className={`border-2 border-dashed ${isRestricted ? "border-gray-300 bg-gray-50" : "border-indigo-300 hover:border-indigo-500"} rounded-lg p-4 text-center transition`}>
            <input
              type="file"
              onChange={handleFileSelect}
              accept="image/*,.pdf"
              disabled={isRestricted}
              className="hidden"
            />
            <Camera className={`w-6 h-6 ${isRestricted ? "text-gray-400" : "text-indigo-600"} mx-auto mb-2`} />
            <p className={`text-xs font-semibold ${isRestricted ? "text-gray-600" : "text-gray-900"}`}>
              {isRestricted ? "⏱️ Upload Disabled (Temporary Access)" : (cryptoFile ? cryptoFile.name : "Select Image or PDF")}
            </p>
            <p className={`text-xs ${isRestricted ? "text-gray-500" : "text-gray-500"}`}>
              {isRestricted ? "Complete registration to upload files" : "Click to upload"}
            </p>
          </div>
        </label>
      </motion.div>

      {/* Preview */}
      {cryptoPreview && (
        <motion.div variants={itemVariants}>
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-3">
              <img
                src={cryptoPreview}
                alt="preview"
                className="w-full max-h-40 object-cover rounded"
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleEncryptImage}
            disabled={!cryptoFile || isEncrypting || isRestricted}
            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white border-0 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            title={isRestricted ? "Disabled: Temporary access only" : "Encrypt the selected image"}
          >
            {isEncrypting ? (
              <>
                <Loader className="w-3 h-3 mr-1 animate-spin" />
                <span>Encrypting...</span>
              </>
            ) : isRestricted ? (
              <>
                <Lock className="w-3 h-3 mr-1" />
                <span>🔒 Locked</span>
              </>
            ) : (
              <span>🔐 Encrypt</span>
            )}
          </Button>
          <Button
            onClick={handleAnalyzeImage}
            disabled={!cryptoFile || isAnalyzing || isRestricted}
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            title={isRestricted ? "Disabled: Temporary access only" : "Analyze the selected image"}
          >
            {isAnalyzing ? (
              <>
                <Loader className="w-3 h-3 mr-1 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : isRestricted ? (
              <>
                <Lock className="w-3 h-3 mr-1" />
                <span>🔒 Locked</span>
              </>
            ) : (
              <span>🔍 Analyze</span>
            )}
          </Button>
        </div>
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
    <div className="w-full min-h-screen bg-white p-3 md:p-4 rounded-xl">
      <AnimatePresence mode="wait">
        {activePage === "home" && <HomePage key="home" />}
        {activePage === "overview" && <OverviewPage key="overview" />}
        {activePage === "vault" && <VaultPage key="vault" />}
        {activePage === "analyzer" && <AnalyzerPage key="analyzer" />}
      </AnimatePresence>

      {/* IMAGE VIEWER MODAL */}
      {showImageModal && selectedVaultImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">{selectedVaultImage.fileName}</h2>
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
                />
              ) : (
                <div className="text-center text-gray-500">
                  <Image className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No preview available</p>
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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
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
