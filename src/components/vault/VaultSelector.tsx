import { useState, useEffect } from "react";
import { X, Check, FileText } from "lucide-react";
import { VaultDocument } from "@/lib/vaultService";
import { Preferences } from "@capacitor/preferences";

interface VaultSelectorProps {
  onSelect: (document: VaultDocument) => void;
  onClose: () => void;
}

export default function VaultSelector({ onSelect, onClose }: VaultSelectorProps) {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVaultDocuments();
  }, []);

  const loadVaultDocuments = async () => {
    try {
      const { value: userId } = await Preferences.get({ key: "biovault_userId" });
      if (userId) {
        const { getVaultDocuments } = await import("@/lib/vaultService");
        const docs = await getVaultDocuments(userId);
        setDocuments(docs);
      }
    } catch (error) {
      console.error("Failed to load vault documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="bg-slate-900 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Select Document from Vault</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto">
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
                  onClick={() => onSelect(doc)}
                  className="p-4 rounded-lg border cursor-pointer transition-all bg-slate-800 border-slate-600 hover:border-slate-500"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-white font-medium">{doc.name}</p>
                        <p className="text-gray-400 text-sm">
                          {formatFileSize(doc.metadata.size)} • {new Date(doc.metadata.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
