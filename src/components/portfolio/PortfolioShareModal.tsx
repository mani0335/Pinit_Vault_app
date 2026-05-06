import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Lock, Clock, Eye, Download, Shield, ChevronDown, CheckCircle, AlertCircle, Copy } from "lucide-react";
import { shareService, generateShareUrl } from "../../services/shareService";

interface PortfolioShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  portfolioName: string;
  portfolio?: any; // Portfolio data for validation
}

interface ShareConfig {
  shareTitle: string;
  shareDescription: string;
  accessType: 'public' | 'private' | 'one-time' | 'temporary' | 'fingerprint';
  expiryHours: number;
  password: string;
  passwordEnabled: boolean;
  otpEnabled: boolean;
  watermarkEnabled: boolean;
  allowDownload: boolean;
}

export default function PortfolioShareModal({ 
  isOpen, 
  onClose, 
  portfolioId, 
  portfolioName,
  portfolio 
}: PortfolioShareModalProps) {
  console.log("=== SHARE MODAL OPENED ===");
  console.log("📁 Portfolio ID:", portfolioId);
  console.log("📊 Portfolio Name:", portfolioName);
  console.log("📋 Portfolio Data:", portfolio);

  // Helper function to check if portfolio has any shareable content
  const hasShareableContent = (portfolio: any): { hasContent: boolean; contentCounts: any; reason: string } => {
    if (!portfolio) {
      return { hasContent: false, contentCounts: {}, reason: 'No portfolio data available' };
    }

    const contentCounts = {
      documents: 0,
      profile: 0,
      projects: 0,
      education: 0,
      certifications: 0,
      skills: 0,
      resume: 0,
      vaultAttachments: 0,
      experience: 0,
      achievements: 0
    };

    // Check documents (uploaded files)
    if (portfolio.documents && Array.isArray(portfolio.documents)) {
      contentCounts.documents = portfolio.documents.length;
    }

    // Check profile info
    if (portfolio.profile && typeof portfolio.profile === 'object') {
      const hasProfileData = Object.keys(portfolio.profile).some(key => {
        const value = portfolio.profile[key];
        return value && (typeof value === 'string' ? value.trim() !== '' : true);
      });
      contentCounts.profile = hasProfileData ? 1 : 0;
    }

    // Check projects
    if (portfolio.projects && Array.isArray(portfolio.projects)) {
      contentCounts.projects = portfolio.projects.length;
    }

    // Check education
    if (portfolio.education && Array.isArray(portfolio.education)) {
      contentCounts.education = portfolio.education.length;
    }

    // Check certifications
    if (portfolio.certifications && Array.isArray(portfolio.certifications)) {
      contentCounts.certifications = portfolio.certifications.length;
    }

    // Check skills
    if (portfolio.skills) {
      if (Array.isArray(portfolio.skills)) {
        contentCounts.skills = portfolio.skills.length;
      } else if (typeof portfolio.skills === 'object' && portfolio.skills.items) {
        contentCounts.skills = portfolio.skills.items.length;
      }
    }

    // Check resume
    if (portfolio.resume) {
      if (typeof portfolio.resume === 'string' && portfolio.resume.trim() !== '') {
        contentCounts.resume = 1;
      } else if (typeof portfolio.resume === 'object' && portfolio.resume.url) {
        contentCounts.resume = 1;
      }
    }

    // Check vault attachments
    if (portfolio.vaultDocuments && Array.isArray(portfolio.vaultDocuments)) {
      contentCounts.vaultAttachments = portfolio.vaultDocuments.length;
    }

    // Check experience
    if (portfolio.experience && Array.isArray(portfolio.experience)) {
      contentCounts.experience = portfolio.experience.length;
    }

    // Check achievements
    if (portfolio.achievements && Array.isArray(portfolio.achievements)) {
      contentCounts.achievements = portfolio.achievements.length;
    }

    // Calculate total content items
    const totalContent = Object.values(contentCounts).reduce((sum, count) => sum + count, 0);
    const hasContent = totalContent > 0;

    // Generate reason for validation result
    let reason = hasContent 
      ? `Portfolio has ${totalContent} shareable items` 
      : 'Portfolio has no shareable content';

    if (!hasContent) {
      const emptySections = Object.entries(contentCounts)
        .filter(([_, count]) => count === 0)
        .map(([section]) => section);
      reason += ` (empty sections: ${emptySections.join(', ')})`;
    }

    return { hasContent, contentCounts, reason };
  };
  
  const [shareConfig, setShareConfig] = useState<ShareConfig>({
    shareTitle: `${portfolioName} Portfolio`,
    shareDescription: `Check out my ${portfolioName} portfolio`,
    accessType: 'public',
    expiryHours: 24,
    password: '',
    passwordEnabled: false,
    otpEnabled: false,
    watermarkEnabled: false,
    allowDownload: true
  });

  const [showAccessDropdown, setShowAccessDropdown] = useState(false);
  const [showExpiryDropdown, setShowExpiryDropdown] = useState(false);
  
  // Share creation state
  const [isCreating, setIsCreating] = useState(false);
  const [createdShare, setCreatedShare] = useState<any>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const accessTypes = [
    { value: 'public', label: 'Public', icon: Share2 },
    { value: 'private', label: 'Private', icon: Lock },
    { value: 'one-time', label: 'One-time Access', icon: Eye },
    { value: 'temporary', label: 'Temporary', icon: Clock },
    { value: 'fingerprint', label: 'Fingerprint', icon: Shield }
  ];

  const expiryOptions = [
    { value: 1, label: '1 hour' },
    { value: 6, label: '6 hours' },
    { value: 24, label: '24 hours' },
    { value: 72, label: '3 days' },
    { value: 168, label: '1 week' },
    { value: 720, label: '30 days' },
    { value: 0, label: 'Never' }
  ];

  const selectedAccessType = accessTypes.find(type => type.value === shareConfig.accessType);
  const selectedExpiry = expiryOptions.find(option => option.value === shareConfig.expiryHours);

  const handleCreateShare = async () => {
    console.log("=== START SHARE GENERATION ===");
    setIsCreating(true);
    setError(null);
    
    // Validate portfolio has content before sharing
    if (portfolio) {
      // Print FULL portfolio object structure for debugging
      console.log("🔍 FULL PORTFOLIO STRUCTURE:", JSON.stringify(portfolio, null, 2));
      
      // Use comprehensive validation
      const validation = hasShareableContent(portfolio);
      
      console.log("📊 Comprehensive Portfolio Validation:", {
        hasContent: validation.hasContent,
        contentCounts: validation.contentCounts,
        reason: validation.reason,
        totalItems: Object.values(validation.contentCounts).reduce((sum, count) => sum + count, 0)
      });
      
      // Check if portfolio has any shareable content
      if (!validation.hasContent) {
        console.error("❌ Portfolio validation failed:", validation.reason);
        setError('Portfolio must contain at least one item (profile, document, project, education, certification, skill, resume, or vault attachment) before sharing.');
        setIsCreating(false);
        return;
      }
      
      console.log("✅ Portfolio validation passed:", validation.reason);
    } else {
      console.error("❌ No portfolio data available for validation");
      setError('No portfolio data available. Please try again.');
      setIsCreating(false);
      return;
    }
    
    // SAFETY: Force stop loading after 10 seconds
    const safetyTimeout = setTimeout(() => {
      console.error("⏰ SAFETY TIMEOUT: Stopping infinite loading");
      setIsCreating(false);
      setError('Share creation timed out. Please try again.');
    }, 10000);
    
    try {
      // Get current user ID (this should come from auth context)
      const userId = localStorage.getItem('biovault_userId') || 'anonymous';
      console.log("👤 User ID:", userId);
      
      const shareData = {
        shareTitle: shareConfig.shareTitle,
        shareDescription: shareConfig.shareDescription,
        accessType: shareConfig.accessType as any,
        expiryHours: shareConfig.expiryHours,
        password: shareConfig.passwordEnabled ? shareConfig.password : undefined,
        otpEnabled: shareConfig.otpEnabled,
        watermarkEnabled: shareConfig.watermarkEnabled,
        allowDownload: shareConfig.allowDownload,
      };
      
      console.log("=== PAYLOAD ===");
      console.log("Payload:", shareData);
      console.log("Portfolio ID:", portfolioId);

      console.log("=== MAKING API CALL ===");
      const createdShareData = await shareService.createShare(portfolioId, shareData, userId);
      console.log("=== API RESPONSE ===");
      console.log("FULL SHARE RESPONSE:", createdShareData);
      console.log("RESPONSE DATA:", createdShareData);
      
      // Use backend shareUrl directly, fallback to generated URL
      const url = createdShareData.shareUrl || generateShareUrl(createdShareData.token);
      console.log("=== URL EXTRACTION ===");
      console.log("Backend shareUrl:", createdShareData.shareUrl);
      console.log("Generated URL:", url);
      
      // Validate URL
      if (!url || url.includes("undefined")) {
        console.error("❌ Invalid share URL:", url);
        throw new Error("Invalid share URL generated");
      }
      
      console.log("✅ Share created successfully");
      console.log("✅ Token extracted:", createdShareData.token);
      console.log("✅ Valid share URL generated:", url);
      
      setCreatedShare(createdShareData);
      setShareUrl(url);
      console.log("=== UI UPDATED ===");
      console.log("UI state updated successfully");
    } catch (error) {
      console.error("=== SHARE ERROR ===");
      console.error("SHARE ERROR:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      
      // Extract real error message from backend response
      let errorMessage = 'Failed to create share link. Please try again.';
      if (error instanceof Error) {
        const errorStr = error.message;
        try {
          const errorData = JSON.parse(errorStr);
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If parsing fails, use original message
          errorMessage = errorStr;
        }
      }
      
      setError(errorMessage);
      // CRITICAL: Ensure loading stops on error
      setIsCreating(false);
    } finally {
      console.log("=== SHARE PROCESS COMPLETED ===");
      clearTimeout(safetyTimeout); // Clear safety timeout
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      // Validate URL before copying
      if (!shareUrl || shareUrl.includes('undefined')) {
        console.error('❌ Cannot copy invalid URL:', shareUrl);
        setError('Invalid share URL. Please create a new share.');
        return;
      }
      
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      console.log('✅ Share URL copied to clipboard:', shareUrl);
      
      // Show success feedback for longer
      setTimeout(() => setCopied(false), 3000);
      
      // Optional: Show toast notification
      if (typeof window !== 'undefined' && window.alert) {
        // You could replace this with a proper toast component
        console.log('✅ Share link copied successfully!');
      }
    } catch (error) {
      console.error('❌ Failed to copy link:', error);
      setError('Failed to copy link. Please try again.');
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setCreatedShare(null);
    setShareUrl('');
    setError(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-gradient-to-br from-slate-900/90 via-purple-900/80 to-slate-900/90 backdrop-blur-xl rounded-3xl border border-purple-500/30 shadow-2xl shadow-purple-500/20"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                {createdShare ? <CheckCircle className="w-5 h-5 text-white" /> : <Share2 className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {createdShare ? 'Share Link Created' : 'Share Portfolio'}
                </h2>
                <p className="text-purple-300 text-sm">{portfolioName}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white transition-all duration-200 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(90vh - 140px)', WebkitOverflowScrolling: 'touch' }}>
            <div className="p-6">
              {createdShare ? (
                // Success state with share link
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                {/* Success message */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Share Link Created!</h3>
                  <p className="text-purple-300">Your portfolio is now ready to share</p>
                </div>

                {/* Share URL */}
                <div>
                  <label className="block text-purple-300 text-sm font-medium mb-2">
                    Share Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-300 font-mono text-sm"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl transition-all duration-200"
                    >
                      {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  {copied && (
                    <p className="text-green-400 text-sm mt-2">Link copied to clipboard!</p>
                  )}
                </div>

                {/* Share details */}
                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
                  <h4 className="text-white font-medium mb-3">Share Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-400">Access Type:</span>
                      <span className="text-white capitalize">{createdShare.accessType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-400">Password Protected:</span>
                      <span className="text-white">{shareConfig.passwordEnabled ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-400">OTP Required:</span>
                      <span className="text-white">{shareConfig.otpEnabled ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-400">Watermark:</span>
                      <span className="text-white">{shareConfig.watermarkEnabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-400">Download Allowed:</span>
                      <span className="text-white">{shareConfig.allowDownload ? 'Yes' : 'No'}</span>
                    </div>
                    {createdShare.expiresAt && (
                      <div className="flex justify-between">
                        <span className="text-purple-400">Expires:</span>
                        <span className="text-white">
                          {new Date(createdShare.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {createdShare.otpEnabled && (
                  <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      <div>
                        <p className="text-yellow-300 font-medium">OTP Verification Enabled</p>
                        <p className="text-yellow-400 text-sm">
                          Recipients will need to verify their identity with an OTP code.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              // Creation form
              <div className="space-y-6">
                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                {/* Share Title */}
                <div>
                  <label className="block text-purple-300 text-sm font-medium mb-2">
                    Share Title
                  </label>
                  <input
                    type="text"
                    value={shareConfig.shareTitle}
                    onChange={(e) => setShareConfig(prev => ({ ...prev, shareTitle: e.target.value }))}
                    className="w-full px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:border-purple-400 focus:bg-purple-500/20 transition-all duration-200"
                    placeholder="Enter share title..."
                  />
                </div>

                {/* Share Description */}
                <div>
                  <label className="block text-purple-300 text-sm font-medium mb-2">
                    Share Description
                  </label>
                  <textarea
                    value={shareConfig.shareDescription}
                    onChange={(e) => setShareConfig(prev => ({ ...prev, shareDescription: e.target.value }))}
                    className="w-full px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:border-purple-400 focus:bg-purple-500/20 transition-all duration-200 resize-none"
                    placeholder="Enter share description..."
                    rows={3}
                  />
                </div>

                {/* Access Type Dropdown */}
                <div>
                  <label className="block text-purple-300 text-sm font-medium mb-2">
                    Access Type
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowAccessDropdown(!showAccessDropdown)}
                      className="w-full px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-white hover:bg-purple-500/20 transition-all duration-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {selectedAccessType && <selectedAccessType.icon className="w-4 h-4" />}
                        <span>{selectedAccessType?.label}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAccessDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showAccessDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-purple-500/30 rounded-xl overflow-hidden z-10"
                      >
                        {accessTypes.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => {
                              setShareConfig(prev => ({ ...prev, accessType: type.value as any }));
                              setShowAccessDropdown(false);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-purple-500/20 transition-colors duration-200 text-white"
                          >
                            <type.icon className="w-4 h-4" />
                            <span>{type.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Expiry Dropdown */}
                <div>
                  <label className="block text-purple-300 text-sm font-medium mb-2">
                    Expires In
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowExpiryDropdown(!showExpiryDropdown)}
                      className="w-full px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-white hover:bg-purple-500/20 transition-all duration-200 flex items-center justify-between"
                    >
                      <span>{selectedExpiry?.label}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showExpiryDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showExpiryDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-purple-500/30 rounded-xl overflow-hidden z-10"
                      >
                        {expiryOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setShareConfig(prev => ({ ...prev, expiryHours: option.value }));
                              setShowExpiryDropdown(false);
                            }}
                            className="w-full px-4 py-3 hover:bg-purple-500/20 transition-colors duration-200 text-white"
                          >
                            {option.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Password Toggle & Input */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-purple-300 text-sm font-medium">
                      Password Protection
                    </label>
                    <button
                      onClick={() => setShareConfig(prev => ({ ...prev, passwordEnabled: !prev.passwordEnabled }))}
                      className={`w-12 h-6 rounded-full transition-all duration-200 relative ${
                        shareConfig.passwordEnabled ? 'bg-purple-500' : 'bg-purple-500/30'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${
                          shareConfig.passwordEnabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {shareConfig.passwordEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="overflow-hidden"
                    >
                      <input
                        type="password"
                        value={shareConfig.password}
                        onChange={(e) => setShareConfig(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:border-purple-400 focus:bg-purple-500/20 transition-all duration-200"
                        placeholder="Enter password..."
                      />
                    </motion.div>
                  )}
                </div>

                {/* Toggle Options */}
                <div className="space-y-4">
                  {/* OTP Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-300 text-sm">Enable OTP Verification</span>
                    </div>
                    <button
                      onClick={() => setShareConfig(prev => ({ ...prev, otpEnabled: !prev.otpEnabled }))}
                      className={`w-12 h-6 rounded-full transition-all duration-200 relative ${
                        shareConfig.otpEnabled ? 'bg-purple-500' : 'bg-purple-500/30'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${
                          shareConfig.otpEnabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Watermark Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Eye className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-300 text-sm">Add Watermark</span>
                    </div>
                    <button
                      onClick={() => setShareConfig(prev => ({ ...prev, watermarkEnabled: !prev.watermarkEnabled }))}
                      className={`w-12 h-6 rounded-full transition-all duration-200 relative ${
                        shareConfig.watermarkEnabled ? 'bg-purple-500' : 'bg-purple-500/30'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${
                          shareConfig.watermarkEnabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Allow Download Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Download className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-300 text-sm">Allow Download</span>
                    </div>
                    <button
                      onClick={() => setShareConfig(prev => ({ ...prev, allowDownload: !prev.allowDownload }))}
                      className={`w-12 h-6 rounded-full transition-all duration-200 relative ${
                        shareConfig.allowDownload ? 'bg-purple-500' : 'bg-purple-500/30'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${
                          shareConfig.allowDownload ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-purple-500/20">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white rounded-xl transition-all duration-200"
            >
              {createdShare ? 'Close' : 'Cancel'}
            </button>
            {!createdShare && (
              <button
                onClick={handleCreateShare}
                disabled={isCreating}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Share Link'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
