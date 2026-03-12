import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface CyberCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "cyan" | "purple" | "pink";
  onClick?: () => void;
}

const glowMap = {
  cyan: "glow-cyan hover:shadow-[0_0_25px_hsl(180_100%_50%/0.5)]",
  purple: "glow-purple hover:shadow-[0_0_25px_hsl(260_100%_65%/0.5)]",
  pink: "glow-pink hover:shadow-[0_0_25px_hsl(320_100%_60%/0.5)]",
};

export function CyberCard({ children, className, glowColor = "cyan", onClick }: CyberCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        "glass-surface rounded-lg p-6 transition-all duration-300 cursor-pointer",
        glowMap[glowColor],
        className
      )}
    >
      {children}
    </motion.div>
  );
}
