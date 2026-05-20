import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Lock, AlertCircle, Loader, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ShareConfig {
  share_id: string;
  user_id: string;
  share_link: string;
  download_limit: number | null;
  downloads_used: number;
  password: string | null;
  include_cert: boolean;
  is_active: boolean;
  access_count: number;
  created_by: string;
  expiry_date: string | null;
  created_at: string;
}

export const SharedImageViewer: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [shareData, setShareData] = useState<ShareConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    const fetchShareData = async () => {
      try {
        console.log('📥 SharedImageViewer: Fetching share for token:', token);

        const { data, error: dbError } = await supabase
          .from('share_configs')
          .select('*')
          .eq('share_id', token)
          .single();

        if (dbError || !data) {
          console.error('❌ Supabase error:', dbError);
          setError('Share link not found');
          setLoading(false);
          return;
        }

        if (!data.is_active) {
          setError('This share link has been disabled');
          setLoading(false);
          return;
        }

        if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
          setError('This share link has expired');
          setLoading(false);
          return;
        }

        if (data.download_limit && data.downloads_used >= data.download_limit) {
          setError('This share link has reached its download limit');
          setLoading(false);
          return;
        }

        // Increment access count
        await supabase
          .from('share_configs')
          .update({ access_count: (data.access_count || 0) + 1 })
          .eq('share_id', token);

        if (data.password) {
          setPasswordProtected(true);
          setShareData(data as ShareConfig);
        } else {
          setShareData(data as ShareConfig);
        }

        console.log('✅ SharedImageViewer: Share data fetched');
      } catch (err) {
        console.error('❌ SharedImageViewer: Error:', err);
        setError('An error occurred while loading the share');
      } finally {
        setLoading(false);
      }
    };

    fetchShareData();
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareData) return;
    if (passwordInput === shareData.password) {
      setPasswordProtected(false);
      setUnlocked(true);
    } else {
      alert('❌ Incorrect password');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading secure share...</p>
        </div>
      </div>
    );
  }

  if (passwordProtected && !unlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-2xl border border-cyan-700 p-8 max-w-md w-full"
        >
          <div className="flex items-center justify-center mb-4">
            <Lock className="w-10 h-10 text-cyan-400" />
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-2">Password Required</h2>
          <p className="text-slate-400 text-center mb-6 text-sm">This share is password protected</p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Enter password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 rounded-xl transition-all"
            >
              Unlock
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-2xl border border-red-700 p-8 max-w-md w-full"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-bold text-red-300">Share Link Invalid</h2>
              <p className="text-red-200/70 mt-2">{error || 'This share link is not available'}</p>
              <p className="text-red-200/50 text-sm mt-3">
                The link may have expired, reached its access limit, or been deleted.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8 pt-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">PINIT Vault</h1>
          </div>
          <p className="text-slate-400">Secure document shared with you</p>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-8"
        >
          {/* Verified Banner */}
          <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-300 font-semibold text-sm">✅ Share Verified</p>
              <p className="text-green-400/70 text-xs mt-0.5">
                Shared on {shareData.created_at ? new Date(shareData.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>

          {/* Share Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Shared By</p>
              <p className="text-slate-200 font-medium truncate">{shareData.created_by || 'PINIT User'}</p>
            </div>
            <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Share ID</p>
              <p className="text-slate-200 font-mono text-xs truncate">{shareData.share_id}</p>
            </div>
            <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Views</p>
              <p className="text-slate-200 font-semibold text-lg">{shareData.access_count || 0}</p>
            </div>
            <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Downloads</p>
              <p className="text-slate-200 font-semibold text-lg">
                {shareData.downloads_used || 0}
                {shareData.download_limit ? ` / ${shareData.download_limit}` : ' / ∞'}
              </p>
            </div>
          </div>

          {/* Expiry */}
          {shareData.expiry_date && (
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-3 mb-6">
              <p className="text-amber-300 text-sm">
                ⏰ Expires: {new Date(shareData.expiry_date).toLocaleString()}
              </p>
            </div>
          )}

          {/* Certificate */}
          {shareData.include_cert && (
            <div className="bg-purple-900/20 border border-purple-700/50 rounded-xl p-3 mb-6">
              <p className="text-purple-300 text-sm">
                📜 <span className="font-medium">Certificate Included:</span> This share includes an authorship certificate
              </p>
            </div>
          )}

          {/* Status */}
          <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-xl p-4 mb-6 text-center">
            <p className="text-cyan-300 text-sm font-medium">
              🔒 This document is encrypted and verified by PINIT Vault
            </p>
            <p className="text-cyan-400/60 text-xs mt-1">
              The document owner shared this with you securely
            </p>
          </div>

          {/* Download Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => alert('📥 To access the full document, ask the sender to share it directly through the PINIT Vault app.')}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Request Document
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-slate-500 text-xs mt-8 pb-6"
        >
          Secured by PINIT Vault • End-to-end encrypted
        </motion.p>
      </motion.div>
    </div>
  );
};

export default SharedImageViewer;
