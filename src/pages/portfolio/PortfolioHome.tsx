import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderOpen, Search, LogOut, FileText, Layers } from 'lucide-react';
import PortfolioCard from '../../components/portfolio/PortfolioCard';
import BottomNav from '../../components/BottomNav';
import { loadPortfolios, deletePortfolio, pingBackend } from '../../lib/portfolioService';
import type { Portfolio } from '../../types/Portfolio';

interface PortfolioHomeProps {
  userId?: string | null;
}

const cacheKey = (uid: string) => `biovault_portfolios_cache_${uid}`;

function readCache(uid: string): Portfolio[] {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (raw) return JSON.parse(raw) as Portfolio[];
  } catch { /* ignore */ }
  return [];
}

function writeCache(uid: string, portfolios: Portfolio[]) {
  try { localStorage.setItem(cacheKey(uid), JSON.stringify(portfolios)); } catch { /* ignore */ }
}

const BG = 'linear-gradient(160deg, #0a0118 0%, #130a2e 50%, #07031a 100%)';

/* ── Neon grid SVG overlay ── */
const GRID_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='rgba(139%2C92%2C246%2C0.07)' stroke-width='0.5'/%3E%3C/svg%3E")`;

export default function PortfolioHome({ userId: propUserId }: PortfolioHomeProps) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(propUserId || null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [docCount, setDocCount] = useState(0);

  const hasFetched = useRef(false);

  const effectiveUid = userId || localStorage.getItem('biovault_userId') || '';
  const displayId = effectiveUid ? effectiveUid.slice(0, 8).toUpperCase() : 'USR-0000';
  const avatarLetter = displayId.charAt(0);

  useEffect(() => {
    try {
      const uid = effectiveUid;
      const vaultData = JSON.parse(localStorage.getItem(`biovault_vault_${uid}`) || '[]');
      setDocCount(Array.isArray(vaultData) ? vaultData.length : 0);
    } catch { setDocCount(0); }
  }, [effectiveUid]);

  useEffect(() => { pingBackend().catch(() => {}); }, []);

  async function fetchPortfolios(uid: string, background = false) {
    if (!uid) return;
    if (!background) {
      const cached = readCache(uid);
      if (cached.length > 0) {
        setPortfolios(cached);
        setLoading(false);
        setSyncing(true);
      } else {
        setLoading(true);
      }
    } else {
      setSyncing(true);
    }
    try {
      setError(null);
      const loaded = await loadPortfolios(uid);
      const currentCache = readCache(uid);
      if (loaded.length > 0 || currentCache.length === 0) {
        setPortfolios(loaded);
        writeCache(uid, loaded);
      } else {
        setPortfolios(currentCache);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'SERVER_TIMEOUT' && portfolios.length === 0 && readCache(uid).length === 0) {
        setError('SERVER_TIMEOUT');
      }
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  const handleRetry = () => {
    hasFetched.current = false;
    const uid = userId || localStorage.getItem('biovault_userId');
    if (uid) { hasFetched.current = true; fetchPortfolios(uid); }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    const id = propUserId || localStorage.getItem('biovault_userId');
    if (id) { setUserId(id); fetchPortfolios(id); }
    else { setLoading(false); setError('Please login to view portfolios'); }
  }, [propUserId]);

  const handleView   = (id: string) => navigate(`/portfolio/view/${id}`);
  const handleEdit   = (id: string) => navigate(`/portfolio/edit/${id}`);
  const handleShare  = (id: string) => navigate(`/portfolio/share/${id}`);
  const handleCreate = () => navigate('/portfolio/choose-type');

  const handleDelete = async (id: string) => {
    if (!effectiveUid) return;
    // Optimistically remove from UI immediately
    const updated = portfolios.filter(p => p.id !== id);
    setPortfolios(updated);
    writeCache(effectiveUid, updated);
    setShowDeleteModal(null);
    try {
      await deletePortfolio(effectiveUid, id);
    } catch {
      // If backend fails, local cache already updated — acceptable
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('biovault_token');
    localStorage.removeItem('biovault_userId');
    navigate('/');
  };

  const filteredPortfolios = portfolios.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const totalSections = portfolios.reduce((t, p) => t + (p.sections?.length ?? 0), 0);
  const totalDocs2    = portfolios.reduce((t, p) => t + p.sections.reduce((n, s) => n + ((s as {documents?:unknown[]}).documents?.length ?? 0), 0), 0);

  /* ── Loading screen ── */
  if (loading && portfolios.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: BG, backgroundImage: GRID_SVG, paddingTop: 'env(safe-area-inset-top, 0px)' }} className="flex flex-col">
        <div className="flex flex-col items-center justify-center gap-5 py-20 flex-1">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(124,58,237,0.15)', border: '2px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px rgba(124,58,237,0.4)' }}>
            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
          </div>
          <p className="text-white font-bold text-lg">Loading Portfolios…</p>
          <p className="text-slate-400 text-sm">First load may take a few seconds.</p>
          <button onClick={handleRetry} style={{ marginTop: 8, padding: '10px 24px', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', borderRadius: 12, fontSize: 13, background: 'rgba(139,92,246,0.08)', cursor: 'pointer' }}>
            Taking too long? Tap to retry
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ── Timeout screen ── */
  if (error === 'SERVER_TIMEOUT' && portfolios.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: BG, backgroundImage: GRID_SVG, paddingTop: 'env(safe-area-inset-top, 0px)' }} className="flex flex-col">
        <div className="flex flex-col items-center justify-center gap-5 py-20 flex-1 px-8">
          <div style={{ fontSize: 52 }}>⏳</div>
          <p className="text-white font-bold text-xl">Server Waking Up</p>
          <p className="text-slate-400 text-sm text-center">The portfolio server takes a moment. Usually connects on the 2nd try.</p>
          <button onClick={handleRetry} style={{ padding: '12px 32px', borderRadius: 14, color: 'white', fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 0 24px rgba(124,58,237,0.5)', cursor: 'pointer', border: 'none' }}>
            🔄 Retry Connection
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ── Main page ── */
  return (
    <div style={{ minHeight: '100vh', background: BG, backgroundImage: GRID_SVG, paddingBottom: 90, paddingTop: 'env(safe-area-inset-top, 0px)', position: 'relative' }}>

      {/* Ambient glow blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -120, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.18) 0%,transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: 100, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(79,70,229,0.12) 0%,transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      {/* ── Top Header ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 8px' }}>
        {/* Avatar + user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 50, height: 50, borderRadius: '50%',
            background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 22px rgba(124,58,237,0.6), 0 0 0 2px rgba(139,92,246,0.3)',
            flexShrink: 0,
          }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 20, letterSpacing: -0.5 }}>{avatarLetter}</span>
          </div>
          <div>
            <p style={{ color: '#f0e9ff', fontWeight: 800, fontSize: 15, lineHeight: 1.2, letterSpacing: 0.3 }}>
              {displayId}
            </p>
            <p style={{ color: '#6b7280', fontSize: 12, letterSpacing: 0.2 }}>
              @{effectiveUid.toLowerCase().slice(0, 12) || 'user'}
            </p>
          </div>
        </div>
        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{ padding: '8px 12px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <LogOut size={16} color="#f87171" />
          <span style={{ color: '#f87171', fontSize: 12, fontWeight: 600 }}>Exit</span>
        </button>
      </div>

      {/* ── Vault Status Strip ── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '8px 16px 0' }}>
        <div style={{
          padding: '9px 16px', borderRadius: 40,
          background: 'rgba(10,6,28,0.8)',
          border: '1px solid rgba(139,92,246,0.18)',
          backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', flexShrink: 0 }} />
          <span style={{ color: '#4ade80', fontSize: 12, fontWeight: 700 }}>Vault Active</span>
          <span style={{ color: '#374151', fontSize: 12 }}>|</span>
          <span style={{ color: '#64748b', fontSize: 12 }}>{docCount} docs</span>
          <span style={{ color: '#374151', fontSize: 12 }}>|</span>
          <span style={{ color: '#64748b', fontSize: 12 }}>🔐 Encrypted</span>
          {syncing && (
            <>
              <span style={{ color: '#374151', fontSize: 12 }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                <span style={{ color: '#7c3aed', fontSize: 11, fontWeight: 600 }}>Syncing</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Page Title + Stats ── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <h1 style={{ color: 'white', fontWeight: 900, fontSize: 40, lineHeight: 1, letterSpacing: '-1px', margin: 0 }}>
              Portfolio
            </h1>
            <div style={{ height: 3, width: 52, background: 'linear-gradient(90deg,#7c3aed,#4f46e5)', borderRadius: 2, marginTop: 6, boxShadow: '0 0 10px rgba(124,58,237,0.7)' }} />
          </div>
          <motion.button
            onClick={handleCreate}
            whileTap={{ scale: 0.92 }}
            style={{
              padding: '9px 18px', borderRadius: 14,
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              boxShadow: '0 0 20px rgba(124,58,237,0.5)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              color: 'white', fontWeight: 700, fontSize: 14,
            }}
          >
            <Plus size={16} strokeWidth={3} />
            New
          </motion.button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          {[
            { label: 'Portfolios', value: portfolios.length, icon: <Layers size={14} color="#a78bfa" />, color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.22)' },
            { label: 'Documents',  value: totalDocs2,        icon: <FileText size={14} color="#f472b6" />, color: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)' },
            { label: 'Sections',   value: totalSections,     icon: <FolderOpen size={14} color="#34d399" />, color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
          ].map(stat => (
            <div key={stat.label} style={{ flex: 1, padding: '10px 12px', borderRadius: 14, background: stat.bg, border: `1px solid ${stat.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {stat.icon}
                <span style={{ color: stat.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>{stat.label.toUpperCase()}</span>
              </div>
              <span style={{ color: 'white', fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Error (non-timeout) ── */}
      {error && error !== 'SERVER_TIMEOUT' && (
        <div style={{ position: 'relative', zIndex: 10, margin: '16px 16px 0', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#fca5a5', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* ── Search + Filter ── */}
      {portfolios.length > 0 && (
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: 10, padding: '20px 16px 8px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} size={15} />
            <input
              type="text"
              placeholder="Search portfolios…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 11, paddingBottom: 11,
                background: 'rgba(10,6,28,0.85)', border: '1px solid rgba(139,92,246,0.18)',
                borderRadius: 13, color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                backdropFilter: 'blur(12px)',
              }}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '11px 10px', background: 'rgba(10,6,28,0.85)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 13, color: 'white', fontSize: 13, outline: 'none', backdropFilter: 'blur(12px)' }}
          >
            <option value="all">All</option>
            <option value="personal">Personal</option>
            <option value="academic">Academic</option>
            <option value="professional">Professional</option>
            <option value="masters">Masters</option>
          </select>
        </div>
      )}

      {/* ── Section label ── */}
      {portfolios.length > 0 && (
        <div style={{ position: 'relative', zIndex: 10, padding: '8px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#4b5563', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>MY PORTFOLIOS</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,rgba(139,92,246,0.3),transparent)' }} />
        </div>
      )}

      {/* ── Empty state / Portfolio grid ── */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        {filteredPortfolios.length === 0 ? (
          <div style={{ padding: '8px 16px 40px' }}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'linear-gradient(135deg,rgba(14,6,40,0.8),rgba(10,4,28,0.9))',
                border: '1.5px dashed rgba(139,92,246,0.22)',
                borderRadius: 22,
                padding: '48px 28px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
                backdropFilter: 'blur(12px)',
              }}
            >
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(124,58,237,0.1)',
                border: '1.5px solid rgba(139,92,246,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 30px rgba(124,58,237,0.2)',
              }}>
                <FolderOpen size={34} color="#f59e0b" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: '#f0e9ff', fontWeight: 800, fontSize: 20, margin: '0 0 10px' }}>
                  {searchQuery || filterType !== 'all' ? 'No portfolios match' : 'No Portfolios Yet'}
                </h3>
                <p style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  {searchQuery || filterType !== 'all'
                    ? 'Try a different search or filter'
                    : <>Tap <strong style={{ color: '#a78bfa' }}>New</strong> above or the <strong style={{ color: '#a78bfa' }}>+</strong> button below to create your first portfolio</>
                  }
                </p>
              </div>
              {!searchQuery && filterType === 'all' && (
                <motion.button
                  onClick={handleCreate}
                  whileTap={{ scale: 0.95 }}
                  style={{ padding: '12px 28px', borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', cursor: 'pointer', color: 'white', fontWeight: 700, fontSize: 15, boxShadow: '0 0 20px rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Plus size={16} strokeWidth={3} />
                  Create Portfolio
                </motion.button>
              )}
            </motion.div>
          </div>
        ) : (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <AnimatePresence>
              {filteredPortfolios.map((portfolio, idx) => (
                <motion.div
                  key={portfolio.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.97 }}
                  transition={{ delay: idx * 0.04, duration: 0.22 }}
                >
                  <PortfolioCard
                    portfolio={portfolio}
                    onView={handleView}
                    onEdit={handleEdit}
                    onShare={handleShare}
                    onDelete={() => setShowDeleteModal(portfolio.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Floating FAB ── */}
      <motion.button
        onClick={handleCreate}
        whileTap={{ scale: 0.88 }}
        animate={{ boxShadow: ['0 0 24px rgba(124,58,237,0.55)', '0 0 40px rgba(124,58,237,0.8)', '0 0 24px rgba(124,58,237,0.55)'] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'fixed', bottom: 90, right: 20,
          width: 58, height: 58, borderRadius: '50%',
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid rgba(139,92,246,0.5)',
          cursor: 'pointer', zIndex: 40,
        }}
      >
        <Plus size={26} color="white" strokeWidth={2.5} />
      </motion.button>

      <BottomNav />

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
            onClick={() => setShowDeleteModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              style={{ background: 'linear-gradient(160deg,#1a1040,#0d0520)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 22, padding: 26, maxWidth: 340, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FolderOpen size={22} color="#f87171" />
              </div>
              <h3 style={{ color: 'white', fontWeight: 700, fontSize: 19, marginBottom: 8, textAlign: 'center' }}>Delete Portfolio</h3>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24, lineHeight: 1.6, textAlign: 'center' }}>
                Delete "<span style={{ color: '#e5e7eb' }}>{portfolios.find(p => p.id === showDeleteModal)?.name}</span>"? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setShowDeleteModal(null)}
                  style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', borderRadius: 13, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteModal)}
                  style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(220,38,38,0.15))', color: '#f87171', borderRadius: 13, border: '1px solid rgba(239,68,68,0.35)', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
