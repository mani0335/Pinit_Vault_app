import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CheckCircle, FileText, Image, File,
  ChevronDown, ChevronUp, Loader2, Paperclip, X,
  Plus, Trash2, FolderOpen, AlertCircle, Search,
} from 'lucide-react';
import { createPortfolio, pingBackend } from '../../lib/portfolioService';
import { loadVaultDocuments } from '../../lib/vaultService';
import { SECTIONS_BY_TYPE, TYPE_META } from '../../lib/portfolioSections';
import type { SectionConfig } from '../../lib/portfolioSections';
import type { Portfolio } from '../../types/Portfolio';

type PortfolioType = Portfolio['type'];

interface SectionData {
  title:     string;
  kind:      'text' | 'list' | 'vault';
  content:   string;
  items:     string[];
  documents: string[];
  docNames:  string[];
  expanded:  boolean;
}

interface VaultDoc {
  id:       string;
  name:     string;
  metadata: { size: number; original_name?: string };
  createdAt: string;
}

/* ── helpers ── */
function docIcon(name: string) {
  const n = (name ?? '').toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(n)) return <Image size={15} color="#22c55e" />;
  if (/\.pdf$/.test(n))                           return <FileText size={15} color="#ef4444" />;
  return <File size={15} color="#a78bfa" />;
}

function fmtBytes(b: number) {
  if (!b) return '';
  if (b < 1024)      return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

function makeSections(configs: SectionConfig[]): SectionData[] {
  return configs.map(c => ({
    title: c.title, kind: c.kind, content: '', items: [],
    documents: [], docNames: [], expanded: false,
  }));
}

/** Smart-match: returns true if doc name contains any keyword from the section config */
function docMatchesSection(docName: string, cfg: SectionConfig): boolean {
  const lower = docName.toLowerCase();
  const keywords = cfg.matchKeywords ?? [];
  return keywords.some(kw => kw && lower.includes(kw.toLowerCase()));
}

export default function PortfolioBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const typeId   = ((location.state as { type?: string } | null)?.type ?? 'personal') as string;
  const meta     = TYPE_META[typeId] ?? TYPE_META.personal;
  const Icon     = meta.icon;
  const userId   = localStorage.getItem('biovault_userId') ?? '';
  const sectionConfigs = SECTIONS_BY_TYPE[typeId] ?? SECTIONS_BY_TYPE.personal;

  /* ── form state ── */
  const [portfolioName, setPortfolioName] = useState('');
  const [nameError,     setNameError]     = useState('');
  const [sections,      setSections]      = useState<SectionData[]>(() => makeSections(sectionConfigs));
  const [creating,      setCreating]      = useState(false);
  const [done,          setDone]          = useState(false);
  const [apiError,      setApiError]      = useState('');
  const [createStatus,  setCreateStatus]  = useState('Creating…');

  /* ── vault modal state ── */
  const [vaultOpen,    setVaultOpen]    = useState(false);
  const [vaultSection, setVaultSection] = useState<number | null>(null);
  const [vaultDocs,    setVaultDocs]    = useState<VaultDoc[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [vaultSearch,  setVaultSearch]  = useState('');
  const [vaultTab,     setVaultTab]     = useState<'suggested' | 'all'>('suggested');

  const newItemRefs = useRef<Record<number, string>>({});

  useEffect(() => { pingBackend().catch(() => {}); }, []);

  useEffect(() => {
    if (!vaultOpen || !userId) return;
    setVaultLoading(true);
    setVaultSearch('');
    setVaultTab('suggested');
    loadVaultDocuments(userId)
      .then(docs => setVaultDocs(docs as VaultDoc[]))
      .catch(() => setVaultDocs([]))
      .finally(() => setVaultLoading(false));
  }, [vaultOpen, userId]);

  /* ── smart vault filtering ── */
  const { suggestedDocs, otherDocs } = useMemo(() => {
    if (vaultSection === null) return { suggestedDocs: [], otherDocs: vaultDocs };
    const cfg = sectionConfigs[vaultSection];
    const search = vaultSearch.toLowerCase();
    const filtered = search
      ? vaultDocs.filter(d => d.name.toLowerCase().includes(search))
      : vaultDocs;
    const suggested = filtered.filter(d => docMatchesSection(d.name, cfg));
    const other     = filtered.filter(d => !docMatchesSection(d.name, cfg));
    return { suggestedDocs: suggested, otherDocs: other };
  }, [vaultDocs, vaultSection, vaultSearch, sectionConfigs]);

  const displayedDocs = vaultTab === 'suggested' ? suggestedDocs : otherDocs;

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
        : s
    ));
    setVaultOpen(false);
  };

  const toggleDocSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

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
      i === sIdx ? { ...s, items: s.items.filter((_, j) => j !== iIdx) } : s
    ));

  const removeDoc = (sIdx: number, dIdx: number) =>
    setSections(prev => prev.map((s, i) =>
      i === sIdx ? {
        ...s,
        documents: s.documents.filter((_, j) => j !== dIdx),
        docNames: s.docNames.filter((_, j) => j !== dIdx),
      } : s
    ));

  /* ── create portfolio ── */
  const handleCreate = () => {
    if (!portfolioName.trim()) { setNameError('Portfolio name is required'); return; }
    setNameError(''); setApiError('');

    const uid = userId || localStorage.getItem('biovault_userId') || '';
    if (!uid) { setApiError('Session expired — please log in again.'); return; }

    const sectionsPayload = sections.map(s => ({
      title:     s.title,
      content:   s.kind === 'list' ? s.items.join('\n') : s.content,
      documents: s.documents,
    }));

    // ── Optimistic save: store immediately, navigate instantly ──────────────
    const tempId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const optimistic: Portfolio = {
      id:        tempId,
      name:      portfolioName.trim(),
      type:      typeId as PortfolioType,
      sections:  sectionsPayload as Portfolio['sections'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status:    'active',
      views:     0,
    };

    const cKey = `biovault_portfolios_cache_${uid}`;
    try {
      const cached: Portfolio[] = JSON.parse(localStorage.getItem(cKey) || '[]');
      cached.unshift(optimistic);
      localStorage.setItem(cKey, JSON.stringify(cached));
    } catch { /* ignore */ }

    // Show success animation then navigate
    setDone(true);
    setTimeout(() => navigate('/portfolio', { replace: true }), 1000);

    // ── Background server sync (non-blocking) ───────────────────────────────
    pingBackend().catch(() => {});
    createPortfolio(uid, {
      name:     portfolioName.trim(),
      type:     typeId as PortfolioType,
      sections: sectionsPayload as any,
      status:   'active',
    }).then(serverPortfolio => {
      // Replace the temp local entry with the real server-persisted portfolio
      try {
        const cached2: Portfolio[] = JSON.parse(localStorage.getItem(cKey) || '[]');
        const idx = cached2.findIndex(p => p.id === tempId);
        if (idx !== -1) cached2[idx] = serverPortfolio;
        else cached2.unshift(serverPortfolio);
        localStorage.setItem(cKey, JSON.stringify(cached2));
      } catch { /* ignore */ }
    }).catch(() => {
      // Optimistic entry stays — on next successful loadPortfolios the server
      // data becomes authoritative and replaces the temp entry.
    });
  };

  const totalDocs  = sections.reduce((n, s) => n + s.documents.length, 0);
  const totalItems = sections.reduce((n, s) => n + s.items.length + (s.content ? 1 : 0), 0);
  const vaultSectionsCfg = sectionConfigs.filter(c => c.kind === 'vault');
  const vaultFilled = sections.filter(s => s.kind === 'vault' && s.documents.length > 0).length;
  const currentVaultCfg = vaultSection !== null ? sectionConfigs[vaultSection] : null;

  /* ── success screen ── */
  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0d0520,#130833,#0d0520)', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} style={{ textAlign: 'center', padding: 32 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
            style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 64px rgba(16,185,129,0.6)' }}
          >
            <CheckCircle size={44} color="#fff" />
          </motion.div>
          <p style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Portfolio Created!</p>
          <p style={{ color: '#9ca3af', fontSize: 15 }}>Redirecting to your portfolios…</p>
        </motion.div>
      </div>
    );
  }

  /* ── main render ── */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#07031a,#0d0520,#130833,#0d0520)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

      {/* ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -100, left: -80, width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(circle,${meta.glow},transparent 70%)`, filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(79,70,229,0.12),transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* header */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', padding: 'calc(env(safe-area-inset-top, 0px) + 28px) 20px 16px', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={20} color="#c4b5fd" />
        </button>
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0, flex: 1, textAlign: 'center', letterSpacing: -0.3 }}>Portfolio Builder</h1>
        <div style={{ width: 42 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, padding: '0 16px 110px' }}>

        {/* type badge */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(135deg,rgba(20,8,55,0.9),rgba(15,5,40,0.95))', border: `1px solid ${meta.border}`, borderRadius: 18, padding: '14px 16px', marginBottom: 16, boxShadow: `0 0 32px ${meta.glow}` }}
        >
          <div style={{ width: 46, height: 46, borderRadius: 13, background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 16px ${meta.glow}` }}>
            <Icon size={22} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#9ca3af', fontSize: 11, margin: 0, fontWeight: 600, letterSpacing: 0.5 }}>PORTFOLIO TYPE</p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, margin: '2px 0 2px' }}>{meta.label}</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: 0 }}>{meta.description}</p>
          </div>
          {(totalDocs > 0 || totalItems > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
              {totalDocs > 0  && <span style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700, background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 20, padding: '2px 8px' }}>{totalDocs} docs</span>}
              {totalItems > 0 && <span style={{ color: '#34d399', fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '2px 8px' }}>{totalItems} entries</span>}
            </div>
          )}
        </motion.div>

        {/* vault completeness bar */}
        {vaultSectionsCfg.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            style={{ background: 'rgba(20,8,55,0.7)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600 }}>Document Vault</span>
              <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 700 }}>{vaultFilled} / {vaultSectionsCfg.length} sections filled</span>
            </div>
            <div style={{ height: 5, background: 'rgba(139,92,246,0.15)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#7c3aed,#06b6d4)', borderRadius: 3, width: `${vaultSectionsCfg.length > 0 ? (vaultFilled / vaultSectionsCfg.length) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
            </div>
          </motion.div>
        )}

        {/* portfolio name */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} style={{ marginBottom: 20 }}>
          <p style={{ color: '#e2d9f3', fontSize: 13, fontWeight: 700, marginBottom: 8, letterSpacing: 0.3 }}>PORTFOLIO NAME *</p>
          <input
            placeholder={`e.g. My ${meta.label}`}
            value={portfolioName}
            onChange={e => { setPortfolioName(e.target.value); setNameError(''); }}
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(20,8,55,0.8)', border: `1.5px solid ${nameError ? 'rgba(239,68,68,0.6)' : 'rgba(139,92,246,0.3)'}`, borderRadius: 14, padding: '14px 16px', color: '#f0e9ff', fontSize: 16, fontWeight: 600, outline: 'none' }}
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
          <p style={{ color: '#9ca3af', fontSize: 12, fontWeight: 700, margin: 0, letterSpacing: 0.8 }}>
            SECTIONS ({sections.length})
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {[['#a78bfa','Text/List'],['#f472b6','Vault']].map(([col,lbl]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: col }} />
                <span style={{ color: '#9ca3af', fontSize: 11 }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* section cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {sections.map((sec, idx) => {
            const cfg = sectionConfigs[idx];
            const isVault  = sec.kind === 'vault';
            const dotColor = isVault ? '#f472b6' : '#a78bfa';
            const hasFill  = sec.documents.length > 0 || sec.items.length > 0 || !!sec.content;

            return (
              <motion.div
                key={sec.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + idx * 0.03 }}
                style={{
                  background: 'linear-gradient(135deg,rgba(20,8,55,0.88),rgba(13,5,32,0.92))',
                  border: `1px solid ${sec.expanded ? 'rgba(139,92,246,0.4)' : hasFill ? `${cfg.color}33` : 'rgba(139,92,246,0.15)'}`,
                  borderRadius: 16, overflow: 'hidden',
                  boxShadow: sec.expanded ? '0 0 24px rgba(139,92,246,0.12)' : hasFill ? `0 0 12px ${cfg.color}18` : 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {/* section header */}
                <button onClick={() => toggle(idx)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cfg.color}22`, border: `1px solid ${cfg.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <cfg.icon size={17} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 14, display: 'block' }}>{sec.title}</span>
                    {cfg.hint && <span style={{ color: '#6b7280', fontSize: 11, display: 'block', marginTop: 1 }}>{cfg.hint}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
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
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor }} />
                    {sec.expanded ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
                  </div>
                </button>

                {/* section body */}
                <AnimatePresence>
                  {sec.expanded && (
                    <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
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
                              <button onClick={() => addItem(idx)} style={{ width: 40, height: 40, borderRadius: 10, background: `${cfg.color}33`, border: `1px solid ${cfg.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                <Plus size={16} color={cfg.color} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* VAULT */}
                        {sec.kind === 'vault' && (
                          <div style={{ marginTop: 12 }}>
                            {/* Expected document type chips */}
                            {cfg.expectedDocs && cfg.expectedDocs.length > 0 && (
                              <div style={{ marginBottom: 12 }}>
                                <p style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: 0.4 }}>EXPECTED DOCUMENTS</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                  {cfg.expectedDocs.map(doc => (
                                    <span key={doc} style={{ fontSize: 11, color: `${cfg.color}cc`, background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`, borderRadius: 20, padding: '3px 9px', fontWeight: 500 }}>
                                      {doc}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Attached docs */}
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

                            {/* Attach button */}
                            <button
                              onClick={() => openVault(idx)}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 0', background: 'rgba(244,114,182,0.08)', border: '1.5px dashed rgba(244,114,182,0.4)', borderRadius: 12, color: '#f472b6', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                            >
                              <Paperclip size={15} />
                              {sec.docNames.length > 0 ? `Change Files (${sec.docNames.length} attached)` : 'Attach from Vault'}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 14, padding: '13px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}
            >
              <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fca5a5', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>Creation failed</p>
                <p style={{ color: '#f87171', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{apiError}</p>
              </div>
              <button onClick={() => setApiError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <X size={14} color="#f87171" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* create button */}
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleCreate} disabled={creating}
          style={{ width: '100%', padding: '17px 0', background: creating ? 'rgba(124,58,237,0.35)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: 16, color: '#fff', fontWeight: 800, fontSize: 17, cursor: creating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: creating ? 'none' : '0 0 32px rgba(124,58,237,0.55)' }}
        >
          {creating
            ? <><Loader2 size={20} color="#fff" style={{ animation: 'spin 0.8s linear infinite' }} /> {createStatus}</>
            : <><CheckCircle size={20} color="#fff" /> Create Portfolio</>}
        </motion.button>
      </div>

      {/* ══════════════════════ Vault Selector Modal ══ */}
      <AnimatePresence>
        {vaultOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setVaultOpen(false)}
          >
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', background: 'linear-gradient(160deg,#13083a,#0a0520)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '24px 24px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 48px rgba(0,0,0,0.6)' }}
            >
              {/* drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(139,92,246,0.3)' }} />
              </div>

              {/* modal header */}
              <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 800, fontSize: 17, margin: 0 }}>Select from Vault</p>
                    {vaultSection !== null && (
                      <p style={{ color: '#9ca3af', fontSize: 12, margin: '3px 0 0' }}>
                        Section: <span style={{ color: '#c4b5fd', fontWeight: 600 }}>{sections[vaultSection]?.title}</span>
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {selected.size > 0 && (
                      <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 700, background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 20, padding: '3px 10px' }}>
                        {selected.size} selected
                      </span>
                    )}
                    <button onClick={() => setVaultOpen(false)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={16} color="#c4b5fd" />
                    </button>
                  </div>
                </div>

                {/* Expected docs chips */}
                {currentVaultCfg?.expectedDocs?.length && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, margin: '0 0 5px', letterSpacing: 0.4 }}>LOOKING FOR</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {currentVaultCfg.expectedDocs.map(d => {
                        const col = currentVaultCfg.color;
                        return (
                          <span key={d} style={{ fontSize: 11, color: `${col}cc`, background: `${col}15`, border: `1px solid ${col}30`, borderRadius: 20, padding: '2px 8px', fontWeight: 500 }}>{d}</span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Search bar */}
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="#6b7280" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    placeholder="Search vault documents…"
                    value={vaultSearch}
                    onChange={e => setVaultSearch(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, color: '#e5e7eb', fontSize: 13, outline: 'none' }}
                  />
                </div>

                {/* Suggested / All tabs */}
                {!vaultSearch && suggestedDocs.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {(['suggested', 'all'] as const).map(t => (
                      <button key={t} onClick={() => setVaultTab(t)}
                        style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                          background: vaultTab === t ? 'rgba(139,92,246,0.25)' : 'transparent',
                          borderColor: vaultTab === t ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.2)',
                          color: vaultTab === t ? '#c4b5fd' : '#6b7280',
                        }}
                      >
                        {t === 'suggested' ? `Suggested (${suggestedDocs.length})` : `Other (${otherDocs.length})`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* doc list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
                {vaultLoading && (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Loader2 size={30} color="#a78bfa" style={{ animation: 'spin 0.8s linear infinite', display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ color: '#9ca3af', fontSize: 13 }}>Loading vault…</p>
                  </div>
                )}

                {!vaultLoading && vaultDocs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <FolderOpen size={40} color="#374151" style={{ display: 'block', margin: '0 auto 14px' }} />
                    <p style={{ color: '#9ca3af', fontSize: 14, fontWeight: 600 }}>Vault is empty</p>
                    <p style={{ color: '#6b7280', fontSize: 13 }}>Upload documents to your Vault first.</p>
                  </div>
                )}

                {!vaultLoading && vaultDocs.length > 0 && displayedDocs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 32 }}>
                    <Search size={32} color="#374151" style={{ display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ color: '#9ca3af', fontSize: 13 }}>
                      {vaultSearch ? 'No docs match your search' : 'No suggested docs for this section — switch to Other'}
                    </p>
                    {!vaultSearch && vaultTab === 'suggested' && otherDocs.length > 0 && (
                      <button onClick={() => setVaultTab('all')}
                        style={{ marginTop: 10, padding: '6px 16px', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 20, color: '#c4b5fd', fontSize: 12, cursor: 'pointer' }}
                      >
                        Show all {vaultDocs.length} docs
                      </button>
                    )}
                  </div>
                )}

                {!vaultLoading && displayedDocs.map(doc => {
                  const isSel = selected.has(doc.id);
                  return (
                    <button key={doc.id}
                      onClick={() => toggleDocSelect(doc.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                        background: isSel ? 'rgba(124,58,237,0.22)' : 'rgba(20,8,50,0.6)',
                        border: `1px solid ${isSel ? 'rgba(124,58,237,0.55)' : 'rgba(139,92,246,0.12)'}`,
                        borderRadius: 13, marginBottom: 8, cursor: 'pointer', textAlign: 'left',
                        boxShadow: isSel ? '0 0 16px rgba(124,58,237,0.2)' : 'none', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(139,92,246,0.2)' }}>
                        {docIcon(doc.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#e5e7eb', fontSize: 14, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</p>
                        <p style={{ color: '#6b7280', fontSize: 12, margin: '2px 0 0' }}>{fmtBytes(doc.metadata?.size ?? 0)}</p>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${isSel ? '#7c3aed' : 'rgba(139,92,246,0.3)'}`, background: isSel ? '#7c3aed' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                        {isSel && <CheckCircle size={14} color="#fff" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* apply button */}
              <div style={{ padding: '12px 16px 28px' }}>
                <button
                  onClick={applyVault} disabled={selected.size === 0}
                  style={{ width: '100%', padding: '15px 0', background: selected.size > 0 ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(139,92,246,0.15)', border: 'none', borderRadius: 14, color: selected.size > 0 ? '#fff' : '#6b7280', fontWeight: 800, fontSize: 15, cursor: selected.size > 0 ? 'pointer' : 'not-allowed', boxShadow: selected.size > 0 ? '0 0 24px rgba(124,58,237,0.45)' : 'none' }}
                >
                  {selected.size > 0 ? `Attach ${selected.size} File${selected.size > 1 ? 's' : ''}` : 'Select files above'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder { color: #4b5563; }
        input:focus, textarea:focus { border-color: rgba(139,92,246,0.5) !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.12) !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 2px; }
      `}</style>
    </div>
  );
}
