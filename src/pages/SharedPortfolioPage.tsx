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

export default function SharedPortfolioPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<SharedPortfolioLink | null>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  
  // Security states
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  
  // Watermark state
  const [watermarkText, setWatermarkText] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid share link");
      setLoading(false);
      return;
    }

    loadSharedPortfolio();
  }, [token]);

  const loadSharedPortfolio = async () => {
    try {
      setLoading(true);
      
      // Get client info for watermark
      const clientIP = await getClientIP();
      const userAgent = navigator.userAgent;
      const timestamp = new Date().toLocaleString();
      setWatermarkText(`Accessed from ${clientIP} at ${timestamp}`);

      // Get share data
      const share = await shareService.getShareByToken(token!);
      
      if (!share) {
        setError("Share not found or expired");
        setLoading(false);
        return;
      }

      setShareData(share);

      // Check security requirements
      if (share.accessLog?.some((log: any) => log.action === 'password_verified')) {
        setPasswordRequired(false);
      } else if (share.securityFlags?.password_hash) {
        setPasswordRequired(true);
      }

      if (share.otpEnabled && !share.accessLog?.some((log: any) => log.action === 'otp_verified')) {
        setOtpRequired(true);
      }

      // If no security requirements, show portfolio directly
      if (!passwordRequired && !otpRequired) {
        // Portfolio data should be included in the response when no auth required
        setPortfolio(share.portfolio || null);
        // Log access
        await shareService.logAccess(token!, clientIP, userAgent);
      }

    } catch (error) {
      console.error("Error loading shared portfolio:", error);
      setError("Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !token) return;

    setVerifying(true);
    try {
      const verified = await shareService.verifyPassword(token, password);
      
      if (verified) {
        setPasswordRequired(false);
        // Reload portfolio data
        await loadSharedPortfolio();
      } else {
        setError("Invalid password");
      }
    } catch (error) {
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
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Documents</h2>
                </div>
                <div className="space-y-3">
                  {portfolio.documents.map((doc: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-purple-500/10 rounded-xl p-3 border border-purple-500/30">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-purple-400" />
                        <span className="text-white">{doc.name || `Document ${index + 1}`}</span>
                      </div>
                      {shareData?.allowDownload && (
                        <button
                          onClick={() => console.log("Download document:", doc)}
                          className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4 text-purple-300" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Download button if allowed */}
        {shareData?.allowDownload && (
          <div className="mt-8 text-center">
            <button
              onClick={handleDownload}
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
  );
}
