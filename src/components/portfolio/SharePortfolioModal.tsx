import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Copy, Check, Clock, Shield, Eye, Download, Globe, Smartphone,
  Camera, Droplets, Link, AlertCircle, ChevronRight,
  Trash2, Lock, Hash, MapPin, Layers, RefreshCw, QrCode,
  Users, UserCheck, Mail, AtSign, Globe2
} from 'lucide-react';
import { generatePortfolioShare, revokePortfolioShare, getPortfolioShares } from '../../lib/portfolioService';
import type { PortfolioShareResult, PortfolioShare, PortfolioShareOptions } from '../../lib/portfolioService';
import type { PortfolioSection } from '../../types/Portfolio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  portfolioName: string;
  sections: PortfolioSection[];
}

type Tab = 'content' | 'access' | 'security' | 'invite' | 'links';
type AccessMode = 'public' | 'link_only' | 'invite_only' | 'private';

const EXPIRY_OPTIONS = [
  { label: '1 Hour', hours: 1 },
  { label: '24 Hours', hours: 24 },
  { label: '7 Days', hours: 168 },
  { label: '30 Days', hours: 720 },
  { label: 'Never', hours: null },
];

const ACCESS_MODES: { value: AccessMode; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'public',
    label: 'Public',
    desc: 'Anyone with the link can access',
    icon: <Globe2 className="w-4 h-4 text-green-400" />,
  },
  {
    value: 'link_only',
    label: 'Link Only',
    desc: 'Only people with the exact link',
    icon: <Link className="w-4 h-4 text-blue-400" />,
  },
  {
    value: 'invite_only',
    label: 'Invite Only',
    desc: 'Restricted to specific emails / usernames',
    icon: <UserCheck className="w-4 h-4 text-purple-400" />,
  },
  {
    value: 'private',
    label: 'Private',
    desc: 'Link is disabled — no one can access',
    icon: <Lock className="w-4 h-4 text-red-400" />,
  },
];

export default function SharePortfolioModal({ isOpen, onClose, portfolioId, portfolioName, sections }: Props) {
  const [tab, setTab] = useState<Tab>('content');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PortfolioShareResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [existingShares, setExistingShares] = useState<PortfolioShare[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Content
  const [shareAll, setShareAll] = useState(true);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  // Access
  const [accessMode, setAccessMode] = useState<AccessMode>('link_only');
  const [viewOnly, setViewOnly] = useState(true);
  const [expiryHours, setExpiryHours] = useState<number | null>(24);
  const [customExpiry, setCustomExpiry] = useState('');
  const [useCustomExpiry, setUseCustomExpiry] = useState(false);
  const [viewLimitEnabled, setViewLimitEnabled] = useState(false);
  const [viewLimit, setViewLimit] = useState('10');
  const [password, setPassword] = useState('');
  const [passwordEnabled, setPasswordEnabled] = useState(false);

  // Security
  const [watermark, setWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('Confidential — Shared Copy');
  const [screenshotProtection, setScreenshotProtection] = useState(false);
  const [deviceBound, setDeviceBound] = useState(false);
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [allowedCountries, setAllowedCountries] = useState('');

  // Invite
  const [emailInput, setEmailInput] = useState('');
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [usernameInput, setUsernameInput] = useState('');
  const [allowedUsernames, setAllowedUsernames] = useState<string[]>([]);

  const toggleSection = (title: string) =>
    setSelectedSections(prev =>
      prev.includes(title) ? prev.filter(s => s !== title) : [...prev, title]
    );

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (e && !allowedEmails.includes(e)) setAllowedEmails(prev => [...prev, e]);
    setEmailInput('');
  };

  const addUsername = () => {
    const u = usernameInput.trim();
    if (u && !allowedUsernames.includes(u)) setAllowedUsernames(prev => [...prev, u]);
    setUsernameInput('');
  };

  const effectiveExpiry = useCustomExpiry ? (parseInt(customExpiry) || null) : expiryHours;
  const effectiveSections = shareAll ? null : selectedSections.length > 0 ? selectedSections : null;

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setResult(null);
    setShowQR(false);

    try {
      const countriesList = geoEnabled && allowedCountries.trim()
        ? allowedCountries.split(',').map(c => c.trim()).filter(Boolean)
        : null;

      const opts: PortfolioShareOptions = {
        portfolioId,
        expiryHours: effectiveExpiry,
        viewOnly,
        allowedSections: effectiveSections,
        viewLimit: viewLimitEnabled ? (parseInt(viewLimit) || 10) : null,
        watermark,
        watermarkText: watermark ? watermarkText : undefined,
        screenshotProtection,
        allowedCountries: countriesList,
        allowedCities: null,
        deviceBound,
        password: passwordEnabled && password ? password : undefined,
        accessMode,
        allowedEmails: accessMode === 'invite_only' && allowedEmails.length > 0 ? allowedEmails : null,
        allowedUsernames: accessMode === 'invite_only' && allowedUsernames.length > 0 ? allowedUsernames : null,
      };

      const res = await generatePortfolioShare(opts);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate share link');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (result?.shareLink) {
      navigator.clipboard.writeText(result.shareLink).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLoadShares = async () => {
    setLoadingShares(true);
    try {
      const shares = await getPortfolioShares(portfolioId);
      setExistingShares(shares);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleRevoke = async (token: string) => {
    setRevoking(token);
    try {
      await revokePortfolioShare(portfolioId, token);
      setExistingShares(prev => prev.map(s =>
        s.token === token ? { ...s, isActive: false } : s
      ));
    } catch (e) {
      console.error('Revoke failed:', e);
    } finally {
      setRevoking(null);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setCopied(false);
    setShowQR(false);
  };

  if (!isOpen) return null;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'content', label: 'Content', icon: Layers },
    { id: 'access', label: 'Access', icon: Clock },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'invite', label: 'Invite', icon: Users },
    { id: 'links', label: 'Links', icon: Link },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 rounded-3xl w-full max-w-lg shadow-2xl shadow-purple-900/20 overflow-hidden max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute inset-0 rounded-3xl ring-1 ring-purple-500/20 pointer-events-none" />

          {/* Header */}
          <div className="relative p-6 pb-0">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-purple-500/20">
                    <Shield className="w-4 h-4 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Secure Share</h2>
                </div>
                <p className="text-xs text-slate-400 pl-8">{portfolioName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-700/60 rounded-xl transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 bg-slate-800/60 rounded-xl p-1 mb-1 overflow-x-auto">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setTab(id);
                    if (id === 'links') handleLoadShares();
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-w-0 ${
                    tab === id
                      ? 'bg-purple-500/30 text-purple-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4">

            {/* ── CONTENT TAB ── */}
            {tab === 'content' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">Choose what to include in the shared link</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShareAll(true)}
                    className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                      shareAll ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    Entire Portfolio
                  </button>
                  <button
                    onClick={() => setShareAll(false)}
                    className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                      !shareAll ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    Select Sections
                  </button>
                </div>
                {!shareAll && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">Pick which sections to share:</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {sections.map(section => (
                        <button
                          key={section.title}
                          onClick={() => toggleSection(section.title)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${
                            selectedSections.includes(section.title)
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                              : 'bg-slate-800/40 border-slate-700/40 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <span>{section.title}</span>
                          <span className="text-xs opacity-60">{section.documents?.length ?? 0} docs</span>
                        </button>
                      ))}
                      {sections.length === 0 && (
                        <p className="text-xs text-slate-500 text-center py-4">No sections in this portfolio</p>
                      )}
                    </div>
                    {!shareAll && selectedSections.length === 0 && (
                      <p className="text-xs text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" /> Select at least one section
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── ACCESS TAB ── */}
            {tab === 'access' && (
              <div className="space-y-5">
                {/* Access Mode */}
                <div>
                  <p className="text-xs text-slate-400 mb-2 font-medium">Who Can Access</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ACCESS_MODES.map(mode => (
                      <button
                        key={mode.value}
                        onClick={() => setAccessMode(mode.value)}
                        className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-all ${
                          accessMode === mode.value
                            ? 'bg-purple-500/20 border-purple-500/50'
                            : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600'
                        }`}
                      >
                        <span className="mt-0.5">{mode.icon}</span>
                        <div>
                          <p className={`text-xs font-semibold ${accessMode === mode.value ? 'text-purple-300' : 'text-slate-300'}`}>{mode.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-tight">{mode.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* View mode */}
                <div>
                  <p className="text-xs text-slate-400 mb-2 font-medium">Download Permission</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewOnly(true)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                        viewOnly ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <Eye className="w-4 h-4" /> View Only
                    </button>
                    <button
                      onClick={() => setViewOnly(false)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                        !viewOnly ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <Download className="w-4 h-4" /> Download OK
                    </button>
                  </div>
                </div>

                {/* Expiry */}
                <div>
                  <p className="text-xs text-slate-400 mb-2 font-medium flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Link Expiry
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {EXPIRY_OPTIONS.map(opt => (
                      <button
                        key={String(opt.hours)}
                        onClick={() => { setExpiryHours(opt.hours); setUseCustomExpiry(false); }}
                        className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${
                          !useCustomExpiry && expiryHours === opt.hours
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                            : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setUseCustomExpiry(true)}
                      className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${
                        useCustomExpiry ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {useCustomExpiry && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="1" placeholder="Hours..."
                        value={customExpiry} onChange={e => setCustomExpiry(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                      />
                      <span className="text-xs text-slate-400">hours</span>
                    </div>
                  )}
                </div>

                {/* View limit */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                      <Hash className="w-3 h-3" /> View Limit
                    </p>
                    <Toggle value={viewLimitEnabled} onChange={setViewLimitEnabled} />
                  </div>
                  {viewLimitEnabled && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="1" placeholder="Max views..."
                        value={viewLimit} onChange={e => setViewLimit(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                      />
                      <span className="text-xs text-slate-400">views max</span>
                    </div>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                      <Lock className="w-3 h-3" /> Password Protection
                    </p>
                    <Toggle value={passwordEnabled} onChange={setPasswordEnabled} />
                  </div>
                  {passwordEnabled && (
                    <input
                      type="password" placeholder="Enter password..."
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                    />
                  )}
                </div>
              </div>
            )}

            {/* ── SECURITY TAB ── */}
            {tab === 'security' && (
              <div className="space-y-4">
                <SecurityOption
                  icon={<Droplets className="w-4 h-4 text-blue-400" />}
                  label="Watermark"
                  description="Overlay a watermark on all shared documents"
                  enabled={watermark}
                  onToggle={setWatermark}
                >
                  {watermark && (
                    <input
                      type="text" value={watermarkText}
                      onChange={e => setWatermarkText(e.target.value)}
                      placeholder="Watermark text..."
                      className="w-full mt-2 px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                    />
                  )}
                </SecurityOption>

                <SecurityOption
                  icon={<Camera className="w-4 h-4 text-orange-400" />}
                  label="Screenshot Protection"
                  description="Blur overlay on screenshot attempts"
                  enabled={screenshotProtection}
                  onToggle={setScreenshotProtection}
                />

                <SecurityOption
                  icon={<Smartphone className="w-4 h-4 text-green-400" />}
                  label="Device-Bound Access"
                  description="Only first-accessed device can open it"
                  enabled={deviceBound}
                  onToggle={setDeviceBound}
                />

                <SecurityOption
                  icon={<MapPin className="w-4 h-4 text-red-400" />}
                  label="Location Restriction"
                  description="Allow access only from specific countries"
                  enabled={geoEnabled}
                  onToggle={setGeoEnabled}
                >
                  {geoEnabled && (
                    <input
                      type="text" value={allowedCountries}
                      onChange={e => setAllowedCountries(e.target.value)}
                      placeholder="IN, US, GB (comma-separated country codes)"
                      className="w-full mt-2 px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                    />
                  )}
                </SecurityOption>

                <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <Globe className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-purple-300">
                    All restrictions are enforced server-side on every access globally.
                  </p>
                </div>
              </div>
            )}

            {/* ── INVITE TAB ── */}
            {tab === 'invite' && (
              <div className="space-y-5">
                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <UserCheck className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-300">
                    When set to <span className="font-semibold">Invite Only</span> mode (Access tab), only listed emails/usernames can view this share. The viewer must be logged in to verify their identity.
                  </p>
                </div>

                {accessMode !== 'invite_only' && (
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-300">
                      Switch Access Mode to <strong>Invite Only</strong> in the Access tab to enforce this list.
                    </p>
                  </div>
                )}

                {/* Allowed Emails */}
                <div>
                  <p className="text-xs text-slate-400 mb-2 font-medium flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /> Allowed Email Addresses
                  </p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email" placeholder="user@example.com"
                      value={emailInput} onChange={e => setEmailInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addEmail()}
                      className="flex-1 px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                    />
                    <button
                      onClick={addEmail}
                      className="px-4 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-xl text-sm hover:bg-purple-500/30 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {allowedEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {allowedEmails.map(email => (
                        <span key={email} className="flex items-center gap-1 px-2.5 py-1 bg-slate-700/60 text-slate-300 rounded-lg text-xs">
                          {email}
                          <button onClick={() => setAllowedEmails(prev => prev.filter(e => e !== email))} className="hover:text-red-400 transition-colors ml-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {allowedEmails.length === 0 && (
                    <p className="text-xs text-slate-600 mt-1">No emails added — all emails allowed</p>
                  )}
                </div>

                {/* Allowed Usernames */}
                <div>
                  <p className="text-xs text-slate-400 mb-2 font-medium flex items-center gap-1.5">
                    <AtSign className="w-3 h-3" /> Allowed Usernames
                  </p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text" placeholder="@username"
                      value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addUsername()}
                      className="flex-1 px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                    />
                    <button
                      onClick={addUsername}
                      className="px-4 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-xl text-sm hover:bg-purple-500/30 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {allowedUsernames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {allowedUsernames.map(uname => (
                        <span key={uname} className="flex items-center gap-1 px-2.5 py-1 bg-slate-700/60 text-slate-300 rounded-lg text-xs">
                          @{uname}
                          <button onClick={() => setAllowedUsernames(prev => prev.filter(u => u !== uname))} className="hover:text-red-400 transition-colors ml-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {allowedUsernames.length === 0 && (
                    <p className="text-xs text-slate-600 mt-1">No usernames added — all usernames allowed</p>
                  )}
                </div>
              </div>
            )}

            {/* ── ACTIVE LINKS TAB ── */}
            {tab === 'links' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Your active share links</p>
                  <button onClick={handleLoadShares} className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors">
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loadingShares ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingShares && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                )}

                {!loadingShares && existingShares.length === 0 && (
                  <div className="text-center py-8">
                    <Link className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No share links yet</p>
                    <p className="text-xs text-slate-600 mt-1">Generate one on the other tabs</p>
                  </div>
                )}

                {existingShares.map(share => (
                  <div
                    key={share.token}
                    className={`p-3 rounded-xl border ${
                      share.isActive ? 'bg-slate-800/40 border-slate-700/40' : 'bg-slate-900/40 border-slate-800/40 opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${share.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                          <span className="text-xs font-medium text-slate-300 truncate">{share.shareLink}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          {share.viewsUsed > 0 && <span>{share.viewsUsed} views</span>}
                          {share.viewLimit && <span>/ {share.viewLimit} max</span>}
                          {share.expiresAt && <span>Expires {new Date(share.expiresAt).toLocaleDateString()}</span>}
                          {!share.isActive && <span className="text-red-400">Revoked</span>}
                        </div>
                      </div>
                      {share.isActive && (
                        <button
                          onClick={() => handleRevoke(share.token)}
                          disabled={revoking === share.token}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-slate-500 hover:text-red-400 shrink-0"
                          title="Revoke"
                        >
                          {revoking === share.token
                            ? <div className="w-3.5 h-3.5 border border-red-400/40 border-t-red-400 rounded-full animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {tab !== 'links' && (
            <div className="p-6 pt-3 border-t border-slate-700/40">
              {error && (
                <div className="mb-3 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              {result ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-green-300 truncate">{result.shareLink}</p>
                      {result.expiresAt && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Expires {new Date(result.expiresAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button onClick={handleCopy} className="p-1.5 hover:bg-green-500/20 rounded-lg transition-colors shrink-0">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>

                  {/* QR code panel */}
                  {showQR && result.shareLink && (
                    <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl">
                      <QRCodeSVG value={result.shareLink} size={160} level="H" includeMargin />
                      <p className="text-xs text-slate-600 text-center">Scan to open the portfolio</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={() => setShowQR(v => !v)}
                      className="px-4 py-2.5 bg-slate-700/50 text-slate-300 rounded-xl text-sm hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                      title="Show QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2.5 bg-slate-700/50 text-slate-300 rounded-xl text-sm hover:bg-slate-700 transition-colors"
                    >
                      New
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={generating || (!shareAll && selectedSections.length === 0)}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Generate Secure Link
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-purple-500' : 'bg-slate-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function SecurityOption({
  icon, label, description, enabled, onToggle, children,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={`p-3.5 rounded-xl border transition-all ${enabled ? 'bg-slate-800/60 border-slate-600/60' : 'bg-slate-800/30 border-slate-700/30'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5">{icon}</div>
          <div>
            <p className="text-sm font-medium text-slate-200">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
        <Toggle value={enabled} onChange={onToggle} />
      </div>
      {children}
    </div>
  );
}
