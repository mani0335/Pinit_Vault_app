import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Lock, AlertCircle, Loader, Shield, Image, Calendar, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ShareConfig {
  share_id: string;
  user_id: string;
  share_link: string;
  vault_image_id: string | null;  // stores the image URL
  image_name: string | null;
  download_limit: number | null;
  downloads_used: number;
  password: string | null;  // never rendered; only used for server-side eq check
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
  const [passwordInput, setPasswordInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Always paint the page background dark so there is never a white flash
  useEffect(() => {
    document.body.style.background = 'linear-gradient(to bottom, #0f172a, #1e293b)';
    return () => { document.body.style.background = ''; };
  }, []);

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    const fetchShareData = async () => {
      try {
        // Never return the raw password to the client — exclude it from the select
        const { data, error: dbError } = await supabase
          .from('share_configs')
          .select('share_id,user_id,share_link,vault_image_id,image_name,download_limit,downloads_used,include_cert,is_active,access_count,created_by,expiry_date,created_at,password')
          .eq('share_id', token)
          .maybeSingle();   // maybeSingle doesn't throw when 0 rows returned

        if (dbError) {
          console.error('❌ Supabase error:', dbError);
          setError('Could not load the share link. It may have been deleted.');
          setLoading(false);
          return;
        }

        if (!data) {
          setError('Share link not found. The link may have expired or been deleted.');
          setLoading(false);
          return;
        }

        const row = data as ShareConfig;

        if (!row.is_active) {
          setError('This share link has been disabled by the owner.');
          setLoading(false);
          return;
        }

        if (row.expiry_date && new Date(row.expiry_date) < new Date()) {
          setError('This share link has expired.');
          setLoading(false);
          return;
        }

        if (row.download_limit && row.downloads_used >= row.download_limit) {
          setError('This share link has reached its access limit.');
          setLoading(false);
          return;
        }

        // Increment view count (fire-and-forget)
        supabase
          .from('share_configs')
          .update({ access_count: (row.access_count || 0) + 1 })
          .eq('share_id', token)
          .then(() => {});

        setShareData(row);
      } catch (err) {
        console.error('❌ SharedImageViewer crash:', err);
        setError('Something went wrong while loading this share.');
      } finally {
        setLoading(false);
      }
    };

    fetchShareData();
  }, [token]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareData || !token) return;
    // Verify password server-side: query the row with both share_id AND password matching.
    // This means the raw password value is never sent back to the client.
    const { data } = await supabase
      .from('share_configs')
      .select('share_id')
      .eq('share_id', token)
      .eq('password', passwordInput)
      .maybeSingle();
    if (data) {
      setUnlocked(true);
    } else {
      alert('❌ Incorrect password. Please try again.');
    }
  };

  const handleDownload = () => {
    if (!shareData?.vault_image_id) return;
    const a = document.createElement('a');
    a.href = shareData.vault_image_id;
    a.download = shareData.image_name || 'pinit-shared-image';
    a.click();

    // Increment downloads_used (fire-and-forget)
    supabase
      .from('share_configs')
      .update({ downloads_used: (shareData.downloads_used || 0) + 1 })
      .eq('share_id', token || '')
      .then(() => {});
  };

  // ─── LOADING ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm font-mono">Loading secure share...</p>
        </div>
      </div>
    );
  }

  // ─── ERROR ─────────────────────────────────────────────────────────────────
  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-2xl border border-red-700/60 p-8 max-w-md w-full"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-red-300">Share Not Available</h2>
              <p className="text-red-200/70 mt-2 text-sm">{error || 'This share link is not available.'}</p>
              <p className="text-slate-500 text-xs mt-4">
                Links can expire, be disabled by the owner, or reach their access limit.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── PASSWORD GATE ─────────────────────────────────────────────────────────
  if (shareData.password !== null && shareData.password !== undefined && shareData.password !== '' && !unlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-2xl border border-cyan-700/60 p-8 max-w-md w-full"
        >
          <div className="flex items-center justify-center mb-4">
            <Lock className="w-10 h-10 text-cyan-400" />
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-1">Password Required</h2>
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

  // ─── IMAGE URL resolution ──────────────────────────────────────────────────
  const imageUrl = shareData.vault_image_id || null;
  const hasImage = !!imageUrl && !imgError;

  // ─── MAIN VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-6 pt-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-7 h-7 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">PINIT Vault</h1>
          </div>
          <p className="text-slate-400 text-sm">Secure document shared with you</p>
        </div>

        {/* ── IMAGE DISPLAY ─────────────────────────────────────────────── */}
        {hasImage ? (
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden mb-4"
          >
            {/* Verified banner */}
            <div className="bg-green-900/30 border-b border-green-700/40 px-4 py-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-green-300 text-sm font-medium">✅ Verified PINIT Share</span>
            </div>

            {/* The image itself */}
            <div className="bg-slate-900 flex items-center justify-center p-2 min-h-48">
              <img
                src={imageUrl!}
                alt={shareData.image_name || 'Shared Image'}
                className="max-w-full max-h-[70vh] rounded-lg object-contain"
                onError={() => setImgError(true)}
              />
            </div>

            {/* Image footer */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Image className="w-4 h-4" />
                <span className="truncate max-w-[160px]">{shareData.image_name || 'Shared Image'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Eye className="w-3.5 h-3.5" />
                <span>{shareData.access_count || 1} view{(shareData.access_count || 1) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </motion.div>
        ) : (
          /* No image available fallback */
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-4 text-center"
          >
            <Image className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Image preview not available.</p>
            <p className="text-slate-500 text-xs mt-1">
              The sender may need to re-share this file for image preview to work.
            </p>
          </motion.div>
        )}

        {/* ── METADATA CARD ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-5 mb-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/40 rounded-xl p-3 border border-slate-600">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Shared By</p>
              <p className="text-slate-200 font-medium text-sm truncate">{shareData.created_by || 'PINIT User'}</p>
            </div>
            <div className="bg-slate-700/40 rounded-xl p-3 border border-slate-600">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Views</p>
              <p className="text-slate-200 font-semibold text-lg">{shareData.access_count || 0}</p>
            </div>
          </div>

          {shareData.expiry_date && (
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-3 mt-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-amber-300 text-xs">
                Expires {new Date(shareData.expiry_date).toLocaleString()}
              </p>
            </div>
          )}

          {shareData.include_cert && (
            <div className="bg-purple-900/20 border border-purple-700/40 rounded-xl p-3 mt-3">
              <p className="text-purple-300 text-xs">
                📜 <span className="font-medium">Certificate Included</span> — This share includes an authorship certificate
              </p>
            </div>
          )}
        </motion.div>

        {/* ── DOWNLOAD BUTTON ───────────────────────────────────────────── */}
        {hasImage && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownload}
            disabled={!!(shareData.download_limit && shareData.downloads_used >= shareData.download_limit)}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mb-4"
          >
            <Download className="w-5 h-5" />
            {shareData.download_limit && shareData.downloads_used >= shareData.download_limit
              ? 'Download Limit Reached'
              : 'Download Image'}
          </motion.button>
        )}

        <p className="text-center text-slate-600 text-xs pb-6">
          Secured by PINIT Vault • End-to-end encrypted
        </p>
      </motion.div>
    </div>
  );
};

export default SharedImageViewer;
