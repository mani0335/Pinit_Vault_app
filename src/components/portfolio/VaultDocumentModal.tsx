import { useState, useEffect } from "react";
import { X, Check, FileText } from "lucide-react";

interface VaultDocument {
  id: string;
  name: string;
  metadata: {
    original_name: string;
    size: number;
    timestamp: number;
  };
}

interface VaultDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelection: (documentIds: string[]) => void;
}

export default function VaultDocumentModal({ isOpen, onClose, onSelection }: VaultDocumentModalProps) {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadVaultDocuments();
    }
  }, [isOpen]);

  const loadVaultDocuments = async () => {
    try {
      // Use existing vault service - DO NOT REIMPLEMENT
      const { getVaultDocuments } = await import("../../lib/vaultService");
      const { value } = await import("@capacitor/preferences").then(p => p.Preferences.get({ key: "biovault_userId" }));
      
      if (value) {
        const docs = await getVaultDocuments(value);
        setDocuments(docs);
      }
    } catch (error) {
      console.error("Failed to load vault documents:", error);
      // Mock data for now
      setDocuments([
        {
          id: "1",
          name: "Resume.pdf",
          metadata: {
            original_name: "John_Doe_Resume.pdf",
            size: 245760,
            timestamp: 1704067200000
          }
        },
        {
          id: "2",
          name: "Transcript.pdf",
          metadata: {
            original_name: "Academic_Transcript.pdf",
            size: 512000,
            timestamp: 1704067200000
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (docId: string) => {
    setSelectedIds(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleConfirm = () => {
    onSelection(selectedIds);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="bg-slate-900 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Select Documents from Vault</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto mb-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading vault documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No documents in vault</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => toggleSelection(doc.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedIds.includes(doc.id)
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedIds.includes(doc.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-500'
                      }`}>
                        {selectedIds.includes(doc.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{doc.name}</p>
                        <p className="text-gray-400 text-sm">
                          {formatFileSize(doc.metadata.size)} • {new Date(doc.metadata.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Selected ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
}
