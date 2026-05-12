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
  Shield,
  Share2,
} from "lucide-react";
import {
  getVaultDocuments,
  deleteDocumentFromVault,
} from "@/lib/vaultService";
import { decryptFile } from "@/lib/encryptionUtils";
import { appStorage } from "@/lib/storage";
import { Share } from "@capacitor/share";

interface VaultDoc {
  id: string;
  name: string;
  encryptedData: string;
  metadata: {
    timestamp: number;
    original_name: string;
    size: number;
    checksum: string;
    encrypted?: boolean;
    ownerId?: string;
  };
  createdAt: string;
}

interface VaultPageProps {
  onBack: () => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function getFileType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  return "document";
}

const ID_KEYWORDS = ["aadhaar", "pan", "passport", "license", "voter", "id"];

export default function VaultPage({ onBack }: VaultPageProps) {
  const [documents, setDocuments] = useState<VaultDoc[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<VaultDoc | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [autoDeleteMessage, setAutoDeleteMessage] = useState<string>("");
  const [showDigitalIdentities, setShowDigitalIdentities] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    const load = async () => {
      let uid: string | null = null;
      try { uid = await appStorage.getItem("biovault_userId"); } catch {}
      if (!uid) uid = localStorage.getItem("biovault_userId");

      if (!uid) {
        console.warn("⚠️ No userId found, vault will be empty");
        return;
      }

      setUserId(uid);
      const docs = await getVaultDocuments(uid);
      setDocuments(docs);
      console.log(`📦 Loaded ${docs.length} documents from vault for user: ${uid}`);
    };

    load();
  }, []);

  const digitalIdentityCount = documents.filter((doc) =>
    ID_KEYWORDS.some((kw) => doc.name.toLowerCase().includes(kw))
  ).length;

  const digitalIdentityDocuments = documents.filter((doc) =>
    ID_KEYWORDS.some((kw) => doc.name.toLowerCase().includes(kw))
  );

  const handleShareDocument = async (doc: VaultDoc) => {
    setIsSharing(true);
    setMessage("📤 Preparing share...");
    try {
      await Share.share({
        title: doc.name,
        text: `Sharing encrypted document: ${doc.name} from PINIT Vault`,
        dialogTitle: "Share document",
      });
      setMessage("✅ Share dialog opened");
    } catch (err: any) {
      if (err?.message?.includes("cancel") || err?.message?.includes("Cancel")) {
        setMessage("");
      } else {
        setMessage("❌ Sharing not supported on this device");
      }
    } finally {
      setIsSharing(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleDeleteDocument = async (doc: VaultDoc) => {
    if (!window.confirm(`Delete "${doc.name}"?`)) return;

    await deleteDocumentFromVault(userId, doc.id);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));

    if (selectedDoc?.id === doc.id) {
      setSelectedDoc(null);
      setPreviewMode(false);
    }

    setAutoDeleteMessage(`✅ "${doc.name}" deleted from vault`);
    setTimeout(() => setAutoDeleteMessage(""), 3000);
  };

  const handlePreviewDocument = (doc: VaultDoc) => {
    setSelectedDoc(doc);
    setPreviewMode(true);
    setMessage("✅ Ready to preview");
  };

  const handleDownloadDocument = async (doc: VaultDoc) => {
    try {
      setMessage("📥 Preparing download...");

      let data = doc.encryptedData;

      if (doc.metadata.encrypted && doc.metadata.checksum) {
        setMessage("🔓 Decrypting...");
        data = decryptFile(doc.encryptedData, doc.metadata.checksum);
      }

      const ext = doc.name.split(".").pop()?.toLowerCase() || "bin";
      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
      const mime = mimeMap[ext] || "application/octet-stream";

      const href = data.startsWith("data:")
        ? data
        : `data:${mime};base64,${data}`;

      const link = document.createElement("a");
      link.href = href;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMessage(`✅ Downloaded: ${doc.name}`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("❌ Download failed");
      console.error("Download error:", err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
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

          <div className="flex gap-4">
            <button
              onClick={() => setShowDigitalIdentities(!showDigitalIdentities)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white hover:from-purple-700 hover:to-pink-700 transition"
            >
              <Shield className="w-5 h-5" />
              <span>Digital Identities</span>
              <span className="bg-white text-purple-600 text-xs font-bold rounded-full px-2 py-0.5">
                {digitalIdentityCount}
              </span>
            </button>
            <div className="text-right">
              <p className="text-sm text-gray-400">Documents stored</p>
              <p className="text-2xl font-bold text-cyan-400">{documents.length}</p>
            </div>
          </div>
        </motion.div>

        {/* Digital Identity Documents List */}
        {showDigitalIdentities && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Digital Identity Documents
            </h3>
            {digitalIdentityDocuments.length === 0 ? (
              <p className="text-gray-400 text-sm">No digital identity documents found</p>
            ) : (
              <div className="space-y-2">
                {digitalIdentityDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition cursor-pointer"
                    onClick={() => handlePreviewDocument(doc)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-white font-medium">{doc.name}</p>
                        <p className="text-gray-400 text-xs">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePreviewDocument(doc); }}
                        className="p-2 hover:bg-slate-600 rounded-lg transition"
                      >
                        <Eye className="w-4 h-4 text-cyan-400" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc); }}
                        className="p-2 hover:bg-slate-600 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Auto-Delete Message */}
        {autoDeleteMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg text-green-300"
          >
            {autoDeleteMessage}
          </motion.div>
        )}

        {/* Content */}
        {documents.length === 0 ? (
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
                          {doc.name}
                        </p>

                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          {doc.metadata.encrypted && (
                            <span className="flex items-center gap-1 bg-purple-900/50 px-2 py-1 rounded">
                              <Lock className="w-3 h-3" />
                              Encrypted
                            </span>
                          )}
                          <span className="text-gray-500">
                            {formatSize(doc.metadata.size)}
                          </span>
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
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">
                    📄 {selectedDoc.name}
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
                        {getFileType(selectedDoc.name)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400">File Size</p>
                      <p className="text-white font-semibold">
                        {formatSize(selectedDoc.metadata.size)}
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
                        {selectedDoc.metadata.encrypted ? "🔒 Encrypted" : "🔓 Open"}
                      </p>
                    </div>
                  </div>

                  {/* Preview placeholder for PDF */}
                  {previewMode && getFileType(selectedDoc.name) === "pdf" && (
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
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleDownloadDocument(selectedDoc)}
                      className="py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download
                    </button>

                    <button
                      onClick={() => handleShareDocument(selectedDoc)}
                      disabled={isSharing}
                      className="py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-5 h-5" />
                      Share
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
