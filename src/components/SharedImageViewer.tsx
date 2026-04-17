import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Lock, AlertCircle, Loader } from 'lucide-react';

export const SharedImageViewer: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [shareData, setShareData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    const fetchShareData = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
        
        console.log("📥 SharedImageViewer: Fetching share data for token:", token);
        
        const response = await fetch(`${backendUrl}/share/public/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Share link not found');
          } else if (response.status === 410) {
            const errorData = await response.json();
            setError(errorData.detail || 'This share has expired or been disabled');
          } else {
            setError('Failed to fetch share data');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        
        if (data.includes_password) {
          setPasswordProtected(true);
        } else {
          setShareData(data);
        }
        
        console.log("✅ SharedImageViewer: Share data fetched successfully");
      } catch (err) {
        console.error("❌ SharedImageViewer: Error fetching share:", err);
        setError('An error occurred while loading the share');
      } finally {
        setLoading(false);
      }
    };

    fetchShareData();
  }, [token]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordInput.trim()) {
      alert('Please enter the password');
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
      
      const response = await fetch(`${backendUrl}/share/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          share_id: token,
          password: passwordInput,
        }),
      });

      const data = await response.json();
      
      if (data.verified) {
        setPasswordProtected(false);
        // Re-fetch share data
        const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
        const shareResponse = await fetch(`${backendUrl}/share/public/${token}`);
        const shareData = await shareResponse.json();
        setShareData(shareData);
        alert('✅ Password verified!');
      } else {
        alert('❌ Incorrect password');
      }
    } catch (err) {
      console.error('Password verification error:', err);
      alert('Error verifying password');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (passwordProtected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-2xl border border-blue-500 p-8 max-w-md w-full"
        >
          <div className="flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-lg font-bold text-white text-center mb-2">Password Required</h2>
          <p className="text-slate-400 text-center mb-6">This share is password protected</p>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Enter password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-all"
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

  const handleDownload = () => {
    alert('📥 Download feature will be available soon. Share link is valid and active!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🔗 Shared Image</h1>
          <p className="text-slate-400">Encrypted asset shared securely with you</p>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-8 overflow-hidden"
        >
          {/* Owner Info */}
          <div className="bg-slate-700/50 rounded-lg p-4 mb-6 border border-slate-600">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-300 font-medium">✅ Share Verified</p>
                <p className="text-slate-400 text-sm mt-1">
                  Shared on {shareData.created_at ? new Date(shareData.created_at).toLocaleDateString() : 'Unknown date'}
                </p>
              </div>
            </div>
          </div>

          {/* Share Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Shared By</p>
              <p className="text-slate-200 font-medium truncate">{shareData.created_by || 'Anonymous'}</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Share ID</p>
              <p className="text-slate-200 font-mono text-sm truncate">{shareData.share_id}</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Access Count</p>
              <p className="text-slate-200 font-medium">{shareData.access_count || 0}</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Downloads</p>
              <p className="text-slate-200 font-medium">
                {shareData.downloads_used || 0}
                {shareData.download_limit ? ` / ${shareData.download_limit}` : ''}
              </p>
            </div>
          </div>

          {/* Image Display */}
          {shareData.cloudinary_url && shareData.image_data && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-600">
                <img
                  src={shareData.cloudinary_url}
                  alt={shareData.image_data.file_name || 'Shared image'}
                  className="w-full h-auto object-cover max-h-96"
                  onError={(e) => {
                    console.error('❌ Image failed to load:', shareData.cloudinary_url);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              
              {/* Image Metadata */}
              {shareData.image_data && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">📸 File Name</p>
                    <p className="text-slate-200 text-sm font-medium truncate">{shareData.image_data.file_name || 'Unknown'}</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">📦 File Size</p>
                    <p className="text-slate-200 text-sm font-medium">{shareData.image_data.file_size || 'Unknown'}</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">🎯 Resolution</p>
                    <p className="text-slate-200 text-sm font-medium">{shareData.image_data.resolution || 'Unknown'}</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">⏰ Captured</p>
                    <p className="text-slate-200 text-sm font-medium">
                      {shareData.image_data.capture_timestamp ? new Date(shareData.image_data.capture_timestamp).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Features */}
          {shareData.include_cert && (
            <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-3 mb-6">
              <p className="text-amber-300 text-sm">
                <span className="font-medium">📜 Certificate Included:</span> This share includes authorship certificate
              </p>
            </div>
          )}

          {/* Download Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownload}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Image
          </motion.button>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8 text-slate-400 text-sm"
        >
          <p>
            ✅ This share is <span className="text-green-400 font-semibold">ACTIVE</span> and accessible
          </p>
          <p className="mt-2">The image contains embedded metadata for authenticity verification.</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SharedImageViewer;
