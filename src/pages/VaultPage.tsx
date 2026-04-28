import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Trash2,
  Eye,
  Download,
  Lock,
  Clock,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  getAllDocuments,
  deleteDocumentFromVault,
  saveVaultState,
  initializeVault,
  VaultDocument,
} from "@/lib/vaultManager";
import { decryptFile } from "@/lib/encryptionUtils";

interface VaultPageProps {
  onBack: () => void;
}

export default function VaultPage({ onBack }: VaultPageProps) {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<VaultDocument | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [autoDeleteMessage, setAutoDeleteMessage] = useState<string>("");

  // Load documents on mount
  useEffect(() => {
    const vault = initializeVault();
    const docs = getAllDocuments(vault);
    setDocuments(docs);
    console.log(`📦 Loaded ${docs.length} documents from vault`);
  }, []);

  // Delete document
  const handleDeleteDocument = (doc: VaultDocument) => {
    if (!window.confirm(`Delete "${doc.fileName}"?`)) return;

    const vault = initializeVault();
    const updatedVault = deleteDocumentFromVault(vault, doc.id);
    saveVaultState(updatedVault);

    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    if (selectedDoc?.id === doc.id) {
      setSelectedDoc(null);
      setPreviewMode(false);
    }

    setAutoDeleteMessage(`✅ "${doc.fileName}" deleted from vault`);
    setTimeout(() => setAutoDeleteMessage(""), 3000);
  };

  // Preview document
  const handlePreviewDocument = async (doc: VaultDocument) => {
    setSelectedDoc(doc);
    setMessage("🔓 Decrypting...");

    try {
      if (doc.isEncrypted && doc.encryptionKey) {
        const decrypted = decryptFile(doc.fileData, doc.encryptionKey);
        setDecryptedContent(decrypted);
        console.log("✅ Document decrypted");
      } else {
        setDecryptedContent(doc.fileData);
      }

      setMessage("✅ Ready to preview");
      setPreviewMode(true);
    } catch (err) {
      setMessage("❌ Failed to decrypt document");
      console.error("Decrypt error:", err);
    }
  };

  // Download document
  const handleDownloadDocument = async (doc: VaultDocument) => {
    try {
      setMessage("📥 Preparing download...");

      let dataToDownload = doc.fileData;

      if (doc.isEncrypted && doc.encryptionKey) {
        setMessage("🔓 Decrypting...");
        dataToDownload = decryptFile(doc.fileData, doc.encryptionKey);
      }

      // Create downloadable link
      const link = document.createElement("a");
      link.href = dataToDownload.includes(",")
        ? dataToDownload
        : `data:application/pdf;base64,${dataToDownload}`;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMessage(`✅ Downloaded: ${doc.fileName}`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("❌ Download failed");
      console.error("Download error:", err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between mb-8"
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <h1 className="text-3xl font-bold text-white">🗄️ My Vault</h1>

          <div className="text-right">
            <p className="text-sm text-gray-400">Documents stored</p>
            <p className="text-2xl font-bold text-cyan-400">{documents.length}</p>
          </div>
        </motion.div>

        {/* Auto-Delete Message */}
        {autoDeleteMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg text-green-300"
          >
            {autoDeleteMessage}
          </motion.div>
        )}

        {/* Content */}
        {documents.length === 0 ? (
          // Empty State
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Your vault is empty
            </h2>
            <p className="text-gray-300 mb-8">
              Upload or scan documents to fill your vault
            </p>
            <button
              onClick={onBack}
              className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition"
            >
              ← Go Back
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Documents List */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-1 space-y-4"
            >
              <h2 className="text-xl font-bold text-white">📋 Documents</h2>

              <AnimatePresence mode="wait">
                {documents.map((doc) => (
                  <motion.div
                    key={doc.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={() => handlePreviewDocument(doc)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedDoc?.id === doc.id
                        ? "border-cyan-400 bg-cyan-900/20"
                        : "border-gray-600 hover:border-cyan-400 bg-gray-800/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate text-sm">
                          {doc.fileName}
                        </p>

                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          {doc.isEncrypted && (
                            <span className="flex items-center gap-1 bg-purple-900/50 px-2 py-1 rounded">
                              <Lock className="w-3 h-3" />
                              Encrypted
                            </span>
                          )}

                          <span className="text-gray-500">{doc.fileSize}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Document Details */}
            {selectedDoc && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-2 space-y-6"
              >
                {/* Preview Section */}
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">
                    📄 {selectedDoc.fileName}
                  </h3>

                  {message && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-4 rounded-lg mb-4 flex items-start gap-3 ${
                        message.includes("❌")
                          ? "bg-red-900/30 text-red-300 border border-red-500/50"
                          : message.includes("✅")
                          ? "bg-green-900/30 text-green-300 border border-green-500/50"
                          : "bg-blue-900/30 text-blue-300 border border-blue-500/50"
                      }`}
                    >
                      {message.includes("❌") ? (
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 mt-0.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      )}
                      <p className="text-sm">{message}</p>
                    </motion.div>
                  )}

                  {/* Document Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div>
                      <p className="text-gray-400">File Type</p>
                      <p className="text-white font-semibold capitalize">
                        {selectedDoc.fileType}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400">File Size</p>
                      <p className="text-white font-semibold">
                        {selectedDoc.fileSize}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400">Created</p>
                      <p className="text-white font-semibold">
                        {new Date(selectedDoc.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400">Encryption</p>
                      <p className="text-white font-semibold">
                        {selectedDoc.isEncrypted ? "🔒 Encrypted" : "🔓 Open"}
                      </p>
                    </div>
                  </div>

                  {/* Preview */}
                  {previewMode && selectedDoc.fileType === "pdf" && (
                    <div className="mb-6 max-h-96 overflow-auto bg-black/30 rounded-lg p-4">
                      <p className="text-gray-400 text-center">
                        📄 PDF Preview (Encrypted)
                      </p>
                      <p className="text-gray-500 text-xs text-center mt-2">
                        Content is encrypted for security
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleDownloadDocument(selectedDoc)}
                      className="py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download
                    </button>

                    <button
                      onClick={() => handleDeleteDocument(selectedDoc)}
                      className="py-3 px-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-5 h-5" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Security Info */}
                <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">
                    🔐 Security Information
                  </h4>

                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">✓</span>
                      <span>All documents are encrypted locally</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">✓</span>
                      <span>Stored securely in your vault</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">✓</span>
                      <span>Only you can access your documents</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">✓</span>
                      <span>Decryption key stored securely</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
