import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderOpen, Search } from 'lucide-react';
import PortfolioCard from '../../components/portfolio/PortfolioCard';
import SharePortfolioModal from '../../components/portfolio/SharePortfolioModal';
import { loadPortfolios, deletePortfolio } from '../../lib/portfolioService';
import type { Portfolio } from '../../types/Portfolio';

interface PortfolioHomeProps {
  userId?: string | null;
}

export default function PortfolioHome({ userId: propUserId }: PortfolioHomeProps) {
  console.log('🚀 PortfolioHome: Component MOUNTED with userId:', propUserId);
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(propUserId || null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<Portfolio | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const hasFetched = useRef(false);

  async function fetchPortfolios() {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      console.log('📦 Loading portfolios for userId:', userId);
      const loaded = await loadPortfolios(userId);
      console.log('✅ Portfolios loaded:', loaded.length);
      setPortfolios(loaded);
    } catch (err) {
      console.error('❌ Failed to load portfolios:', err);
      setError('Failed to load portfolios. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasFetched.current) return;

    console.log('🚀 PortfolioHome: useEffect triggered');
    console.log('🚀 PortfolioHome: Current userId state:', userId);
    console.log('🚀 PortfolioHome: Prop userId:', propUserId);

    // Use prop userId if available, otherwise try localStorage
    const effectiveUserId = propUserId || localStorage.getItem('biovault_userId');
    console.log('🚀 PortfolioHome: Effective userId:', effectiveUserId);

    if (effectiveUserId) {
      console.log('✅ PortfolioHome: userId found, setting state and fetching');
      setUserId(effectiveUserId);
      fetchPortfolios();
    } else {
      console.log('❌ PortfolioHome: No userId found, stopping loading');
      // No userId found, stop loading
      setLoading(false);
      setError('Please login to view portfolios');
    }

    hasFetched.current = true;
  }, [propUserId]);

  const handleView = (id: string) => {
    console.log('View portfolio:', id);
    // Navigate to portfolio view
  };

  const handleEdit = (id: string) => {
    console.log('Edit portfolio:', id);
    // Navigate to portfolio edit
  };

  const handleShare = (id: string) => {
    const portfolio = portfolios.find(p => p.id === id);
    if (portfolio) setShowShareModal(portfolio);
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    
    try {
      await deletePortfolio(userId, id);
      setPortfolios(prev => prev.filter(p => p.id !== id));
      setShowDeleteModal(null);
    } catch (err) {
      console.error('Failed to delete portfolio:', err);
      setError('Failed to delete portfolio');
    }
  };

  const handleCreate = () => {
    navigate('/portfolio/choose-type');
  };

  // Filter portfolios
  const filteredPortfolios = portfolios.filter(portfolio => {
    const matchesSearch = portfolio.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || portfolio.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Skeleton loader
  const SkeletonCard = () => (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-5 animate-pulse">
      <div className="h-6 bg-slate-700/50 rounded w-3/4 mb-4"></div>
      <div className="flex gap-2 mb-4">
        <div className="h-6 bg-slate-700/50 rounded-full w-20"></div>
        <div className="h-6 bg-slate-700/50 rounded-full w-16"></div>
      </div>
      <div className="h-4 bg-slate-700/50 rounded w-1/2"></div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Portfolio ✅ UPDATED</h1>
          <p className="text-slate-400">Manage and share your professional portfolios</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300">
            {error}
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search portfolios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-colors"
          >
            <option value="all">All Types</option>
            <option value="academic">Academic</option>
            <option value="placement">Placement</option>
            <option value="masters">Masters</option>
            <option value="professional">Professional</option>
            <option value="personal">Personal</option>
          </select>
        </div>

        {/* Portfolio Grid */}
        {filteredPortfolios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
              <FolderOpen className="w-12 h-12 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No portfolios yet</h3>
            <p className="text-slate-400 mb-6">Create your first portfolio to showcase your work</p>
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Portfolio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPortfolios.map((portfolio) => (
              <PortfolioCard
                key={portfolio.id}
                portfolio={portfolio}
                onView={handleView}
                onEdit={handleEdit}
                onShare={handleShare}
                onDelete={() => setShowDeleteModal(portfolio.id)}
              />
            ))}
          </div>
        )}

        {/* Floating Action Button */}
        <button
          onClick={handleCreate}
          className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-2xl hover:shadow-purple-500/25 transition-all flex items-center justify-center hover:scale-110"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Share Portfolio Modal */}
        {showShareModal && (
          <SharePortfolioModal
            isOpen={!!showShareModal}
            onClose={() => setShowShareModal(null)}
            portfolioId={showShareModal.id}
            portfolioName={showShareModal.name}
            sections={showShareModal.sections ?? []}
          />
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowDeleteModal(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-white mb-2">Delete Portfolio</h3>
                <p className="text-slate-400 mb-6">
                  Are you sure you want to delete "{portfolios.find(p => p.id === showDeleteModal)?.name}"? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(null)}
                    className="flex-1 px-4 py-3 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteModal)}
                    className="flex-1 px-4 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
