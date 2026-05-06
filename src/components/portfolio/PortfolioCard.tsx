import { motion } from "framer-motion";
import { Eye, Edit, Share2, Trash2 } from "lucide-react";
import { Portfolio } from "@/types/portfolio";

interface PortfolioCardProps {
  portfolio: Portfolio;
  onView: (portfolio: Portfolio) => void;
  onEdit: (portfolio: Portfolio) => void;
  onShare: (portfolio: Portfolio) => void;
  onDelete: (portfolio: Portfolio) => void;
}

const typeColors = {
  Personal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Academic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Professional: "bg-green-500/20 text-green-400 border-green-500/30",
  Masters: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export function PortfolioCard({ portfolio, onView, onEdit, onShare, onDelete }: PortfolioCardProps) {
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${portfolio.name}"?`)) {
      onDelete(portfolio);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05 }}
      className="bg-gradient-to-br from-purple-600 via-blue-600 to-pink-500 rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-2">{portfolio.name}</h3>
            <div className={`inline-block px-2 py-1 rounded-lg border text-xs font-semibold ${typeColors[portfolio.type]}`}>
              {portfolio.type}
            </div>
          </div>
        </div>

        {/* Middle content */}
        <div className="flex-1 mb-3">
          <p className="text-white/70 text-sm">
            Last updated: {new Date(portfolio.updatedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Bottom section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${portfolio.isShared ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            <span className="text-white/70 text-sm">
              {portfolio.isShared ? 'Shared' : 'Private'}
            </span>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onView(portfolio)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-all"
              title="View"
            >
              <Eye size={16} className="text-white/80" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(portfolio)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-all"
              title="Edit"
            >
              <Edit size={16} className="text-white/80" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onShare(portfolio)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-all"
              title="Share"
            >
              <Share2 size={16} className="text-white/80" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDelete}
              className="p-1.5 hover:bg-red-500/30 rounded-lg transition-all"
              title="Delete"
            >
              <Trash2 size={16} className="text-red-400" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
