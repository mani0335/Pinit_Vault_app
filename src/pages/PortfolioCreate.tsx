import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { savePortfolio, getPortfolioById, updatePortfolio } from "../services/portfolioService";
import VaultDocumentModal from "../components/portfolio/VaultDocumentModal";
import { Portfolio } from "../types/portfolio";

export default function PortfolioCreate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  const [step, setStep] = useState<"type" | "profile" | "documents" | "complete">("type");
  const [portfolioType, setPortfolioType] = useState<"personal" | "academic" | "professional" | "masters">("personal");
  const [profile, setProfile] = useState({ name: "", role: "", email: "" });
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      loadPortfolioForEdit();
    }
  }, [id]);

  const loadPortfolioForEdit = async () => {
    try {
      const portfolio = await getPortfolioById(id);
      if (portfolio) {
        setPortfolioType(portfolio.type);
        setProfile({
          name: portfolio.name,
          role: portfolio.role || "",
          email: portfolio.email || "",
        });
        setSelectedDocuments(portfolio.documents);
        setStep("complete"); // Skip to complete step for editing
      }
    } catch (error) {
      console.error("Failed to load portfolio for editing:", error);
      navigate("/portfolio");
    }
  };

  const portfolioTypes = [
    {
      type: "personal" as const,
      title: "Personal Portfolio",
      description: "Showcase your projects and achievements",
    },
    {
      type: "academic" as const,
      title: "Academic Portfolio",
      description: "Highlight your education and academic work",
    },
    {
      type: "professional" as const,
      title: "Professional / Placement Portfolio",
      description: "Perfect for job applications and career opportunities",
    },
    {
      type: "masters" as const,
      title: "Masters Portfolio",
      description: "Perfect for graduate school applications",
    },
  ];

  const handleTypeSelect = (type: typeof portfolioType) => {
    setPortfolioType(type);
    setStep("profile");
  };

  const handleProfileNext = () => {
    if (profile.name.trim()) {
      setStep("documents");
    }
  };

  const handleDocumentsNext = () => {
    setStep("complete");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEditMode && id) {
        // Update existing portfolio
        const updatedPortfolio: Portfolio = {
          id,
          type: portfolioType,
          name: profile.name,
          role: profile.role,
          email: profile.email,
          documents: selectedDocuments,
          createdAt: new Date().toISOString(), // Will be updated from existing
          updatedAt: new Date().toISOString(),
        };

        await updatePortfolio(updatedPortfolio);
        alert("Portfolio updated successfully!");
      } else {
        // Create new portfolio
        const newPortfolio: Portfolio = {
          id: Date.now().toString(),
          type: portfolioType,
          name: profile.name,
          role: profile.role,
          email: profile.email,
          documents: selectedDocuments,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await savePortfolio(newPortfolio);
        alert("Portfolio created successfully!");
      }
      navigate("/portfolio");
    } catch (error) {
      console.error("Failed to save portfolio:", error);
      alert("Failed to save portfolio");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <button
          onClick={handleBack}
          className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">{isEditMode ? "Edit Portfolio" : "Create Portfolio"}</h1>
        <div className="w-9"></div>
      </div>

      <div className="p-6">
        {/* Step 1: Type Selection */}
        {step === "type" && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Choose Portfolio Type</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {portfolioTypes.map((type) => (
                <div
                  key={type.type}
                  onClick={() => handleTypeSelect(type.type)}
                  className="bg-gradient-to-r from-purple-600 via-blue-600 to-pink-500 rounded-xl p-6 text-white cursor-pointer hover:scale-105 transition-all"
                >
                  <h3 className="text-xl font-bold mb-2">{type.title}</h3>
                  <p className="text-sm opacity-80">{type.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Profile */}
        {step === "profile" && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <input
                  type="text"
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Software Engineer, Student"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>
              <button
                onClick={handleProfileNext}
                disabled={!profile.name.trim()}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Documents */}
        {step === "documents" && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Add Documents</h2>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-medium">Selected Documents</p>
                  <p className="text-gray-400 text-sm">{selectedDocuments.length} documents</p>
                </div>
                <button
                  onClick={() => setShowVaultModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add from Vault
                </button>
              </div>
              
              {selectedDocuments.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">No documents selected. Add documents from your vault to continue.</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep("profile")}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
              >
                Back
              </button>
              <button
                onClick={handleDocumentsNext}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === "complete" && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">Portfolio Ready!</h2>
              <p className="text-gray-300 mb-6">
                Your {portfolioType} portfolio "{profile.name}" is ready to be created.
              </p>
              <div className="text-left bg-slate-900 rounded-lg p-4 mb-6">
                <p className="text-white font-medium mb-2">Summary:</p>
                <p className="text-gray-300">Type: {portfolioType}</p>
                <p className="text-gray-300">Name: {profile.name}</p>
                {profile.role && <p className="text-gray-300">Role: {profile.role}</p>}
                {profile.email && <p className="text-gray-300">Email: {profile.email}</p>}
                <p className="text-gray-300">Documents: {selectedDocuments.length}</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Portfolio"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vault Document Modal */}
      <VaultDocumentModal
        isOpen={showVaultModal}
        onClose={() => setShowVaultModal(false)}
        onSelection={(documentIds) => {
          setSelectedDocuments(documentIds);
          setShowVaultModal(false);
        }}
      />
    </div>
  );
}
