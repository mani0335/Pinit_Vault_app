import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileText, X, Check } from "lucide-react";
import { Preferences } from "@capacitor/preferences";
import { getVaultDocuments, VaultDocument } from "@/lib/vaultService";
import VaultSelector from "@/components/vault/VaultSelector";

interface DocumentsSectionProps {
  documents: string[];
  onChange: (documents: string[]) => void;
}

export function DocumentsSection({ documents, onChange }: DocumentsSectionProps) {
  const [showVaultSelector, setShowVaultSelector] = useState(false);
  const [vaultDocuments, setVaultDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVaultDocuments();

    // Add storage event listener for auto-refresh
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.includes('vaultDocuments')) {
        loadVaultDocuments();
      }
    };

    // Add custom vaultUpdated event listener
    const handleVaultUpdate = () => {
      loadVaultDocuments();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('vaultUpdated', handleVaultUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('vaultUpdated', handleVaultUpdate);
    };
  }, []);

  const loadVaultDocuments = async () => {
    try {
      setLoading(true);
      // Get user ID from preferences
      const { value: userId } = await Preferences.get({ key: "biovault_userId" });
      if (!userId) {
        console.warn("No user ID found");
        return;
      }
      const docs = await getVaultDocuments(userId);
      setVaultDocuments(docs);
    } catch (error) {
      console.error("Failed to load vault documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFromVault = () => {
    setShowVaultSelector(true);
  };

  const handleDocumentSelect = (doc: VaultDocument) => {
    // prevent duplicates
    if (documents.includes(doc.id)) return;

    onChange([...documents, doc.id]);
    setShowVaultSelector(false);
  };

  const removeDocument = (docId: string) => {
    onChange(documents.filter(id => id !== docId));
  };

  const getDocumentName = (docId: string) => {
    return vaultDocuments.find(doc => doc.id === docId)?.name || `Document ${docId}`;
  };

  const getDocumentIcon = (type: string) => {
    return <FileText size={16} className="text-purple-300" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Documents</h2>
        <button
          onClick={handleAddFromVault}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white font-semibold transition-all"
        >
          <Plus size={16} />
          Add from Vault
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-12 text-center shadow-xl">
          <FileText size={48} className="text-purple-400 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No documents selected yet</p>
          <button
            onClick={handleAddFromVault}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white font-semibold transition-all"
          >
            <Plus size={16} />
            Add Documents from Vault
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(docId => (
            <div
              key={docId}
              className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-xl p-4 shadow-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {getDocumentIcon("Document")}
                <span className="text-white font-medium">{getDocumentName(docId)}</span>
              </div>
              <button
                onClick={() => removeDocument(docId)}
                className="p-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Vault Selector Modal */}
      {showVaultSelector && (
        <VaultSelector
          onSelect={handleDocumentSelect}
          onClose={() => setShowVaultSelector(false)}
        />
      )}
    </div>
  );
}
