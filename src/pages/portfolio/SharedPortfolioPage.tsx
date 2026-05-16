import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Eye, Lock, Clock, AlertTriangle, Download,
  FileText, Image, X, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { getSharedPortfolio, verifySharePassword } from '../../lib/portfolioService';
import type { SharedPortfolioData } from '../../lib/portfolioService';
import type { PortfolioSection } from '../../types/Portfolio';

// ── Watermark overlay ────────────────────────────────────────────────────────
function WatermarkOverlay({ text }: { text: string }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden select-none" aria-hidden>
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 5 }).map((__, col) => (
          <div
            key={`${row}-${col}`}
            className="absolute text-white/5 text-sm font-medium whitespace-nowrap"
            style={{
              top: `${row * 14}%`,
              left: `${col * 22}%`,
              transform: 'rotate(-30deg)',
              fontSize: '11px',
            }}
          >
            {text}
          </div>
        ))
      )}
    </div>
  );
}

// ── Screenshot protection overlay ───────────────────────────────────────────
function useScreenshotProtection(enabled: boolean) {
  const [blurred, setBlurred] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setBlurred(true);
        setTimeout(() => setBlurred(false), 2000);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect PrintScreen or Cmd+Shift+3/4 (Mac screenshot)
      if (
        e.key === 'PrintScreen' ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))
      ) {
        setBlurred(true);
        setTimeout(() => setBlurred(false), 3000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);

  return blurred;
}

// ── Document card ────────────────────────────────────────────────────────────
function DocumentCard({
  docId,
  documents,
  viewOnly,
}: {
  docId: string;
  documents: Record<string, unknown>;
  viewOnly: boolean;
}) {
  const doc = documents[docId] as Record<string, unknown> | undefined;
  const [expanded, setExpanded] = useState(false);

  if (!doc) {
    return (
      <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-xl">
        <p className="text-xs text-slate-500">Document unavailable</p>
      </div>
    );
  }

  const fileName = (doc.original_name || doc.name || 'Document') as string;
  const cloudinaryUrl = doc.cloudinary_url as string | undefined;
  const isImage = cloudinaryUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(cloudinaryUrl);

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden hover:border-slate-600/60 transition-colors">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-slate-700/50">
            {isImage ? <Image className="w-3.5 h-3.5 text-blue-400" /> : <FileText className="w-3.5 h-3.5 text-purple-400" />}
          </div>
          <span className="text-sm text-slate-200 truncate">{fileName}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-slate-700/30 pt-3">
              {cloudinaryUrl ? (
                <div className="relative">
                  <img
                    src={cloudinaryUrl}
                    alt={fileName}
                    className="w-full rounded-lg object-contain max-h-64"
                    draggable={false}
                    onContextMenu={viewOnly ? (e) => e.preventDefault() : undefined}
                  />
                  {viewOnly && (
                    <div className="absolute inset-0 flex items-end justify-center pb-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-xs text-slate-300">
                        <Eye className="w-3 h-3" /> View Only
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 bg-slate-700/30 rounded-lg">
                  <p className="text-xs text-slate-500">Preview not available</p>
                </div>
              )}

              {!viewOnly && cloudinaryUrl && (
                <a
                  href={cloudinaryUrl}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-xs text-purple-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section block ────────────────────────────────────────────────────────────
function SectionBlock({
  section,
  documents,
  viewOnly,
}: {
  section: PortfolioSection;
  documents: Record<string, unknown>;
  viewOnly: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:border-slate-600/60 transition-colors mb-2"
      >
        <h3 className="text-sm font-semibold text-slate-200">{section.title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{section.documents?.length ?? 0} docs</span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pl-2 space-y-2"
          >
            {(section.documents ?? []).length === 0 ? (
              <p className="text-xs text-slate-500 px-3 py-2">No documents in this section</p>
            ) : (
              (section.documents ?? []).map(docId => (
                <DocumentCard key={docId} docId={docId} documents={documents} viewOnly={viewOnly} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────
function ErrorScreen({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          {icon ?? <AlertTriangle className="w-8 h-8 text-red-400" />}
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-slate-400 text-sm">{message}</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SharedPortfolioPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'loading' | 'password' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorType, setErrorType] = useState<'expired' | 'revoked' | 'limit' | 'geo' | 'generic'>('generic');
  const [data, setData] = useState<SharedPortfolioData | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const deviceFingerprintRef = useRef<string>('');

  // Build a simple device fingerprint from browser signals
  useEffect(() => {
    const fp = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
    ].join('|');
    // Simple hash
    let hash = 0;
    for (let i = 0; i < fp.length; i++) {
      hash = (hash << 5) - hash + fp.charCodeAt(i);
      hash |= 0;
    }
    deviceFingerprintRef.current = Math.abs(hash).toString(36);

    // Store on first visit for device-bound check
    const key = `biovault_share_device_${token}`;
    const stored = localStorage.getItem(key);
    if (!stored) {
      localStorage.setItem(key, deviceFingerprintRef.current);
    }
  }, [token]);

  const loadPortfolio = useCallback(async () => {
    if (!token) {
      setErrorMsg('Invalid share link.');
      setState('error');
      return;
    }

    try {
      setState('loading');
      const result = await getSharedPortfolio(token);

      // Device-bound check (client-side pre-check)
      if (result.shareSettings.deviceBound) {
        const key = `biovault_share_device_${token}`;
        const stored = localStorage.getItem(key);
        if (stored && stored !== deviceFingerprintRef.current) {
          setErrorMsg('This link is device-bound and can only be opened on the device that first accessed it.');
          setErrorType('generic');
          setState('error');
          return;
        }
      }

      if (result.shareSettings.requiresPassword) {
        setData(result);
        setState('password');
      } else {
        setData(result);
        setState('loaded');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load portfolio';
      setErrorMsg(msg);
      if (msg.includes('expired')) setErrorType('expired');
      else if (msg.includes('revoked')) setErrorType('revoked');
      else if (msg.includes('limit')) setErrorType('limit');
      else if (msg.includes('location') || msg.includes('country') || msg.includes('city')) setErrorType('geo');
      else setErrorType('generic');
      setState('error');
    }
  }, [token]);

  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  const handlePasswordSubmit = async () => {
    if (!token || !password.trim()) return;
    setVerifying(true);
    setPasswordError('');
    try {
      const ok = await verifySharePassword(token, password);
      if (ok) {
        setState('loaded');
      } else {
        setPasswordError('Incorrect password. Please try again.');
      }
    } catch {
      setPasswordError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const isBlurred = useScreenshotProtection(data?.shareSettings.screenshotProtection ?? false);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: '3px' }} />
          <p className="text-slate-400 text-sm">Loading shared portfolio...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (state === 'error') {
    const icons: Record<string, React.ReactNode> = {
      expired: <Clock className="w-8 h-8 text-amber-400" />,
      revoked: <X className="w-8 h-8 text-red-400" />,
      limit: <Eye className="w-8 h-8 text-orange-400" />,
      geo: <AlertTriangle className="w-8 h-8 text-red-400" />,
      generic: <Shield className="w-8 h-8 text-slate-400" />,
    };
    return <ErrorScreen message={errorMsg} icon={icons[errorType]} />;
  }

  // ── Password gate ────────────────────────────────────────────────────────
  if (state === 'password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 rounded-2xl bg-purple-500/20">
              <Lock className="w-7 h-7 text-purple-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-1">Password Required</h2>
          <p className="text-slate-400 text-sm text-center mb-6">This portfolio is password-protected</p>

          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Enter password..."
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
              autoFocus
            />
            {passwordError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {passwordError}
              </p>
            )}
            <button
              onClick={handlePasswordSubmit}
              disabled={verifying || !password.trim()}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifying ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" /> Unlock Portfolio
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Loaded ───────────────────────────────────────────────────────────────
  if (!data) return null;

  const { portfolio, documents, shareSettings } = data;
  const sections: PortfolioSection[] = (() => {
    if (!portfolio.sections) return [];
    if (typeof portfolio.sections === 'string') {
      try { return JSON.parse(portfolio.sections as unknown as string); } catch { return []; }
    }
    return portfolio.sections as unknown as PortfolioSection[];
  })();

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 transition-all ${isBlurred ? 'blur-3xl' : ''}`}>
      {/* Screenshot blur overlay */}
      {isBlurred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-3xl">
          <div className="text-center">
            <Shield className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <p className="text-white font-semibold">Screenshot Protection Active</p>
            <p className="text-slate-400 text-sm mt-1">Content is protected</p>
          </div>
        </div>
      )}

      {/* Watermark */}
      {shareSettings.watermark && (
        <WatermarkOverlay text={shareSettings.watermarkText || 'Confidential — Shared Copy'} />
      )}

      {/* Header bar */}
      <div className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/40 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-white truncate max-w-[180px]">{portfolio.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {shareSettings.viewOnly && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/15 border border-blue-500/30 rounded-full text-xs text-blue-300">
                <Eye className="w-3 h-3" /> View Only
              </div>
            )}
            {shareSettings.watermark && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs text-amber-300">
                Protected
              </div>
            )}
            {shareSettings.expiresAt && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 rounded-full text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                Expires {new Date(shareSettings.expiresAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Portfolio meta */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-300 capitalize">
              {portfolio.type} Portfolio
            </span>
            {shareSettings.viewLimit && (
              <span className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-slate-400">
                {shareSettings.viewsUsed} / {shareSettings.viewLimit} views
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">{portfolio.name}</h1>
          {shareSettings.allowedSections && (
            <p className="text-xs text-slate-500 mt-1">
              Showing {shareSettings.allowedSections.length} of the portfolio's sections
            </p>
          )}
        </motion.div>

        {/* Sections */}
        {sections.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No sections available in this share</p>
          </div>
        ) : (
          sections.map(section => (
            <SectionBlock
              key={section.title}
              section={section}
              documents={documents}
              viewOnly={shareSettings.viewOnly}
            />
          ))
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
          <Shield className="w-3 h-3" />
          <span>Shared securely via BiVault</span>
        </div>
      </div>
    </div>
  );
}
