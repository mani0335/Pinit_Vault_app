import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Edit, Share2, Trash2 } from 'lucide-react';

interface Props {
  onView: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const PortfolioMenu: React.FC<Props> = ({ onView, onEdit, onShare, onDelete, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute right-0 top-full mt-2 w-48 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-50 overflow-hidden"
      >
        <button
          onClick={onView}
          className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button
          onClick={onEdit}
          className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={onShare}
          className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
        <button
          onClick={onDelete}
          className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors border-t border-slate-700/50"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default PortfolioMenu;
