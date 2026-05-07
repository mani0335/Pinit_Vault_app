import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, 
  Eye, 
  Shield, 
  Download, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  X,
  Share2,
  FileText,
  Award,
  BookOpen,
  Briefcase,
  User
} from "lucide-react";
import { shareService, getClientIP } from "../services/shareService";
import { SharedPortfolioLink } from "../services/shareService";
import DocumentViewer from "../components/shared/DocumentViewer";
import DocumentViewerModal from "../components/portfolio/DocumentViewerModal";
import { getVaultDocuments, VaultDocument } from "../lib/vaultService";
import { Preferences } from "@capacitor/preferences";

export default function SharedPortfolioPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<SharedPortfolioLink | null>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [vaultDocuments, setVaultDocuments] = useState<VaultDocument[]>([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  
  // Security states
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  
  // Watermark state
  const [watermarkText, setWatermarkText] = useState("");

  useEffect(() => {
    console.log("🔗 SHARED PORTFOLIO PAGE LOADED");
    console.log("🎯 Token from URL:", token);
    
    if (!token) {
      console.error("❌ No token found in URL");
      setError("Invalid share link");
      setLoading(false);
      return;
    }

    // Validate token format
    if (token === 'undefined' || token.includes('undefined')) {
      console.error("❌ Invalid token format:", token);
      setError("Invalid share link");
      setLoading(false);
      return;
    }

    console.log("✅ Token validated, loading portfolio...");
    loadSharedPortfolio();
    loadVaultDocuments();
  }, [token]);

  const handleViewDocument = (vaultDoc: VaultDocument) => {
    console.log("👁️ Opening document viewer for:", vaultDoc);
    
    // Detect file type from filename
    const filename = vaultDoc.metadata.original_name || vaultDoc.name;
    const extension = filename?.split('.').pop()?.toLowerCase();
    let mimeType = 'application/octet-stream';
    
    if (extension) {
      const typeMap: { [key: string]: string } = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg', 
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain'
      };
      mimeType = typeMap[extension] || 'application/octet-stream';
    }
    
    // Convert VaultDocument to PortfolioDocument format for DocumentViewerModal
    const portfolioDoc = {
      id: vaultDoc.id,
      name: filename,
      type: mimeType,
      size: vaultDoc.metadata.size,
      file_url: vaultDoc.cloudinaryUrl || '', // Use cloudinaryUrl if available
      uploaded_at: new Date(vaultDoc.metadata.timestamp).toISOString(),
      user_id: vaultDoc.metadata.ownerId || ''
    };
    setSelectedDocument(portfolioDoc);
    setShowDocumentModal(true);
  };

  const handleDownloadDocument = async (vaultDoc: VaultDocument) => {
    if (!shareData?.allowDownload) {
      console.log("🚫 Download not allowed for this share");
      return;
    }

    try {
      console.log("📥 Downloading document:", vaultDoc.name);
      
      // Create download link
      const link = window.document.createElement("a");
      link.href = vaultDoc.cloudinaryUrl || '';
      link.download = vaultDoc.metadata.original_name || vaultDoc.name;
      link.target = "_blank";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      console.log("✅ Document download started");
    } catch (error) {
      console.error("❌ Document download failed:", error);
      setError("Document download failed");
    }
  };

  const loadVaultDocuments = async () => {
    try {
      const { value: userId } = await Preferences.get({ key: "biovault_userId" });
      if (userId) {
        const docs = await getVaultDocuments(userId);
        setVaultDocuments(docs);
      }
    } catch (error) {
      console.error("Failed to load vault documents:", error);
    }
  };

  const handleDownloadPortfolio = async () => {
    if (!shareData?.allowDownload) {
      setError("Download not allowed for this portfolio");
      return;
    }

    try {
      console.log("📥 Starting portfolio download...");
      
      // Create a downloadable package with all documents
      const downloadData = {
        portfolio: portfolio,
        share: shareData,
        documents: portfolio.documents,
        downloadedAt: new Date().toISOString()
      };

      // Convert to JSON and create download
      const jsonString = JSON.stringify(downloadData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${portfolio.name || "portfolio"}_${shareData.token}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("✅ Portfolio download completed");
    } catch (error) {
      console.error("❌ Portfolio download failed:", error);
      setError("Failed to download portfolio");
    }
  };

  const loadSharedPortfolio = async () => {
    try {
      console.log("🔄 Loading shared portfolio for token:", token);
      setLoading(true);
      
      // Get client info for watermark
      const clientIP = await getClientIP();
      const userAgent = navigator.userAgent;
      const timestamp = new Date().toLocaleString();
      setWatermarkText(`Accessed from ${clientIP} at ${timestamp}`);
      
      console.log("🌐 Client info:", { clientIP, userAgent });

      // Get share data
      console.log("📡 Fetching share data...");
      const share = await shareService.getShareByToken(token!);
      
      console.log("📥 Share data response:", share);
      
      if (!share) {
        console.error("❌ Share not found or expired for token:", token);
        setError("Share not found or expired");
        setLoading(false);
        return;
      }

      console.log("✅ Share data loaded:", share);
      setShareData(share);

      // Check security requirements using new response format
      const hasPasswordRequired = share.passwordRequired;
      const hasOtpRequired = share.otpEnabled;
      const accessType = share.accessType;
      
      console.log(`🔍 Access type: ${accessType}`);
      console.log(`🔍 Password required: ${hasPasswordRequired}`);
      console.log(`🔍 OTP required: ${hasOtpRequired}`);
      
      // Handle different access types
      if (accessType === 'public') {
        // Public links should open immediately
        console.log("🌐 Public access - showing portfolio immediately");
        setPasswordRequired(false);
        setOtpRequired(false);
        setPortfolio(share.portfolio || null);
        console.log("📊 Portfolio data set (public):", share.portfolio);
        
        // Log access
        console.log("� Logging access (public)...");
        await shareService.logAccess(token!, clientIP, userAgent);
        console.log("✅ Access logged successfully (public)");
        console.log("✅ Shared portfolio fetched (public)");
        console.log("✅ Documents rendered (public)");
        
      } else if (accessType === 'password-protected' && hasPasswordRequired) {
        // Password-protected links should only request password
        console.log("� Password-protected access - requesting password");
        setPasswordRequired(true);
        setOtpRequired(false);
        setPortfolio(null); // Clear portfolio until verified
        
      } else if (accessType === 'one-time') {
        // One-time access should allow valid access once
        console.log("🎟️ One-time access - checking if already accessed");
        if (share.views > 0) {
          console.error("❌ One-time link already accessed");
          setError("This one-time share has already been accessed");
          return;
        }
        setPasswordRequired(false);
        setOtpRequired(false);
        console.log("📄 Loading shared portfolio:", share);
        console.log("📄 Share data:", share);
        console.log("📄 Portfolio data:", share.portfolio);
        console.log("📄 Portfolio documents count:", share.portfolio?.documents?.length || 0);
        console.log("📄 Portfolio documents structure:", JSON.stringify(share.portfolio?.documents, null, 2));
        setPortfolio(share.portfolio || null);
        console.log("📊 Portfolio data set (one-time):", share.portfolio);
        
        // Log access
        console.log("📝 Logging access (one-time)...");
        await shareService.logAccess(token!, clientIP, userAgent);
        console.log("✅ Access logged successfully (one-time)");
        console.log("✅ Shared portfolio fetched (one-time)");
        console.log("✅ Documents rendered (one-time)");
        
      } else {
        // Default handling for other cases
        console.log("🔓 Default access - showing portfolio directly");
        setPasswordRequired(hasPasswordRequired || false);
        setOtpRequired(hasOtpRequired || false);
        
        if (!hasPasswordRequired && !hasOtpRequired) {
          setPortfolio(share.portfolio || null);
          console.log("📊 Portfolio data set (default):", share.portfolio);
          
          // Log access
          console.log("📝 Logging access (default)...");
          await shareService.logAccess(token!, clientIP, userAgent);
          console.log("✅ Access logged successfully (default)");
          console.log("✅ Shared portfolio fetched (default)");
          console.log("✅ Documents rendered (default)");
        }
      }

    } catch (error) {
      console.error("❌ Error loading shared portfolio:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        token: token
      });
      setError("Failed to load portfolio");
    } finally {
      setLoading(false);
      console.log("✅ Shared portfolio page loaded successfully");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !token) return;

    console.log(`🔐 Frontend password submit: token=${token}, password=${'*'.repeat(password.length)}`);
    setVerifying(true);
    setError(null);
    
    try {
      const verified = await shareService.verifyPassword(token, password);
      
      console.log(`🔐 Frontend password verification result: ${verified}`);
      
      if (verified) {
        console.log(`✅ Password verified successfully - setting isAuthorized=true`);
        setPasswordRequired(false);
        
        // Reload portfolio data with fresh state
        console.log(`🔄 Reloading portfolio after successful verification`);
        await loadSharedPortfolio();
        
        console.log(`✅ Shared portfolio fetched`);
        console.log(`✅ Documents rendered`);
      } else {
        console.log(`❌ Password verification failed - showing error`);
        setError("Invalid password");
      }
    } catch (error) {
      console.error(`❌ Password verification error:`, error);
      setError("Password verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleOTPSend = async () => {
    if (!token) return;
    
    setVerifying(true);
    try {
      await shareService.sendOTP(token);
      setError("OTP sent to your email/phone");
    } catch (error) {
      setError("Failed to send OTP");
    } finally {
      setVerifying(false);
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !token) return;

    setVerifying(true);
    try {
      const verified = await shareService.verifyOTP(token, otpCode);
      
      if (verified) {
        setOtpRequired(false);
        // Reload portfolio data
        await loadSharedPortfolio();
      } else {
        setError("Invalid OTP code");
      }
    } catch (error) {
      setError("OTP verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleDownload = async () => {
    if (!shareData?.allowDownload) {
      setError("Download not allowed for this portfolio");
      return;
    }

    // In a real implementation, this would generate and download a PDF
    alert("Download functionality would be implemented here");
  };

  const renderSecurityGate = () => {
    if (passwordRequired) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-auto"
        >
          <div className="bg-gradient-to-br from-slate-900/90 via-purple-900/80 to-slate-900/90 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Password Protected</h2>
              <p className="text-purple-300">This portfolio requires a password to access</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:border-purple-400 focus:bg-purple-500/20 transition-all"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
              >
                {verifying ? "Verifying..." : "Access Portfolio"}
              </button>
            </form>
          </div>
        </motion.div>
      );
    }

    if (otpRequired) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-auto"
        >
          <div className="bg-gradient-to-br from-slate-900/90 via-purple-900/80 to-slate-900/90 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">OTP Verification</h2>
              <p className="text-purple-300">Enter the 6-digit code sent to your email/phone</p>
            </div>

            <form onSubmit={handleOTPVerify} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:border-purple-400 focus:bg-purple-500/20 transition-all text-center text-2xl font-mono"
                  maxLength={6}
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleOTPSend}
                  disabled={verifying}
                  className="flex-1 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl font-medium transition-all duration-200"
                >
                  Resend OTP
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {verifying ? "Verifying..." : "Verify"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      );
    }

    return null;
  };

  const renderPortfolio = () => {
    if (!portfolio) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header with share info */}
        <div className="bg-gradient-to-br from-slate-900/90 via-purple-900/80 to-slate-900/90 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 mb-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {shareData?.shareTitle || portfolio.title || 'Shared Portfolio'}
              </h1>
              <p className="text-purple-300">
                {shareData?.shareDescription || 'Check out this portfolio'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-purple-400 text-sm">Shared via PINIT Vault</p>
                <p className="text-purple-500 text-xs">
                  {shareData?.views || 0} views • {shareData?.accessType || 'public'} access
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Share2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Security indicators */}
          <div className="flex flex-wrap gap-3">
            {shareData?.watermarkEnabled && (
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full text-purple-300 text-sm">
                <Eye className="w-4 h-4" />
                Watermark Protected
              </div>
            )}
            {shareData?.allowDownload && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full text-green-300 text-sm">
                <Download className="w-4 h-4" />
                Download Allowed
              </div>
            )}
            {shareData?.expiresAt && (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 rounded-full text-orange-300 text-sm">
                <Clock className="w-4 h-4" />
                Expires {new Date(shareData.expiresAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Portfolio content with watermark */}
        <div className="relative">
          {shareData?.watermarkEnabled && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              <div className="text-purple-500/20 text-6xl font-bold rotate-45 select-none transform scale-150">
                {watermarkText}
              </div>
            </div>
          )}

          {/* Portfolio sections */}
          <div className="space-y-6">
            {/* Personal Info Section */}
            {portfolio.profile && (
              <div className="bg-gradient-to-br from-slate-900/90 via-purple-900/80 to-slate-900/90 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 shadow-xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Personal Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-purple-400 text-sm">Name</p>
                    <p className="text-white">{portfolio.profile.name}</p>
                  </div>
                  <div>
                    <p className="text-purple-400 text-sm">Role</p>
                    <p className="text-white">{portfolio.profile.role}</p>
                  </div>
                  <div>
                    <p className="text-purple-400 text-sm">Email</p>
                    <p className="text-white">{portfolio.profile.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Education Section */}
            {portfolio.education && portfolio.education.length > 0 && (
              <div className="bg-gradient-to-br from-slate-900/90 via-purple-900/80 to-slate-900/90 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 shadow-xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Education</h2>
                </div>
                <div className="space-y-4">
                  {portfolio.education.map((edu: any, index: number) => (
                    <div key={index} className="border-l-4 border-purple-500/50 pl-4">
                      <h3 className="text-white font-semibold">{edu.degree}</h3>
                      <p className="text-purple-300">{edu.institution}</p>
                      <p className="text-purple-400 text-sm">{edu.year}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects Section */}
            {portfolio.projects && portfolio.projects.length > 0 && (
              <div className="bg-gradient-to-br from-slate-900/90 via-purple-900/80 to-slate-900/90 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 shadow-xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Projects</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {portfolio.projects.map((project: any, index: number) => (
                    <div key={index} className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
                      <h3 className="text-white font-semibold mb-2">{project.name}</h3>
                      <p className="text-purple-300 text-sm">{project.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Section */}
            {portfolio.documents && portfolio.documents.length > 0 && (
              <div className="bg-gradient-to-br from-slate-900/90 via-purple-900/80 to-slate-900/90 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Documents</h2>
                    <p className="text-purple-300 text-sm">
                      {portfolio.documents.length} file{portfolio.documents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {portfolio.documents.map((docId, index) => {
                    const vaultDoc = vaultDocuments.find(doc => doc.id === docId);
                    console.log(`📄 Processing document ${index + 1}:`, { docId, vaultDoc });
                    
                    return (
                      <div key={docId} className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-purple-400" />
                            <div>
                              <h3 className="text-white font-medium">
                                {vaultDoc ? vaultDoc.name : `Document ${index + 1}`}
                              </h3>
                              <p className="text-purple-300 text-sm">
                                {vaultDoc ? vaultDoc.metadata.original_name : `Document ID: ${docId}`}
                              </p>
                              {vaultDoc && (
                                <p className="text-purple-400 text-xs">
                                  Size: {Math.round(vaultDoc.metadata.size / 1024)} KB • 
                                  {new Date(vaultDoc.metadata.timestamp).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {vaultDoc && (
                              <button
                                onClick={() => handleViewDocument(vaultDoc)}
                                className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors text-sm font-medium"
                              >
                                View
                              </button>
                            )}
                            
                            {shareData?.allowDownload && vaultDoc && (
                              <button
                                onClick={() => handleDownloadDocument(vaultDoc)}
                                className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
                                title="Download document"
                              >
                                <Download className="w-4 h-4 text-purple-300" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Download button if allowed */}
        {shareData?.allowDownload && (
          <div className="mt-8 text-center">
            <button
              onClick={handleDownloadPortfolio}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg"
            >
              <Download className="w-5 h-5 inline mr-2" />
              Download Portfolio
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full"
        />
      </div>
    );
  }

  if (error && !passwordRequired && !otpRequired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-auto p-8"
        >
          <div className="bg-gradient-to-br from-red-900/90 to-slate-900/90 backdrop-blur-xl rounded-3xl border border-red-500/30 p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-red-300 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-colors"
            >
              Go to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="container mx-auto px-4 py-8">
          {/* Error messages */}
          {error && (
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            </div>
          )}

          {/* Security gates or portfolio content */}
          {(passwordRequired || otpRequired) ? renderSecurityGate() : renderPortfolio()}
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={showDocumentModal}
        onClose={() => {
          setShowDocumentModal(false);
          setSelectedDocument(null);
        }}
        fileDocument={selectedDocument}
        allowDownload={shareData?.allowDownload || false}
        watermarkEnabled={shareData?.watermarkEnabled || false}
        watermarkText={`PINIT Vault Protected • ${shareData?.shareTitle || 'Shared Portfolio'}`}
      />
    </>
  );
}
