import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Image, Video, BookOpen, Award, Code, Briefcase, Eye, Calendar, Share2, Edit } from 'lucide-react';
import { loadPortfolios } from '../../lib/portfolioService';
import { loadVaultDocuments } from '../../lib/vaultService';
import type { Portfolio, VaultDocument } from '../../types/Portfolio';

export default function PortfolioViewer() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const userId = localStorage.getItem('biovault_userId');
      if (!userId || !id) { setError('Portfolio not found'); setLoading(false); return; }

      try {
        const [portfolios, docs] = await Promise.all([
          loadPortfolios(userId),
          loadVaultDocuments(userId),
        ]);
        const found = portfolios.find(p => p.id === id);
        if (!found) { setError('Portfolio not found'); setLoading(false); return; }
        setPortfolio(found);
        setVaultDocs(docs);
      } catch {
        setError('Failed to load portfolio');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const getDocName = (docId: string) => {
    const doc = vaultDocs.find(d => d.id === docId);
    return doc?.name ?? doc?.fileName ?? docId;
  };

  const getDocIcon = (docId: string) => {
    const doc = vaultDocs.find(d => d.id === docId);
    const name = (doc?.name ?? '').toLowerCase();
    if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return Image;
    if (name.match(/\.(mp4|mov|avi)$/)) return Video;
    return FileText;
  };

  const getSectionIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('resume') || t.includes('cv')) return FileText;
    if (t.includes('education') || t.includes('academic')) return BookOpen;
    if (t.includes('cert') || t.includes('achievement')) return Award;
    if (t.includes('project')) return Code;
    if (t.includes('experience') || t.includes('work')) return Briefcase;
    return FileText;
  };

  const getSectionColor = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('resume') || t.includes('cv')) return 'from-blue-500 to-cyan-500';
    if (t.includes('education') || t.includes('academic')) return 'from-purple-500 to-pink-500';
    if (t.includes('cert') || t.includes('achievement')) return 'from-green-500 to-emerald-500';
    if (t.includes('project')) return 'from-orange-500 to-red-500';
    if (t.includes('experience') || t.includes('work')) return 'from-indigo-500 to-purple-500';
    return 'from-slate-500 to-gray-500';
  };

  const typeBadgeColor = (type: string) => {
    const map: Record<string, string> = {
      academic: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      placement: 'bg-green-500/20 text-green-400 border-green-500/30',
      masters: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      professional: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      personal: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    };
    return map[type] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading portfolio…</p>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error ?? 'Portfolio not found'}</p>
          <button onClick={() => navigate('/portfolio')} className="px-6 py-2 bg-slate-700 text-white rounded-xl">
            Back to Portfolios
          </button>
        </div>
      </div>
    );
  }

  const totalDocs = portfolio.sections?.reduce((acc, s) => acc + (s.documents?.length ?? 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/portfolio')} className="p-3 hover:bg-slate-800/50 rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <h1 className="text-xl font-bold text-white">Portfolio Details</h1>
          <button
            onClick={() => navigate(`/portfolio/edit/${portfolio.id}`)}
            className="p-3 hover:bg-slate-800/50 rounded-xl transition-colors"
          >
            <Edit className="w-5 h-5 text-purple-400" />
          </button>
        </div>

        {/* Portfolio Card */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{portfolio.name}</h2>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border capitalize ${typeBadgeColor(portfolio.type)}`}>
                {portfolio.type}
              </span>
            </div>
            {portfolio.status && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                portfolio.status === 'active' ? 'bg-green-500/20 text-green-400' :
                portfolio.status === 'shared' ? 'bg-blue-500/20 text-blue-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {portfolio.status}
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="flex gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {portfolio.views ?? 0} views
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {totalDocs} documents
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(portfolio.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4 mb-8">
          {(portfolio.sections ?? []).map((section) => {
            const SectionIcon = getSectionIcon(section.title);
            const color = getSectionColor(section.title);
            return (
              <div key={section.title} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center`}>
                    <SectionIcon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-white capitalize">{section.title}</h3>
                  <span className="text-xs text-slate-400 ml-auto">{section.documents?.length ?? 0} docs</span>
                </div>

                {section.documents?.length > 0 ? (
                  <div className="space-y-2">
                    {section.documents.map((docId) => {
                      const DocIcon = getDocIcon(docId);
                      return (
                        <div key={docId} className="flex items-center gap-2 bg-slate-900/40 rounded-lg px-3 py-2">
                          <DocIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-300 truncate">{getDocName(docId)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-2">No documents in this section</p>
                )}
              </div>
            );
          })}

          {(!portfolio.sections || portfolio.sections.length === 0) && (
            <p className="text-slate-400 text-center py-8">No sections in this portfolio</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/portfolio/edit/${portfolio.id}`)}
            className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Portfolio
          </button>
          <button
            onClick={() => navigate('/portfolio')}
            className="px-6 py-3 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
