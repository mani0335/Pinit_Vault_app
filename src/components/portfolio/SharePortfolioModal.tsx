import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Clock, Shield } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  portfolioName: string;
  onGenerateLink: (expiryHours: number) => void;
}

const SharePortfolioModal: React.FC<Props> = ({ isOpen, onClose, portfolioName, onGenerateLink }) => {
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [expiryHours, setExpiryHours] = useState(24);

  const handleGenerate = () => {
    const token = btoa(`${Date.now()}:${expiryHours}`);
    const link = `${window.location.origin}/portfolio/share/${token}`;
    setShareLink(link);
    onGenerateLink(expiryHours);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Share Portfolio</h2>
              <p className="text-sm text-slate-400 mt-1">{portfolioName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Expiry Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Link Expiry
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[1, 24, 168].map((hours) => (
                <button
                  key={hours}
                  onClick={() => setExpiryHours(hours)}
                  className={`p-3 rounded-xl border transition-all ${
                    expiryHours === hours
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-medium">
                    {hours === 1 ? '1 Hour' : hours === 24 ? '1 Day' : '1 Week'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          {!shareLink && (
            <button
              onClick={handleGenerate}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
            >
              <Shield className="w-5 h-5" />
              Generate Share Link
            </button>
          )}

          {/* Share Link */}
          {shareLink && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-slate-300 outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Shield className="w-4 h-4" />
                <span>Link expires in {expiryHours === 1 ? '1 hour' : expiryHours === 24 ? '24 hours' : '1 week'}</span>
              </div>

              <button
                onClick={() => { setShareLink(''); setExpiryHours(24); }}
                className="w-full py-3 bg-slate-700/50 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-all"
              >
                Generate New Link
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SharePortfolioModal;
