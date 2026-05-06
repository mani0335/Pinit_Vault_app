import { motion } from "framer-motion";
import { PortfolioCard } from "./PortfolioCard";
import { Portfolio } from "@/types/portfolio";

interface PortfolioGridProps {
  portfolios: Portfolio[];
  onView: (portfolio: Portfolio) => void;
  onEdit: (portfolio: Portfolio) => void;
  onShare: (portfolio: Portfolio) => void;
  onDelete: (portfolio: Portfolio) => void;
}

export function PortfolioGrid({ portfolios, onView, onEdit, onShare, onDelete }: PortfolioGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {portfolios.map((portfolio, index) => (
        <motion.div
          key={portfolio.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <PortfolioCard
            portfolio={portfolio}
            onView={onView}
            onEdit={onEdit}
            onShare={onShare}
            onDelete={onDelete}
          />
        </motion.div>
      ))}
    </div>
  );
}
