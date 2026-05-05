import React from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Eye, Edit, Share2, Trash2 } from 'lucide-react';
import type { Portfolio } from '../../types/Portfolio';

interface Props {
  portfolio: Portfolio;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
}

const PortfolioCard: React.FC<Props> = ({ portfolio, onView, onEdit, onShare, onDelete }) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'shared':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'draft':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'placement':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'masters':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'professional':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'academic':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'personal':
        return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getDocumentCount = () => {
    return portfolio.sections.reduce((total, section) => total + section.documents.length, 0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300"
    >
      {/* Top Row */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white truncate mb-2">{portfolio.name}</h3>
          <div className="flex gap-2 flex-wrap">
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getTypeColor(portfolio.type)}`}>
              {portfolio.type}
            </span>
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(portfolio.status)}`}>
              {portfolio.status || 'active'}
            </span>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors flex-shrink-0"
          >
            <MoreVertical className="w-5 h-5 text-slate-400" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-50 overflow-hidden">
              <button
                onClick={() => { onView(portfolio.id); setShowMenu(false); }}
                className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                onClick={() => { onEdit(portfolio.id); setShowMenu(false); }}
                className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => { onShare(portfolio.id); setShowMenu(false); }}
                className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => { onDelete(portfolio.id); setShowMenu(false); }}
                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors border-t border-slate-700/50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-slate-500">Sections:</span>
          <span className="text-white font-medium">{portfolio.sections.length}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-slate-500">Documents:</span>
          <span className="text-white font-medium">{getDocumentCount()}</span>
        </div>
      </div>

      {/* Views */}
      {portfolio.views !== undefined && (
        <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-2 text-sm text-slate-400">
          <Eye className="w-4 h-4" />
          <span>{portfolio.views} views</span>
        </div>
      )}
    </motion.div>
  );
};

export default PortfolioCard;
