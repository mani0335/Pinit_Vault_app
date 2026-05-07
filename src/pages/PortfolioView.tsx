import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Calendar, User, Mail, Eye } from "lucide-react";
import { getPortfolioById, updatePortfolio } from "../services/portfolioService";
import { Portfolio } from "../types/portfolio";
import { getVaultDocuments, VaultDocument } from "../lib/vaultService";
import { Preferences } from "@capacitor/preferences";
import DocumentViewerModal from "../components/portfolio/DocumentViewerModal";

export default function PortfolioView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", role: "", email: "" });
  const [vaultDocuments, setVaultDocuments] = useState<VaultDocument[]>([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadPortfolio();
      loadVaultDocuments();
    }
  }, [id]);

  const loadPortfolio = async () => {
    try {
      const data = await getPortfolioById(id);
      if (data) {
        setPortfolio(data);
        setEditForm({
          name: data.name,
          role: data.role || "",
          email: data.email || "",
        });
      }
    } catch (error) {
      console.error("Failed to load portfolio:", error);
      alert("Portfolio not found");
      navigate("/portfolio");
    } finally {
      setLoading(false);
    }
  };

  const loadVaultDocuments = async () => {
    try {
      const { value: userId } = await Preferences.get({ key: "biovault_userId" });
      if (userId) {
        const docs = await getVaultDocuments(userId);
        setVaultDocuments(docs);
      }
    } catch (error) {
      console.error("Failed to load vault documents:", error);
    }
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleSave = async () => {
    if (!portfolio) return;

    try {
      const updated: Portfolio = {
        ...portfolio,
        name: editForm.name,
        role: editForm.role,
        email: editForm.email,
        updatedAt: new Date().toISOString(),
      };

      await updatePortfolio(updated);
      setPortfolio(updated);
      setEditing(false);
      alert("Portfolio updated successfully!");
    } catch (error) {
      console.error("Failed to update portfolio:", error);
      alert("Failed to update portfolio");
    }
  };

  const handleCancel = () => {
    if (portfolio) {
      setEditForm({
        name: portfolio.name,
        role: portfolio.role || "",
        email: portfolio.email || "",
      });
    }
    setEditing(false);
  };

  const handleViewDocument = (vaultDoc: VaultDocument) => {
    // Convert VaultDocument to PortfolioDocument format for DocumentViewerModal
    const portfolioDoc = {
      id: vaultDoc.id,
      name: vaultDoc.metadata.original_name || vaultDoc.name,
      type: 'application/octet-stream', // Default type since it's not in VaultDocument
      size: vaultDoc.metadata.size,
      file_url: vaultDoc.cloudinaryUrl || '', // Use cloudinaryUrl if available
      uploaded_at: new Date(vaultDoc.metadata.timestamp).toISOString(),
      user_id: vaultDoc.metadata.ownerId || ''
    };
    setSelectedDocument(portfolioDoc);
    setShowDocumentModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <p className="text-white">Loading portfolio...</p>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <p className="text-white">Portfolio not found</p>
      </div>
    );
  }

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
        <h1 className="text-lg font-semibold text-white">Portfolio Details</h1>
        <div className="w-9"></div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Portfolio Info Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white capitalize">{portfolio.type} Portfolio</h2>
              {!editing && (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                >
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                  <input
                    type="text"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-white font-medium">{portfolio.name}</p>
                    {portfolio.role && <p className="text-gray-300">{portfolio.role}</p>}
                  </div>
                </div>
                
                {portfolio.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <p className="text-gray-300">{portfolio.email}</p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-gray-300 text-sm">Created</p>
                    <p className="text-white">{formatDate(portfolio.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-gray-300 text-sm">Last Updated</p>
                    <p className="text-white">{formatDate(portfolio.updatedAt)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Documents Section */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents ({portfolio.documents.length})
            </h3>
            
            {portfolio.documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No documents in this portfolio</p>
              </div>
            ) : (
              <div className="space-y-2">
                {portfolio.documents.map((docId, index) => {
                  const vaultDoc = vaultDocuments.find(doc => doc.id === docId);
                  return (
                    <div key={docId} className="bg-slate-900 rounded-lg p-3 border border-slate-600">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {vaultDoc ? vaultDoc.name : `Document ${index + 1}`}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {vaultDoc ? vaultDoc.metadata.original_name : `Document ID: ${docId}`}
                          </p>
                          {vaultDoc && (
                            <p className="text-gray-500 text-xs">
                              Size: {Math.round(vaultDoc.metadata.size / 1024)} KB • 
                              {new Date(vaultDoc.metadata.timestamp).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {vaultDoc && (
                          <button
                            onClick={() => handleViewDocument(vaultDoc)}
                            className="ml-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-all flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {showDocumentModal && selectedDocument && (
        <DocumentViewerModal
          isOpen={showDocumentModal}
          onClose={() => {
            setShowDocumentModal(false);
            setSelectedDocument(null);
          }}
          fileDocument={selectedDocument}
          allowDownload={true}
          watermarkEnabled={false}
          watermarkText={""}
        />
      )}
    </div>
  );
}
