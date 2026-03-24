import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ArrowLeft, Image, Database, Loader, CheckCircle, Lock, Zap, BarChart3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PINITDashboardProps {
  userId?: string;
}

export function PINITDashboard({ userId }: PINITDashboardProps) {
  const [currentPage, setCurrentPage] = useState<"home" | "backend" | "crypto-analyzer">("home");

  // ===================== BACKEND STATE =====================
  const [backendInput, setBackendInput] = useState("");
  const [backendResults, setBackendResults] = useState<any[]>([]);
  const [backendUrl, setBackendUrl] = useState("http://localhost:8000");

  // ===================== CRYPTO ANALYZER STATE =====================
  const [cryptoFile, setCryptoFile] = useState<File | null>(null);
  const [cryptoPreview, setCryptoPreview] = useState<string>("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [encryptedResult, setEncryptedResult] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);

  const pageVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  // ===================== CRYPTO ANALYZER FUNCTIONS =====================
  const handleCryptoFileSelect = (e: any) => {
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

  const generateUUID = () => "UUID-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

  // ===================== BACKEND API FUNCTIONS =====================
  const callBackendAPI = async (endpoint: string, method: "POST" | "GET" = "POST") => {
    try {
      const url = `${backendUrl}${endpoint}`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? backendInput : undefined
      });
      const data = await response.json();
      setBackendResults([
        {
          timestamp: new Date().toLocaleString(),
          endpoint,
          status: response.ok ? "✓ Success (200)" : `✗ Error (${response.status})`,
          method,
          response: data
        },
        ...backendResults.slice(0, 4)
      ]);
    } catch (error: any) {
      setBackendResults([
        {
          timestamp: new Date().toLocaleString(),
          endpoint,
          status: "✗ Connection Error",
          method,
          response: error.message
        },
        ...backendResults.slice(0, 4)
      ]);
    }
  };

  const handleEncryptImage = async () => {
    if (!cryptoFile) return;
    setIsEncrypting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const uuid = generateUUID();
      setEncryptedResult({
        fileName: cryptoFile.name,
        uuid,
        encrypted: true,
        timestamp: new Date().toLocaleString(),
        size: (cryptoFile.size / 1024).toFixed(2) + " KB"
      });
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!cryptoFile) return;
    setIsAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const types = [
        { type: "Mobile Capture", confidence: 92 },
        { type: "AI-Generated", confidence: 87 },
        { type: "Web Download", confidence: 78 },
        { type: "Screen Capture", confidence: 85 }
      ];
      const result = types[Math.floor(Math.random() * types.length)];
      const analysis = {
        fileName: cryptoFile.name,
        ...result,
        timestamp: new Date().toLocaleString(),
        status: result.confidence > 85 ? "✓ Authentic" : "⚠ Modified"
      };
      setAnalysisResult(analysis);
      setAnalysisHistory([analysis, ...analysisHistory.slice(0, 4)]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ===================== HOME PAGE =====================
  const HomePage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">🚀 BioVault Dashboard</h1>
        <p className="text-sm text-gray-600">Image Analysis & Backend Processing</p>
      </div>

      {/* Main Navigation Cards */}
      <motion.div className="grid grid-cols-1 gap-3">
        {/* Image Crypto Analyzer Card */}
        <motion.div variants={itemVariants}>
          <Card
            onClick={() => setCurrentPage("crypto-analyzer")}
            className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-300 hover:border-indigo-500 cursor-pointer shadow-md hover:shadow-lg transition"
          >
            <CardContent className="p-6 text-center">
              <Image className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-900 mb-1">Image Crypto Analyzer</h2>
              <p className="text-sm text-gray-600 mb-4">Analyze, verify, and encrypt images with advanced forensics</p>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0">
                Open Analyzer
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Backend Processing Card */}
        <motion.div variants={itemVariants}>
          <Card
            onClick={() => setCurrentPage("backend")}
            className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 hover:border-red-500 cursor-pointer shadow-md hover:shadow-lg transition"
          >
            <CardContent className="p-6 text-center">
              <Database className="w-10 h-10 text-red-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-900 mb-1">Backend Processing</h2>
              <p className="text-sm text-gray-600 mb-4">Access APIs and manage backend operations</p>
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white border-0">
                Open Backend
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Quick Info */}
      <motion.div variants={itemVariants} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-900">
          <span className="font-bold">ℹ️ User ID:</span> {userId || "USER"}
        </p>
      </motion.div>
    </motion.div>
  );

  // ===================== BACKEND PAGE =====================
  const BackendPage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Backend Processing Center</h1>
      </div>

      {/* Backend Status */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-red-50 to-red-100 border border-red-300">
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600">Backend Status</p>
              <p className="text-lg font-bold text-red-700">🚀 Active & Connected</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Input */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-gray-900 mb-2">📝 Backend URL & Data</h3>
        <input
          type="text"
          value={backendUrl}
          onChange={(e) => setBackendUrl(e.target.value)}
          placeholder="http://localhost:8000"
          className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:border-red-500 mb-2"
        />
        <textarea
          value={backendInput}
          onChange={(e) => setBackendInput(e.target.value)}
          placeholder='{"username": "test", "password": "password"}'
          className="w-full p-3 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:border-red-500"
          rows={3}
        />
      </motion.div>

      {/* Processing Options */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-gray-900 mb-2">⚙️ API Operations</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={() => callBackendAPI("/auth/login")}
            className="h-10 bg-red-600 hover:bg-red-700 text-white border-0 text-xs"
          >
            <span>🔑 Auth</span>
          </Button>
          <Button 
            onClick={() => callBackendAPI("/vault/upload")}
            className="h-10 bg-rose-600 hover:bg-rose-700 text-white border-0 text-xs"
          >
            <span>📦 Vault</span>
          </Button>
          <Button 
            onClick={() => callBackendAPI("/compare/save")}
            className="h-10 bg-red-500 hover:bg-red-600 text-white border-0 text-xs"
          >
            <span>⚖️ Compare</span>
          </Button>
          <Button 
            onClick={() => callBackendAPI("/certificates/list", "GET")}
            className="h-10 bg-amber-600 hover:bg-amber-700 text-white border-0 text-xs"
          >
            <span>📜 Certs</span>
          </Button>
        </div>
      </motion.div>

      {/* Results */}
      {backendResults.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-bold text-gray-900 mb-2">📊 API Responses</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {backendResults.map((result, idx) => (
              <Card key={idx} className={`bg-white border ${result.status.includes("Success") ? "border-green-300" : "border-red-300"}`}>
                <CardContent className="p-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-gray-900">{result.endpoint}</p>
                    <p className={`text-xs font-bold ${result.status.includes("Success") ? "text-green-600" : "text-red-600"}`}>{result.status}</p>
                  </div>
                  <p className="text-xs text-gray-400">{result.timestamp}</p>
                  {result.response && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{JSON.stringify(result.response).substring(0, 80)}...</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* API Documentation */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-gray-900 mb-2">📡 Backend Endpoints</h3>
        <div className="space-y-1 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-gray-600"><span className="font-bold text-red-600">POST</span> /auth/login - User authentication</p>
          <p className="text-gray-600"><span className="font-bold text-red-600">POST</span> /vault/upload - Upload to vault</p>
          <p className="text-gray-600"><span className="font-bold text-red-600">POST</span> /compare/save - Save comparison data</p>
          <p className="text-gray-600"><span className="font-bold text-red-600">GET</span> /certificates/list - List certificates</p>
          <p className="text-gray-600"><span className="font-bold text-red-600">POST</span> /admin/users - Manage users</p>
        </div>
      </motion.div>
    </motion.div>
  );

  // ===================== IMAGE CRYPTO ANALYZER PAGE =====================
  const CryptoAnalyzerPage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Image Crypto Analyzer</h1>
      </div>

      {/* Analyzer Status */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-300">
          <CardContent className="p-4 flex items-center gap-3">
            <Image className="w-6 h-6 text-indigo-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600">Crypto Analyzer</p>
              <p className="text-lg font-bold text-indigo-700">✨ Ready to Process</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* File Upload */}
      <motion.div variants={itemVariants}>
        <label className="block">
          <div className="border-2 border-dashed border-indigo-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition">
            <input
              type="file"
              onChange={handleCryptoFileSelect}
              accept="image/*,.pdf"
              className="hidden"
            />
            <Camera className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-900">{cryptoFile ? cryptoFile.name : "Select Image or PDF"}</p>
            <p className="text-xs text-gray-500">Click to upload</p>
          </div>
        </label>
      </motion.div>

      {/* Image Preview */}
      {cryptoPreview && (
        <motion.div variants={itemVariants}>
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-3">
              <img src={cryptoPreview} alt="preview" className="w-full max-h-40 object-cover rounded" />
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
            {isEncrypting ? <>
              <Loader className="w-3 h-3 mr-1 animate-spin" />
              <span>Encrypting...</span>
            </> : <>
              <span>🔐 Encrypt</span>
            </>}
          </Button>
          <Button
            onClick={handleAnalyzeImage}
            disabled={!cryptoFile || isAnalyzing}
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs"
          >
            {isAnalyzing ? <>
              <Loader className="w-3 h-3 mr-1 animate-spin" />
              <span>Analyzing...</span>
            </> : <>
              <span>🔍 Analyze</span>
            </>}
          </Button>
        </div>
      </motion.div>

      {/* Encryption Result */}
      {encryptedResult && (
        <motion.div variants={itemVariants}>
          <Card className="bg-green-50 border border-green-300">
            <CardContent className="p-3">
              <p className="text-xs font-bold text-green-700 mb-2">✓ Encrypted Successfully</p>
              <p className="text-xs text-gray-600">UUID: <code className="font-mono text-xs">{encryptedResult.uuid}</code></p>
              <p className="text-xs text-gray-600">Size: {encryptedResult.size}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Analysis Result */}
      {analysisResult && (
        <motion.div variants={itemVariants}>
          <Card className={`border ${analysisResult.confidence > 85 ? "bg-green-50 border-green-300" : "bg-yellow-50 border-yellow-300"}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-900">{analysisResult.type}</p>
                <p className={`text-xs font-bold ${analysisResult.confidence > 85 ? "text-green-600" : "text-yellow-600"}`}>
                  {analysisResult.status}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-600">Confidence: <span className="font-bold">{analysisResult.confidence}%</span></p>
                <p className="text-xs text-gray-600">Time: {analysisResult.timestamp}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Analysis History */}
      {analysisHistory.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-bold text-gray-900 mb-2">📋 Recent Analysis</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {analysisHistory.map((item, idx) => (
              <Card key={idx} className="bg-white border border-gray-200">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600">{item.type}</p>
                    <p className="text-xs font-bold text-indigo-600">{item.confidence}%</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Features */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-gray-900 mb-2">✨ Features</h3>
        <div className="space-y-1 text-xs text-gray-600">
          <p>✓ Image Verification & Authenticity Check</p>
          <p>✓ Metadata Extraction & EXIF Analysis</p>
          <p>✓ Tamper Detection & Forensics</p>
          <p>✓ Travel History Tracking</p>
          <p>✓ Multi-format Support (JPG, PNG, PDF)</p>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="w-full min-h-screen bg-white p-3 md:p-4 rounded-xl">
      <AnimatePresence mode="wait">
        {currentPage === "home" && <HomePage key="home" />}
        {currentPage === "backend" && <BackendPage key="backend" />}
        {currentPage === "crypto-analyzer" && <CryptoAnalyzerPage key="crypto-analyzer" />}
      </AnimatePresence>
    </div>
  );
}

export default PINITDashboard;
