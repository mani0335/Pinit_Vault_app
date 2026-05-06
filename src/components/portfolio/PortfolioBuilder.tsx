import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, User, GraduationCap, Briefcase, FileText } from "lucide-react";
import { PortfolioBuilderState, PortfolioSection, PortfolioType } from "@/types/portfolioBuilder";
import { ProfileSection } from "./sections/ProfileSection";
import { EducationSection } from "./sections/EducationSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { DocumentsSection } from "./sections/DocumentsSection";

interface PortfolioBuilderProps {
  portfolioType: PortfolioType;
  onSave: (state: PortfolioBuilderState) => void;
  onBack: () => void;
}

export function PortfolioBuilder({ portfolioType, onSave, onBack }: PortfolioBuilderProps) {
  const [activeSection, setActiveSection] = useState<PortfolioSection>("profile");
  const [state, setState] = useState<PortfolioBuilderState>({
    type: portfolioType,
    profile: {
      name: "",
      role: "",
      email: ""
    },
    education: [],
    projects: [],
    documents: []
  });

  const getSections = (): PortfolioSection[] => {
    switch (portfolioType) {
      case "Personal":
        return ["profile", "projects", "documents"];
      case "Academic":
        return ["profile", "education", "documents"];
      case "Masters":
        return ["profile", "education", "documents"];
      default:
        return ["profile", "projects", "documents"];
    }
  };

  const getSectionIcon = (section: PortfolioSection) => {
    switch (section) {
      case "profile":
        return <User size={20} />;
      case "education":
        return <GraduationCap size={20} />;
      case "projects":
        return <Briefcase size={20} />;
      case "documents":
        return <FileText size={20} />;
      default:
        return <User size={20} />;
    }
  };

  const getSectionTitle = (section: PortfolioSection) => {
    switch (section) {
      case "profile":
        return "Profile";
      case "education":
        return "Education";
      case "projects":
        return "Projects";
      case "documents":
        return "Documents";
      default:
        return section;
    }
  };

  const updateState = (updates: Partial<PortfolioBuilderState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    console.log("Portfolio State:", state);
    onSave(state);
  };

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return (
          <ProfileSection
            profile={state.profile}
            onChange={(profile) => updateState({ profile })}
          />
        );
      case "education":
        return (
          <EducationSection
            education={state.education || []}
            onChange={(education) => updateState({ education })}
          />
        );
      case "projects":
        return (
          <ProjectsSection
            projects={state.projects || []}
            onChange={(projects) => updateState({ projects })}
          />
        );
      case "documents":
        return (
          <DocumentsSection
            documents={state.documents}
            onChange={(documents) => updateState({ documents })}
          />
        );
      default:
        return null;
    }
  };

  const sections = getSections();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="flex h-screen">
        {/* Left Panel - Navigation */}
        <div className="w-80 bg-gradient-to-b from-slate-800/50 to-purple-900/30 border-r border-purple-500/30 backdrop-blur-xl p-6">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-2">
              {portfolioType} Portfolio
            </h2>
            <p className="text-gray-400 text-sm">
              Complete each section to build your portfolio
            </p>
          </div>

          <nav className="space-y-2">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeSection === section
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                    : "text-gray-300 hover:bg-purple-600/20 hover:text-white"
                }`}
              >
                {getSectionIcon(section)}
                <span className="font-medium">{getSectionTitle(section)}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-8 space-y-3">
            <button
              onClick={onBack}
              className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-semibold transition-all"
            >
              Back to Type Selection
            </button>
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white font-semibold transition-all shadow-lg"
            >
              <Save size={16} />
              Save Portfolio
            </button>
          </div>
        </div>

        {/* Right Panel - Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
