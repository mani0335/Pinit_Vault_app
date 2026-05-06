import { motion } from "framer-motion";
import { Plus } from "lucide-react";

interface CreateEmptyStateProps {
  onCreatePortfolio: () => void;
}

export function CreateEmptyState({ onCreatePortfolio }: CreateEmptyStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-8"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreatePortfolio}
          className="relative inline-block"
        >
          <div className="w-32 h-32 mx-auto bg-gradient-to-r from-purple-600 via-blue-600 to-pink-500 rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:shadow-purple-500/50 transition-all duration-300">
            <Plus size={48} className="text-white" />
          </div>
          <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-r from-purple-600 via-blue-600 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Create your first portfolio
          </h1>
          <p className="text-gray-400">
            Showcase your work and achievements beautifully
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
