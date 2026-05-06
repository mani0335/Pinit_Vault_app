import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Lock, Clock, Eye, Download, Shield, ChevronDown, CheckCircle, AlertCircle, Copy } from "lucide-react";
import { shareService, generateShareUrl } from "../../services/shareService";

interface PortfolioShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  portfolioName: string;
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
  portfolioName 
}: PortfolioShareModalProps) {
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
    setIsCreating(true);
    setError(null);
    
    try {
      // Get current user ID (this should come from auth context)
      const userId = localStorage.getItem('biovault_userId') || 'anonymous';
      
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

      const createdShareData = await shareService.createShare(portfolioId, shareData, userId);
      const url = generateShareUrl(createdShareData.token);
      
      setCreatedShare(createdShareData);
      setShareUrl(url);
    } catch (error) {
      console.error('Failed to create share:', error);
      setError('Failed to create share link. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
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
