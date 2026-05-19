import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Edit, Share2, Trash2, FileText, Clock, Layers } from 'lucide-react';
import type { Portfolio } from '../../types/Portfolio';

interface Props {
  portfolio: Portfolio;
  onView:   (id: string) => void;
  onEdit:   (id: string) => void;
  onShare:  (id: string) => void;
  onDelete: (id: string) => void;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; glow: string; gradient: string }> = {
  personal:     { bg: 'rgba(6,182,212,0.1)',   text: '#22d3ee', border: 'rgba(6,182,212,0.25)',   glow: 'rgba(6,182,212,0.12)',  gradient: 'linear-gradient(135deg,#06b6d4,#3b82f6)' },
  academic:     { bg: 'rgba(139,92,246,0.1)',  text: '#a78bfa', border: 'rgba(139,92,246,0.25)',  glow: 'rgba(139,92,246,0.12)', gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)' },
  professional: { bg: 'rgba(16,185,129,0.1)',  text: '#34d399', border: 'rgba(16,185,129,0.25)',  glow: 'rgba(16,185,129,0.12)', gradient: 'linear-gradient(135deg,#10b981,#14b8a6)' },
  placement:    { bg: 'rgba(251,146,60,0.1)',  text: '#fb923c', border: 'rgba(251,146,60,0.25)',  glow: 'rgba(251,146,60,0.12)', gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  masters:      { bg: 'rgba(99,102,241,0.1)',  text: '#818cf8', border: 'rgba(99,102,241,0.25)',  glow: 'rgba(99,102,241,0.12)', gradient: 'linear-gradient(135deg,#6366f1,#a855f7)' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  active: { bg: 'rgba(34,197,94,0.1)',  text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  shared: { bg: 'rgba(59,130,246,0.1)', text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  draft:  { bg: 'rgba(107,114,128,0.1)',text: '#9ca3af', border: 'rgba(107,114,128,0.25)' },
};

const PortfolioCard: React.FC<Props> = ({ portfolio, onView, onEdit, onShare, onDelete }) => {
  const tc  = TYPE_COLORS[portfolio.type]   ?? TYPE_COLORS.personal;
  const sc  = STATUS_COLORS[portfolio.status ?? 'active'] ?? STATUS_COLORS.active;
  const docCount   = portfolio.sections.reduce((t, s) => t + ((s as {documents?: unknown[]}).documents?.length ?? 0), 0);
  const lastUpdate = portfolio.updatedAt || portfolio.createdAt;
  const dateLabel  = lastUpdate
    ? new Date(lastUpdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const isTemp = portfolio.id.startsWith('local_');

  const actions: { label: string; icon: React.ComponentType<{size?:number;color?:string}>; color: string; rgb: string; fn: () => void }[] = [
    { label: 'View',   icon: Eye,    color: '#22d3ee', rgb: '6,182,212',   fn: () => onView(portfolio.id)   },
    { label: 'Edit',   icon: Edit,   color: '#a78bfa', rgb: '139,92,246',  fn: () => onEdit(portfolio.id)   },
    { label: 'Share',  icon: Share2, color: '#4ade80', rgb: '74,222,128',  fn: () => onShare(portfolio.id)  },
    { label: 'Delete', icon: Trash2, color: '#f87171', rgb: '248,113,113', fn: () => onDelete(portfolio.id) },
  ];

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      style={{
        background: 'linear-gradient(135deg, rgba(18,7,48,0.95), rgba(11,4,30,0.98))',
        border: `1px solid ${tc.border}`,
        borderRadius: 20,
        padding: '16px',
        boxShadow: `0 4px 32px ${tc.glow}, 0 1px 0 rgba(255,255,255,0.04) inset`,
        borderLeft: `3px solid ${tc.text}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent glow line */}
      <div style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, background: `linear-gradient(90deg,transparent,${tc.text}40,transparent)` }} />

      {/* Type icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: tc.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 16px ${tc.glow}` }}>
          <Layers size={18} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ color: '#f0e9ff', fontWeight: 800, fontSize: 16, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: -0.3 }}>
            {portfolio.name}
          </h3>
          {isTemp && (
            <span style={{ color: '#f59e0b', fontSize: 10, fontWeight: 600 }}>⏳ Syncing to server…</span>
          )}
        </div>
      </div>

      {/* Type + Status badges */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`, textTransform: 'capitalize' }}>
          {portfolio.type}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, textTransform: 'capitalize' }}>
          {portfolio.status ?? 'Active'}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <FileText size={12} color="#4b5563" />
          <span style={{ color: '#c4b5fd', fontWeight: 700, fontSize: 13 }}>{docCount}</span>
          <span style={{ color: '#4b5563', fontSize: 12 }}>docs</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Layers size={12} color="#4b5563" />
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{portfolio.sections.length} sections</span>
        </div>
        {dateLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <Clock size={11} color="#374151" />
            <span style={{ color: '#374151', fontSize: 11 }}>{dateLabel}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 12 }} />

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {actions.map(({ label, icon: Icon, color, rgb, fn }) => (
          <button
            key={label}
            onClick={fn}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: '10px 4px', borderRadius: 13,
              background: `rgba(${rgb},0.07)`,
              border: `1px solid rgba(${rgb},0.15)`,
              cursor: 'pointer', transition: 'all 0.18s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = `rgba(${rgb},0.18)`;
              (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${rgb},0.4)`;
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 12px rgba(${rgb},0.25)`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = `rgba(${rgb},0.07)`;
              (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${rgb},0.15)`;
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            <Icon size={16} color={color} />
            <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.3 }}>{label.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default PortfolioCard;
