import { motion } from "framer-motion";
import { User, GraduationCap, Award } from "lucide-react";
import { PortfolioType, PortfolioTypeConfig } from "@/types/portfolioBuilder";

interface PortfolioTypeSelectorProps {
  onTypeSelect: (type: PortfolioType) => void;
}

const portfolioTypes: PortfolioTypeConfig[] = [
  {
    type: "Personal",
    sections: ["profile", "projects", "documents"],
    title: "Personal Portfolio",
    description: "Showcase your projects and achievements"
  },
  {
    type: "Academic",
    sections: ["profile", "education", "documents"],
    title: "Academic Portfolio",
    description: "Highlight your education and academic work"
  },
  {
    type: "Masters",
    sections: ["profile", "education", "documents"],
    title: "Masters Portfolio",
    description: "Advanced academic and research portfolio"
  }
];

const getIcon = (type: PortfolioType) => {
  switch (type) {
    case "Personal":
      return <User size={32} />;
    case "Academic":
      return <GraduationCap size={32} />;
    case "Masters":
      return <Award size={32} />;
    default:
      return <User size={32} />;
  }
};

export function PortfolioTypeSelector({ onTypeSelect }: PortfolioTypeSelectorProps) {
  return (
    <div className="min-h-screen px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
          Choose Your Portfolio Type
        </h1>
        <p className="text-gray-400 text-lg">
          Select the type that best fits your needs
        </p>
      </motion.div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {portfolioTypes.map((config, index) => (
          <motion.div
            key={config.type}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onTypeSelect(config.type)}
            className="cursor-pointer"
          >
            <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-8 space-y-6 shadow-xl hover:shadow-purple-500/20 transition-all duration-300 h-full">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                  {getIcon(config.type)}
                </div>
              </div>
              
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold text-white">
                  {config.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {config.description}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-purple-300 font-semibold">Includes:</p>
                <div className="flex flex-wrap gap-2">
                  {config.sections.map((section) => (
                    <span
                      key={section}
                      className="px-3 py-1 bg-purple-600/30 border border-purple-500/30 rounded-full text-xs text-purple-200"
                    >
                      {section.charAt(0).toUpperCase() + section.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
