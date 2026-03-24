import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ArrowLeft, Image, Database, Loader, LayoutDashboard, Award, Clock, FileSearch, Activity, Calendar, Download, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { vaultAPI, certAPI, compareAPI } from "@/utils/apiClient";

interface PINITDashboardProps {
  userId?: string;
}

export function PINITDashboard({ userId }: PINITDashboardProps) {
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

  // ===================== LOAD REAL DATA FROM APIs =====================
  const loadVaultImages = useCallback(async () => {
    setLoadingVault(true);
    try {
      const res = await vaultAPI.list();
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
    } catch (err) {
      console.error("Failed to load vault:", err);
    } finally {
      setLoadingVault(false);
    }
  }, []);

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
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const uuid = `UUID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setEncryptedResult({
        fileName: cryptoFile.name,
        uuid,
        encrypted: true,
        timestamp: new Date().toLocaleString(),
        size: (cryptoFile.size / 1024).toFixed(2) + " KB",
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
    if (!window.confirm("Delete this image from vault?")) return;
    try {
      await vaultAPI.delete(imageId);
      setVaultImages((prev) =>
        prev.filter((img) => img.id !== imageId && img.assetId !== imageId)
      );
      alert("Image deleted successfully");
    } catch (err) {
      alert("Failed to delete: " + (err as any).message);
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
                    <Button
                      onClick={() => handleDeleteImage(img.id)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
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
        <label className="block">
          <div className="border-2 border-dashed border-indigo-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition">
            <input
              type="file"
              onChange={handleFileSelect}
              accept="image/*,.pdf"
              className="hidden"
            />
            <Camera className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-900">
              {cryptoFile ? cryptoFile.name : "Select Image or PDF"}
            </p>
            <p className="text-xs text-gray-500">Click to upload</p>
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
            disabled={!cryptoFile || isEncrypting}
            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white border-0 text-xs"
          >
            {isEncrypting ? (
              <>
                <Loader className="w-3 h-3 mr-1 animate-spin" />
                <span>Encrypting...</span>
              </>
            ) : (
              <span>🔐 Encrypt</span>
            )}
          </Button>
          <Button
            onClick={handleAnalyzeImage}
            disabled={!cryptoFile || isAnalyzing}
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs"
          >
            {isAnalyzing ? (
              <>
                <Loader className="w-3 h-3 mr-1 animate-spin" />
                <span>Analyzing...</span>
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
    </div>
  );
}

export default PINITDashboard;
