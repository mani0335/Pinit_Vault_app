import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, User, GraduationCap, Briefcase, Award,
  CheckCircle, FileText, Image, File, ChevronDown, ChevronUp,
  Loader2, Paperclip, X, Plus, Trash2, BookOpen, FolderOpen,
  Briefcase as BriefcaseIcon, Star, AlertCircle, Save,
} from 'lucide-react';
import { getPortfolioById, updatePortfolio, pingBackend } from '../../lib/portfolioService';
import { loadVaultDocuments } from '../../lib/vaultService';
import type { Portfolio } from '../../types/Portfolio';

/* ══════════════════════════════════════ types ══ */
type PortfolioType = Portfolio['type'];

interface SectionConfig {
  title: string;
  kind: 'text' | 'list' | 'vault';
  placeholder?: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
}

interface SectionData {
  title: string;
  kind: 'text' | 'list' | 'vault';
  content: string;
  items: string[];
  documents: string[];
  docNames: string[];
  expanded: boolean;
}

interface VaultDoc {
  id: string;
  name: string;
  metadata: { size: number; original_name?: string };
  createdAt: string;
}

/* ══════════════════════════════════════ section configs ══ */
const SECTIONS_BY_TYPE: Record<string, SectionConfig[]> = {
  personal: [
    { title: 'About Me',      kind: 'text',  placeholder: 'Write a short bio…',             icon: User,          color: '#38bdf8' },
    { title: 'Skills',        kind: 'list',  placeholder: 'Add a skill…',                    icon: Star,          color: '#a78bfa' },
    { title: 'Projects',      kind: 'list',  placeholder: 'Describe a project…',             icon: FolderOpen,    color: '#34d399' },
    { title: 'Achievements',  kind: 'list',  placeholder: 'Add an achievement…',             icon: Award,         color: '#fbbf24' },
    { title: 'Experience',    kind: 'list',  placeholder: 'Add work experience…',            icon: BriefcaseIcon, color: '#fb923c' },
    { title: 'Education',     kind: 'list',  placeholder: 'Add education details…',          icon: GraduationCap, color: '#60a5fa' },
    { title: 'Resume',        kind: 'vault', placeholder: '',                                icon: FileText,      color: '#f472b6' },
    { title: 'Documents',     kind: 'vault', placeholder: '',                                icon: FolderOpen,    color: '#818cf8' },
  ],
  academic: [
    { title: 'About Me',       kind: 'text',  placeholder: 'Write a short bio…',            icon: User,          color: '#38bdf8' },
    { title: 'Education',      kind: 'list',  placeholder: 'Add education details…',         icon: GraduationCap, color: '#a78bfa' },
    { title: 'Research',       kind: 'text',  placeholder: 'Describe your research…',        icon: BookOpen,      color: '#34d399' },
    { title: 'Achievements',   kind: 'list',  placeholder: 'Add an achievement…',            icon: Award,         color: '#fbbf24' },
    { title: 'Skills',         kind: 'list',  placeholder: 'Add a skill…',                   icon: Star,          color: '#fb923c' },
    { title: 'Academic Memos', kind: 'vault', placeholder: '',                               icon: FileText,      color: '#60a5fa' },
    { title: 'Certificates',   kind: 'vault', placeholder: '',                               icon: Award,         color: '#f472b6' },
    { title: 'Documents',      kind: 'vault', placeholder: '',                               icon: FolderOpen,    color: '#818cf8' },
  ],
  professional: [
    { title: 'About Me',     kind: 'text',  placeholder: 'Write a professional summary…',   icon: User,          color: '#38bdf8' },
    { title: 'Experience',   kind: 'list',  placeholder: 'Add work experience…',            icon: BriefcaseIcon, color: '#34d399' },
    { title: 'Skills',       kind: 'list',  placeholder: 'Add a skill…',                    icon: Star,          color: '#a78bfa' },
    { title: 'Projects',     kind: 'list',  placeholder: 'Describe a project…',             icon: FolderOpen,    color: '#fbbf24' },
    { title: 'Achievements', kind: 'list',  placeholder: 'Add an achievement…',             icon: Award,         color: '#fb923c' },
    { title: 'Education',    kind: 'list',  placeholder: 'Add education details…',          icon: GraduationCap, color: '#60a5fa' },
    { title: 'Resume',       kind: 'vault', placeholder: '',                                icon: FileText,      color: '#f472b6' },
    { title: 'Certificates', kind: 'vault', placeholder: '',                                icon: Award,         color: '#818cf8' },
    { title: 'Documents',    kind: 'vault', placeholder: '',                                icon: FolderOpen,    color: '#c084fc' },
  ],
  masters: [
    { title: 'About Me',          kind: 'text',  placeholder: 'Write a short bio…',         icon: User,          color: '#38bdf8' },
    { title: 'Education',         kind: 'list',  placeholder: 'Add education details…',      icon: GraduationCap, color: '#a78bfa' },
    { title: 'Research Interests',kind: 'text',  placeholder: 'Describe research interests…',icon: BookOpen,      color: '#34d399' },
    { title: 'Projects',          kind: 'list',  placeholder: 'Describe a project…',         icon: FolderOpen,    color: '#fbbf24' },
    { title: 'Experience',        kind: 'list',  placeholder: 'Add work / research exp…',    icon: BriefcaseIcon, color: '#fb923c' },
    { title: 'Publications',      kind: 'list',  placeholder: 'Add a publication…',          icon: BookOpen,      color: '#60a5fa' },
    { title: 'Academic Memos',    kind: 'vault', placeholder: '',                            icon: FileText,      color: '#f472b6' },
    { title: 'Certificates',      kind: 'vault', placeholder: '',                            icon: Award,         color: '#818cf8' },
    { title: 'Documents',         kind: 'vault', placeholder: '',                            icon: FolderOpen,    color: '#c084fc' },
  ],
};

/* ══════════════════════════════════════ type meta ══ */
const TYPE_META: Record<string, {
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  gradient: string;
  glow: string;
  border: string;
}> = {
  personal:     { label: 'Personal Portfolio',     icon: User,         gradient: 'linear-gradient(135deg,#06b6d4,#3b82f6)', glow: 'rgba(6,182,212,0.3)',   border: 'rgba(6,182,212,0.4)'   },
  academic:     { label: 'Academic Portfolio',     icon: GraduationCap,gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)', glow: 'rgba(139,92,246,0.3)',  border: 'rgba(139,92,246,0.45)' },
  professional: { label: 'Professional Portfolio', icon: Briefcase,    gradient: 'linear-gradient(135deg,#10b981,#14b8a6)', glow: 'rgba(16,185,129,0.3)',  border: 'rgba(16,185,129,0.4)'  },
  masters:      { label: 'Masters Portfolio',      icon: Award,        gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)', glow: 'rgba(245,158,11,0.3)',  border: 'rgba(245,158,11,0.4)'  },
};

/* ══════════════════════════════════════ helpers ══ */
function docIcon(name: string) {
  const n = (name ?? '').toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(n)) return <Image size={15} color="#22c55e" />;
  if (/\.pdf$/.test(n)) return <FileText size={15} color="#ef4444" />;
  return <File size={15} color="#a78bfa" />;
}

/** Reconstruct SectionData[] from stored section records + SECTIONS_BY_TYPE config */
function reconstructSections(
  type: string,
  stored: { title: string; content: string; documents?: string[] }[],
  vaultDocs: VaultDoc[],
): SectionData[] {
  const configs = SECTIONS_BY_TYPE[type] ?? SECTIONS_BY_TYPE.personal;
  const cfgMap = new Map(configs.map(c => [c.title, c]));
  const docMap = new Map(vaultDocs.map(d => [d.id, d.name]));

  return stored.map(s => {
    const cfg  = cfgMap.get(s.title);
    const docs = s.documents ?? [];
    // Derive kind: prefer config lookup, otherwise infer from data
    const kind: 'text' | 'list' | 'vault' =
      cfg?.kind ??
      (docs.length > 0 ? 'vault' : s.content?.includes('\n') ? 'list' : 'text');

    return {
      title:     s.title,
      kind,
      content:   kind === 'text' ? (s.content ?? '') : '',
      items:     kind === 'list'  ? (s.content ?? '').split('\n').filter(Boolean) : [],
      documents: docs,
      docNames:  docs.map(id => docMap.get(id) ?? id),
      expanded:  false,
    };
  });
}

/* ══════════════════════════════════════ component ══ */
export default function PortfolioEdit() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { id }        = useParams<{ id: string }>();
  const userId        = localStorage.getItem('biovault_userId') ?? '';

  // Portfolio loaded from nav state or API
  const [portfolio,     setPortfolio]     = useState<Portfolio | null>(
    (location.state as { portfolio?: Portfolio } | null)?.portfolio ?? null,
  );
  const [loadingPortfolio, setLoadingPortfolio] = useState(!portfolio);

  // Form state
  const [portfolioName, setPortfolioName] = useState(portfolio?.name ?? '');
  const [nameError,     setNameError]     = useState('');
  const [sections,      setSections]      = useState<SectionData[]>([]);
  const [saving,        setSaving]        = useState(false);
  const [done,          setDone]          = useState(false);
  const [apiError,      setApiError]      = useState('');

  // Vault modal state
  const [vaultOpen,    setVaultOpen]    = useState(false);
  const [vaultSection, setVaultSection] = useState<number | null>(null);
  const [vaultDocs,    setVaultDocs]    = useState<VaultDoc[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());

  const newItemRefs = useRef<Record<number, string>>({});

  /* ── load portfolio if not in nav state ── */
  useEffect(() => {
    if (portfolio || !id || !userId) {
      setLoadingPortfolio(false);
      return;
    }
    getPortfolioById(userId, id)
      .then(p => {
        if (p) {
          setPortfolio(p);
          setPortfolioName(p.name);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPortfolio(false));
  }, [id, userId]);

  /* ── reconstruct sections once portfolio is loaded ── */
  useEffect(() => {
    if (!portfolio) return;
    // Load vault docs to resolve names, then reconstruct
    loadVaultDocuments(userId)
      .then(docs => {
        setSections(reconstructSections(portfolio.type, portfolio.sections, docs as VaultDoc[]));
        setVaultDocs(docs as VaultDoc[]);
      })
      .catch(() => {
        setSections(reconstructSections(portfolio.type, portfolio.sections, []));
      });
  }, [portfolio]);

  /* ── ping backend on mount ── */
  useEffect(() => { pingBackend().catch(() => {}); }, []);

  /* ── vault modal: load docs ── */
  useEffect(() => {
    if (!vaultOpen || !userId) return;
    setVaultLoading(true);
    loadVaultDocuments(userId)
      .then(docs => setVaultDocs(docs as VaultDoc[]))
      .catch(() => setVaultDocs([]))
      .finally(() => setVaultLoading(false));
  }, [vaultOpen]);

  /* ── vault helpers ── */
  const openVault = (idx: number) => {
    setVaultSection(idx);
    setSelected(new Set(sections[idx].documents));
    setVaultOpen(true);
  };

  const applyVault = () => {
    if (vaultSection === null) return;
    const chosen = vaultDocs.filter(d => selected.has(d.id));
    setSections(prev => prev.map((s, i) =>
      i === vaultSection
        ? { ...s, documents: chosen.map(d => d.id), docNames: chosen.map(d => d.name) }
        : s,
    ));
    setVaultOpen(false);
  };

  /* ── section helpers ── */
  const toggle = (idx: number) =>
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, expanded: !s.expanded } : s));

  const setContent = (idx: number, val: string) =>
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, content: val } : s));

  const addItem = (idx: number) => {
    const val = (newItemRefs.current[idx] ?? '').trim();
    if (!val) return;
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, items: [...s.items, val] } : s));
    newItemRefs.current[idx] = '';
    setSections(prev => [...prev]);
  };

  const removeItem = (sIdx: number, iIdx: number) =>
    setSections(prev => prev.map((s, i) =>
      i === sIdx ? { ...s, items: s.items.filter((_, j) => j !== iIdx) } : s,
    ));

  const removeDoc = (sIdx: number, dIdx: number) =>
    setSections(prev => prev.map((s, i) =>
      i === sIdx
        ? { ...s,
            documents: s.documents.filter((_, j) => j !== dIdx),
            docNames:  s.docNames.filter((_, j) => j !== dIdx),
          }
        : s,
    ));

  /* ── save handler ── */
  const handleSave = async () => {
    if (!portfolioName.trim()) { setNameError('Portfolio name is required'); return; }
    if (!portfolio || !id)     return;
    setNameError(''); setApiError(''); setSaving(true);

    const sectionsPayload = sections.map(s => ({
      title:     s.title,
      content:   s.kind === 'list' ? s.items.join('\n') : s.content,
      documents: s.documents,
    }));

    // Also update localStorage immediately so the change is visible even if backend fails
    const updatedPortfolio: Portfolio = {
      ...portfolio,
      name:      portfolioName.trim(),
      sections:  sectionsPayload as Portfolio['sections'],
      updatedAt: new Date().toISOString(),
    };

    // Update local cache
    try {
      const key = `biovault_portfolios_cache_${userId}`;
      const cached: Portfolio[] = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = cached.findIndex(p => p.id === id);
      if (idx !== -1) cached[idx] = { ...cached[idx], ...updatedPortfolio };
      else cached.unshift(updatedPortfolio);
      localStorage.setItem(key, JSON.stringify(cached));
    } catch { /* ignore */ }

    try {
      await updatePortfolio(userId, id, {
        name:     portfolioName.trim(),
        sections: sectionsPayload as Portfolio['sections'],
      });
    } catch {
      // Backend failed — local update already saved, don't block the user
    }

    setDone(true);
    setTimeout(() => navigate('/portfolio'), 1600);
  };

  const typeId          = portfolio?.type ?? 'personal';
  const meta            = TYPE_META[typeId] ?? TYPE_META.personal;
  const Icon            = meta.icon;
  const sectionConfigs  = SECTIONS_BY_TYPE[typeId] ?? SECTIONS_BY_TYPE.personal;
  const cfgMap          = new Map(sectionConfigs.map(c => [c.title, c]));
  const totalDocs       = sections.reduce((n, s) => n + s.documents.length, 0);
  const totalItems      = sections.reduce((n, s) => n + s.items.length + (s.content ? 1 : 0), 0);

  /* ── loading screen ── */
  if (loadingPortfolio) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#07031a 0%,#0d0520 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <Loader2 size={40} color="#8b5cf6" style={{ animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#9ca3af', fontSize: 15 }}>Loading portfolio…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#07031a 0%,#0d0520 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
        <AlertCircle size={48} color="#f87171" />
        <p style={{ color: '#f87171', fontSize: 16, fontWeight: 700, textAlign: 'center' }}>Portfolio not found</p>
        <button onClick={() => navigate('/portfolio')} style={{ padding: '10px 24px', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 12, color: '#c4b5fd', fontWeight: 700, cursor: 'pointer' }}>
          Back to Portfolios
        </button>
      </div>
    );
  }

  /* ── success screen ── */
  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0d0520 0%,#130833 50%,#0d0520 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} style={{ textAlign: 'center', padding: 32 }}>
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
            style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 64px rgba(16,185,129,0.6)' }}
          >
            <CheckCircle size={44} color="#fff" />
          </motion.div>
          <p style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Changes Saved!</p>
          <p style={{ color: '#9ca3af', fontSize: 15 }}>Redirecting to your portfolios…</p>
        </motion.div>
      </div>
    );
  }

  /* ─── main render ─── */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#07031a 0%,#0d0520 30%,#130833 60%,#0d0520 100%)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -100, left: -80, width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(circle, ${meta.glow} 0%, transparent 70%)`, filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* header */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px 16px', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={20} color="#c4b5fd" />
        </button>
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0, flex: 1, textAlign: 'center' }}>Edit Portfolio</h1>
        <div style={{ width: 42 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, padding: '0 16px 110px' }}>

        {/* type badge */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(135deg,rgba(20,8,55,0.9),rgba(15,5,40,0.95))', border: `1px solid ${meta.border}`, borderRadius: 18, padding: '14px 16px', marginBottom: 18, boxShadow: `0 0 32px ${meta.glow}` }}
        >
          <div style={{ width: 46, height: 46, borderRadius: 13, background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={22} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#9ca3af', fontSize: 11, margin: 0, fontWeight: 600, letterSpacing: 0.5 }}>EDITING</p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, margin: '2px 0 0' }}>{meta.label}</p>
          </div>
          {(totalDocs > 0 || totalItems > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
              {totalDocs > 0 && <span style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700, background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 20, padding: '2px 8px' }}>{totalDocs} docs</span>}
              {totalItems > 0 && <span style={{ color: '#34d399', fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '2px 8px' }}>{totalItems} entries</span>}
            </div>
          )}
        </motion.div>

        {/* portfolio name */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} style={{ marginBottom: 20 }}>
          <p style={{ color: '#e2d9f3', fontSize: 13, fontWeight: 700, marginBottom: 8, letterSpacing: 0.3 }}>PORTFOLIO NAME *</p>
          <input
            placeholder={`e.g. My ${meta.label}`}
            value={portfolioName}
            onChange={e => { setPortfolioName(e.target.value); setNameError(''); }}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(20,8,55,0.8)',
              border: `1.5px solid ${nameError ? 'rgba(239,68,68,0.6)' : 'rgba(139,92,246,0.3)'}`,
              borderRadius: 14, padding: '14px 16px',
              color: '#f0e9ff', fontSize: 16, fontWeight: 600, outline: 'none',
            }}
          />
          {nameError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <AlertCircle size={13} color="#f87171" />
              <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{nameError}</p>
            </div>
          )}
        </motion.div>

        {/* sections heading */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ color: '#9ca3af', fontSize: 12, fontWeight: 700, margin: 0, letterSpacing: 0.8 }}>SECTIONS ({sections.length})</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa' }} />
              <span style={{ color: '#9ca3af', fontSize: 11 }}>Text</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f472b6' }} />
              <span style={{ color: '#9ca3af', fontSize: 11 }}>Vault</span>
            </div>
          </div>
        </div>

        {/* section cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {sections.map((sec, idx) => {
            const cfg       = cfgMap.get(sec.title) ?? sectionConfigs[0];
            const isVault   = sec.kind === 'vault';
            const dotColor  = isVault ? '#f472b6' : '#a78bfa';

            return (
              <motion.div
                key={sec.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + idx * 0.03 }}
                style={{
                  background: 'linear-gradient(135deg,rgba(20,8,55,0.88),rgba(13,5,32,0.92))',
                  border: `1px solid ${sec.expanded ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.15)'}`,
                  borderRadius: 16, overflow: 'hidden',
                  boxShadow: sec.expanded ? '0 0 24px rgba(139,92,246,0.12)' : 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {/* section header */}
                <button
                  onClick={() => toggle(idx)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${cfg.color}22,${cfg.color}11)`, border: `1px solid ${cfg.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <cfg.icon size={16} color={cfg.color} />
                  </div>
                  <span style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 14, flex: 1 }}>{sec.title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {sec.documents.length > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#f472b6', background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.25)', borderRadius: 20, padding: '2px 7px' }}>
                        {sec.documents.length} file{sec.documents.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {sec.items.length > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 20, padding: '2px 7px' }}>
                        {sec.items.length}
                      </span>
                    )}
                    {sec.content && !sec.items.length && <span style={{ fontSize: 12, color: '#6b7280' }}>✍</span>}
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                    {sec.expanded ? <ChevronUp size={17} color="#6b7280" /> : <ChevronDown size={17} color="#6b7280" />}
                  </div>
                </button>

                {/* section body */}
                <AnimatePresence>
                  {sec.expanded && (
                    <motion.div
                      key="body"
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 14px 16px', borderTop: '1px solid rgba(139,92,246,0.1)' }}>

                        {/* TEXT */}
                        {sec.kind === 'text' && (
                          <textarea
                            placeholder={cfg.placeholder}
                            value={sec.content}
                            onChange={e => setContent(idx, e.target.value)}
                            rows={4}
                            style={{ width: '100%', boxSizing: 'border-box', marginTop: 12, background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 11, padding: '11px 13px', color: '#e5e7eb', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                          />
                        )}

                        {/* LIST */}
                        {sec.kind === 'list' && (
                          <div style={{ marginTop: 12 }}>
                            {sec.items.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                                {sec.items.map((item, iIdx) => (
                                  <div key={iIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(139,92,246,0.09)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 10, padding: '9px 11px' }}>
                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, marginTop: 6, flexShrink: 0 }} />
                                    <span style={{ color: '#e5e7eb', fontSize: 13, flex: 1, lineHeight: 1.5 }}>{item}</span>
                                    <button onClick={() => removeItem(idx, iIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                      <Trash2 size={13} color="#f87171" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                placeholder={cfg.placeholder}
                                defaultValue=""
                                key={`${idx}-${sec.items.length}`}
                                onChange={e => { newItemRefs.current[idx] = e.target.value; }}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(idx); } }}
                                style={{ flex: 1, background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.22)', borderRadius: 10, padding: '10px 12px', color: '#e5e7eb', fontSize: 14, outline: 'none' }}
                              />
                              <button onClick={() => addItem(idx)} style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${cfg.color}33,${cfg.color}22)`, border: `1px solid ${cfg.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                <Plus size={16} color={cfg.color} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* VAULT */}
                        {sec.kind === 'vault' && (
                          <div style={{ marginTop: 12 }}>
                            {sec.docNames.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                                {sec.docNames.map((name, dIdx) => (
                                  <div key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.22)', borderRadius: 10, padding: '8px 11px' }}>
                                    {docIcon(name)}
                                    <span style={{ color: '#e5e7eb', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                    <button onClick={() => removeDoc(idx, dIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                      <X size={14} color="#f87171" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button
                              onClick={() => openVault(idx)}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 0', background: 'rgba(244,114,182,0.08)', border: '1.5px dashed rgba(244,114,182,0.4)', borderRadius: 12, color: '#f472b6', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                            >
                              <Paperclip size={15} />
                              {sec.docNames.length > 0 ? 'Change Vault Files' : 'Attach from Vault'}
                            </button>
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

        {/* api error */}
        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 14, padding: '13px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}
            >
              <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fca5a5', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>Save failed</p>
                <p style={{ color: '#f87171', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{apiError}</p>
              </div>
              <button onClick={() => setApiError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <X size={14} color="#f87171" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* save button */}
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '17px 0',
            background: saving ? 'rgba(124,58,237,0.35)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            border: 'none', borderRadius: 16,
            color: '#fff', fontWeight: 800, fontSize: 17,
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: saving ? 'none' : '0 0 32px rgba(124,58,237,0.55),0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {saving
            ? <><Loader2 size={20} color="#fff" style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</>
            : <><Save size={20} color="#fff" /> Save Changes</>
          }
        </motion.button>
      </div>

      {/* ══════════════ Vault Selector Modal ══ */}
      <AnimatePresence>
        {vaultOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setVaultOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', background: 'linear-gradient(180deg,#1a0a40,#0f0520)', borderRadius: '24px 24px 0 0', padding: '0 0 32px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            >
              {/* modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
                <h3 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: 0 }}>Select from Vault</h3>
                <button onClick={() => setVaultOpen(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={18} color="#9ca3af" />
                </button>
              </div>
              <p style={{ color: '#6b7280', fontSize: 12, margin: '6px 20px 16px', fontWeight: 600 }}>
                {selected.size} selected · tap to toggle
              </p>

              {/* doc list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
                {vaultLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Loader2 size={28} color="#8b5cf6" style={{ animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : vaultDocs.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: 32 }}>No documents in vault</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {vaultDocs.map(doc => {
                      const isSel = selected.has(doc.id);
                      return (
                        <button
                          key={doc.id}
                          onClick={() => setSelected(prev => {
                            const next = new Set(prev);
                            isSel ? next.delete(doc.id) : next.add(doc.id);
                            return next;
                          })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                            background: isSel ? 'rgba(139,92,246,0.22)' : 'rgba(255,255,255,0.04)',
                            border: `1.5px solid ${isSel ? 'rgba(139,92,246,0.55)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 13, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                        >
                          {docIcon(doc.name)}
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <p style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</p>
                          </div>
                          {isSel && <CheckCircle size={17} color="#a78bfa" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* confirm */}
              <div style={{ padding: '16px 16px 0' }}>
                <button
                  onClick={applyVault}
                  style={{ width: '100%', padding: '15px 0', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 0 24px rgba(124,58,237,0.5)' }}
                >
                  Attach {selected.size > 0 ? `${selected.size} File${selected.size > 1 ? 's' : ''}` : 'Files'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
