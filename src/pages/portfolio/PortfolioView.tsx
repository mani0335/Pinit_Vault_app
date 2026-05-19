import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, User, GraduationCap, Briefcase, Award,
  FileText, Image, File, Share2, Edit, Loader2,
  ExternalLink, Download, BookOpen, FolderOpen, Star,
  Calendar, Eye, ChevronDown, ChevronUp,
  CreditCard, Target, Globe, DollarSign, MoreHorizontal,
  BookMarked, Camera, Phone,
} from 'lucide-react';
import { getPortfolioById } from '../../lib/portfolioService';
import { loadVaultDocuments } from '../../lib/vaultService';
import type { Portfolio } from '../../types/Portfolio';

/* ─── type meta ──────────────────────────────────────────────── */
const TYPE_META: Record<string, {
  label: string; gradient: string; glow: string; border: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  tagline?: string;
}> = {
  personal:     { label: 'Personal Portfolio',              gradient: 'linear-gradient(135deg,#06b6d4,#3b82f6)', glow: 'rgba(6,182,212,0.3)',  border: 'rgba(6,182,212,0.4)',   icon: User,         tagline: 'Showcase skills, projects & identity'       },
  academic:     { label: 'Academic Portfolio',              gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)', glow: 'rgba(139,92,246,0.3)', border: 'rgba(139,92,246,0.45)', icon: GraduationCap,tagline: 'Full academic document package'              },
  professional: { label: 'Professional / Placement Portfolio', gradient: 'linear-gradient(135deg,#10b981,#14b8a6)', glow: 'rgba(16,185,129,0.3)', border: 'rgba(16,185,129,0.4)',  icon: Briefcase,    tagline: 'Career, placement & hiring ready'           },
  placement:    { label: 'Placement Portfolio',             gradient: 'linear-gradient(135deg,#10b981,#14b8a6)', glow: 'rgba(16,185,129,0.3)', border: 'rgba(16,185,129,0.4)',  icon: Briefcase,    tagline: 'Career, placement & hiring ready'           },
  masters:      { label: 'Masters Portfolio',               gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)', glow: 'rgba(245,158,11,0.3)', border: 'rgba(245,158,11,0.4)',  icon: Award,        tagline: 'MS / PhD application document pack'         },
};

const SECTION_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  // common
  'About Me':                   User,
  'Professional Summary':       User,
  'Skills':                     Star,
  'Projects':                   FolderOpen,
  'Achievements':               Award,
  'Experience':                 Briefcase,
  'Work Experience':            Briefcase,
  'Education':                  GraduationCap,
  'Research':                   BookOpen,
  'Research Interests':         BookOpen,
  'Publications':               BookOpen,
  'Contact Info':               Phone,
  // resume / docs
  'Resume':                     FileText,
  'Resume / CV':                FileText,
  'Certificates':               Award,
  'Certifications':             Award,
  'Academic Memos':             FileText,
  'Documents':                  FolderOpen,
  'Personal Documents':         FolderOpen,
  'Others':                     MoreHorizontal,
  // professional
  'Offer Letters':              BookMarked,
  'Internship Documents':       Briefcase,
  'Internships':                Briefcase,
  'Work Proof Images':          Camera,
  // academic / masters vault
  'Personal Proofs':            CreditCard,
  'Academic Documents':         BookMarked,
  'Main Entrance Exams':        Target,
  'Language Proficiency Tests': Globe,
  'Financial Documents':        DollarSign,
};
const SECTION_COLOR: Record<string, string> = {
  'About Me':                   '#38bdf8',
  'Professional Summary':       '#38bdf8',
  'Skills':                     '#a78bfa',
  'Projects':                   '#34d399',
  'Achievements':               '#fbbf24',
  'Experience':                 '#fb923c',
  'Work Experience':            '#34d399',
  'Education':                  '#60a5fa',
  'Research':                   '#34d399',
  'Research Interests':         '#34d399',
  'Publications':               '#60a5fa',
  'Contact Info':               '#60a5fa',
  'Resume':                     '#f472b6',
  'Resume / CV':                '#f472b6',
  'Certificates':               '#f472b6',
  'Certifications':             '#f472b6',
  'Academic Memos':             '#60a5fa',
  'Documents':                  '#818cf8',
  'Personal Documents':         '#818cf8',
  'Others':                     '#9ca3af',
  'Offer Letters':              '#818cf8',
  'Internship Documents':       '#34d399',
  'Internships':                '#34d399',
  'Work Proof Images':          '#fb923c',
  'Personal Proofs':            '#60a5fa',
  'Academic Documents':         '#818cf8',
  'Main Entrance Exams':        '#ef4444',
  'Language Proficiency Tests': '#06b6d4',
  'Financial Documents':        '#fbbf24',
};

/* ─── helpers ────────────────────────────────────────────────── */
function docIcon(name: string) {
  const n = (name ?? '').toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(n)) return <Image size={14} color="#22c55e" />;
  if (/\.pdf$/.test(n)) return <FileText size={14} color="#ef4444" />;
  return <File size={14} color="#a78bfa" />;
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Parse the `content` field of a section into a list of text items.
 * Handles: newline-separated string, JSON array string, plain string.
 */
function parseContent(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return (raw as unknown[]).map(String).filter(s => s.trim());

  const s = String(raw).trim();
  if (!s) return [];

  // Try JSON array ("["React","Node"]")
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map(String).filter(x => x.trim());
    } catch { /* not valid JSON, fall through */ }
  }

  // Standard newline-separated
  return s.split('\n').map(l => l.trim()).filter(Boolean);
}

/**
 * Ensure sections is always an array, even if the backend returned a JSON string.
 */
function parseSections(raw: unknown): Portfolio['sections'] {
  if (Array.isArray(raw)) return raw as Portfolio['sections'];
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr as Portfolio['sections'];
    } catch { /* ignore */ }
  }
  return [];
}

interface VaultDocInfo { name: string; url?: string; size?: number }
interface VaultDocMap  { [id: string]: VaultDocInfo }

/* ─── component ──────────────────────────────────────────────── */
export default function PortfolioView() {
  const navigate  = useNavigate();
  const { id }    = useParams<{ id: string }>();
  const location  = useLocation();
  const userId    = localStorage.getItem('biovault_userId') ?? '';

  const navPortfolio = (location.state as { portfolio?: Portfolio } | null)?.portfolio ?? null;
  const [portfolio, setPortfolio] = useState<Portfolio | null>(navPortfolio);
  const [vaultMap,  setVaultMap]  = useState<VaultDocMap>({});
  const [loading,   setLoading]   = useState(!navPortfolio);
  const [expanded,  setExpanded]  = useState<Record<number, boolean>>({});

  /* ── load portfolio + vault docs ── */
  useEffect(() => {
    let alive = true;

    (async () => {
      // 1. Fetch portfolio if not in nav state
      if (!portfolio && id && userId) {
        try {
          const p = await getPortfolioById(userId, id);
          if (alive && p) setPortfolio(p);
        } catch { /* ignore */ }
      }

      // 2. Load vault docs to resolve document names / URLs
      if (userId) {
        try {
          const docs = await loadVaultDocuments(userId) as {
            id: string; name: string; cloudinaryUrl?: string; metadata?: { size?: number };
          }[];
          const map: VaultDocMap = {};
          docs.forEach(d => {
            map[d.id] = { name: d.name, url: d.cloudinaryUrl, size: d.metadata?.size };
          });
          if (alive) setVaultMap(map);
        } catch { /* vault unavailable — doc chips still show without URLs */ }
      }

      if (alive) setLoading(false);
    })();

    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId]);

  /* ── loading ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#07031a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={36} color="#a78bfa" style={{ animation: 'spin 0.8s linear infinite', display: 'block', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading portfolio…</p>
        </div>
      </div>
    );
  }

  /* ── not found ── */
  if (!portfolio) {
    return (
      <div style={{ minHeight: '100vh', background: '#07031a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
        <FolderOpen size={48} color="#374151" />
        <p style={{ color: '#9ca3af', fontSize: 16, fontWeight: 600 }}>Portfolio not found</p>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, padding: '10px 20px', color: '#c4b5fd', cursor: 'pointer' }}>
          Go back
        </button>
      </div>
    );
  }

  const meta     = TYPE_META[portfolio.type] ?? TYPE_META.personal;
  const TypeIcon = meta.icon;

  // Normalise sections (handles backend returning JSON string)
  const sections = parseSections(portfolio.sections);
  const totalDocs = sections.reduce((n, s) => n + ((s as any).documents?.length ?? 0), 0);

  /* ─── main render ─── */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#07031a 0%,#0d0520 30%,#130833 60%,#0d0520 100%)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -100, left: -80, width: 360, height: 360, borderRadius: '50%', background: `radial-gradient(circle,${meta.glow} 0%,transparent 70%)`, filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(79,70,229,0.1) 0%,transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* ── header ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px 16px', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 12px rgba(139,92,246,0.2)' }}>
          <ArrowLeft size={20} color="#c4b5fd" />
        </button>
        <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0, flex: 1, textAlign: 'center', letterSpacing: -0.3 }}>Portfolio</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate(`/portfolio/edit/${portfolio.id}`, { state: { portfolio } })}
            style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Edit size={18} color="#c4b5fd" />
          </button>
          <button
            onClick={() => navigate(`/portfolio/share/${portfolio.id}`, { state: { portfolio } })}
            style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Share2 size={18} color="#34d399" />
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, padding: '0 16px 60px' }}>

        {/* ── hero card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'linear-gradient(135deg,rgba(20,8,55,0.9),rgba(13,5,32,0.95))', border: `1px solid ${meta.border}`, borderRadius: 22, padding: '20px 18px', marginBottom: 20, boxShadow: `0 0 40px ${meta.glow}, inset 0 1px 0 rgba(255,255,255,0.06)` }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 20px ${meta.glow}` }}>
              <TypeIcon size={24} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, marginBottom: 8, letterSpacing: -0.5 }}>{portfolio.name}</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: meta.gradient, borderRadius: 20, padding: '4px 12px' }}>{meta.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#34d399', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '4px 12px' }}>{portfolio.status ?? 'active'}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={13} color="#6b7280" />
              <span style={{ color: '#9ca3af', fontSize: 12 }}>Created {fmtDate(portfolio.createdAt)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Eye size={13} color="#6b7280" />
              <span style={{ color: '#9ca3af', fontSize: 12 }}>{portfolio.views ?? 0} views</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={13} color="#6b7280" />
              <span style={{ color: '#9ca3af', fontSize: 12 }}>{totalDocs} doc{totalDocs !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </motion.div>

        {/* ── sections label ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ color: '#9ca3af', fontSize: 12, fontWeight: 700, letterSpacing: 0.8, margin: 0 }}>
            SECTIONS ({sections.length})
          </p>
          <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>
            tap to expand / collapse
          </p>
        </div>

        {/* ── section list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sections.map((sec, idx) => {
            // Cast to any to access content safely (type only has documents)
            const s = sec as { title: string; content?: string; documents?: unknown[] };

            const SIcon  = SECTION_ICON[s.title]  ?? FileText;
            const sColor = SECTION_COLOR[s.title] ?? '#a78bfa';
            const isExp  = expanded[idx] ?? true; // default: expanded

            // Parse text items from content field
            const items = parseContent(s.content);

            // Resolve document list — documents can be:
            //   string[]            — array of vault IDs
            //   { id, ... }[]       — full document objects (if backend expands them)
            const rawDocs = (s.documents ?? []) as unknown[];
            const docEntries: { id: string; name?: string; url?: string; size?: number }[] =
              rawDocs.map(d => {
                if (typeof d === 'string') {
                  const vDoc = vaultMap[d];
                  return { id: d, name: vDoc?.name, url: vDoc?.url, size: vDoc?.size };
                }
                if (d && typeof d === 'object') {
                  const obj = d as { id?: string; name?: string; url?: string; cloudinaryUrl?: string; size?: number; metadata?: { size?: number } };
                  const docId = obj.id ?? '';
                  const vDoc  = vaultMap[docId];
                  return {
                    id:   docId,
                    name: obj.name ?? vDoc?.name,
                    url:  obj.url  ?? obj.cloudinaryUrl ?? vDoc?.url,
                    size: obj.size ?? obj.metadata?.size ?? vDoc?.size,
                  };
                }
                return { id: String(d) };
              });

            const hasContent = items.length > 0 || docEntries.length > 0;
            if (!hasContent) return null;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 + idx * 0.04 }}
                style={{
                  background: 'linear-gradient(135deg,rgba(20,8,55,0.88),rgba(13,5,32,0.92))',
                  border: '1px solid rgba(139,92,246,0.18)',
                  borderLeft: `3px solid ${sColor}`,
                  borderRadius: 16, overflow: 'hidden',
                  boxShadow: isExp ? `0 0 20px ${sColor}14` : 'none',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {/* section header */}
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [idx]: !isExp }))}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${sColor}1a`, border: `1px solid ${sColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <SIcon size={16} color={sColor} />
                  </div>
                  <span style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 14, flex: 1 }}>{s.title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {docEntries.length > 0 && (
                      <span style={{ color: '#f472b6', fontSize: 11, fontWeight: 700, background: 'rgba(244,114,182,0.1)', borderRadius: 20, padding: '2px 7px', border: '1px solid rgba(244,114,182,0.25)' }}>
                        {docEntries.length} file{docEntries.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {items.length > 0 && (
                      <span style={{ color: sColor, fontSize: 11, fontWeight: 700, background: `${sColor}18`, borderRadius: 20, padding: '2px 7px', border: `1px solid ${sColor}33` }}>
                        {items.length}
                      </span>
                    )}
                    {isExp ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
                  </div>
                </button>

                {/* section body */}
                <AnimatePresence>
                  {isExp && (
                    <motion.div
                      key="body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>

                        {/* text / list items */}
                        {items.length > 0 && (
                          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {items.map((item, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: sColor, marginTop: 8, flexShrink: 0 }} />
                                <p style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{item}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* vault document chips */}
                        {docEntries.length > 0 && (
                          <div style={{ marginTop: items.length > 0 ? 14 : 12 }}>
                            <p style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, margin: '0 0 8px' }}>ATTACHED FILES</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {docEntries.map((doc, di) => {
                                const name = doc.name ?? `Document ${di + 1}`;
                                return (
                                  <div key={di} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(244,114,182,0.06)', border: '1px solid rgba(244,114,182,0.18)', borderRadius: 11, padding: '10px 12px' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      {docIcon(name)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                                      {doc.size && <p style={{ color: '#6b7280', fontSize: 11, margin: '2px 0 0' }}>{(doc.size / 1024).toFixed(1)} KB</p>}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                      {doc.url && (
                                        <a href={doc.url} target="_blank" rel="noreferrer" style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                                          <ExternalLink size={13} color="#c4b5fd" />
                                        </a>
                                      )}
                                      {doc.url && (
                                        <a href={doc.url} download target="_blank" rel="noreferrer" style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                                          <Download size={13} color="#34d399" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* empty fallback */}
        {sections.every(s => {
          const any = s as any;
          return !any.content && !(any.documents?.length);
        }) && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <FolderOpen size={40} color="#374151" style={{ display: 'block', margin: '0 auto 12px' }} />
            <p style={{ color: '#9ca3af', fontSize: 14 }}>No content added yet. Tap Edit to fill in sections.</p>
          </div>
        )}
      </div>
    </div>
  );
}
