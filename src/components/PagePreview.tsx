import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Page {
  id: string;
  imageData: string;
  timestamp: number;
}

interface PagePreviewProps {
  pages: Page[];
  uploadedFile?: File;
  onBack: () => void;
  type: "scan" | "upload";
  format?: "pdf" | "doc";
}

export default function PagePreview({
  pages,
  uploadedFile,
  onBack,
  type,
  format = "pdf",
}: PagePreviewProps) {
  const userId = localStorage.getItem("biovault_userId") || "";
  const [convertFormat, setConvertFormat] = useState<"pdf" | "images">(format || "pdf");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [docName, setDocName] = useState("");

  const handleSave = async () => {
    if (!docName.trim()) {
      setError("Please enter a document name");
      return;
    }

    if (!userId) {
      setError("User not authenticated");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();

      if (type === "scan") {
        // For scanned documents: convert pages to PDF or save as images
        formData.append("user_id", userId);
        formData.append("doc_name", docName);
        formData.append("format", convertFormat);
        formData.append("scan_type", "true");

        // Add all scanned pages as base64
        pages.forEach((page, idx) => {
          formData.append(`page_${idx}`, page.imageData);
        });

        // Send to backend for PDF conversion and encryption
        const response = await fetch("/vault/save-scanned-document", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to save document");
        }

        setSuccess(true);
      } else if (type === "upload" && uploadedFile) {
        // For uploaded documents: direct file upload
        const uploadFormData = new FormData();
        uploadFormData.append("file", uploadedFile);
        uploadFormData.append("user_id", userId);
        uploadFormData.append("doc_name", docName);

        const response = await fetch("/vault/upload", {
          method: "POST",
          body: uploadFormData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to upload document");
        }

        setSuccess(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-green-900 to-green-800 rounded-xl p-12 text-center"
      >
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Document Saved Successfully!
        </h2>
        <p className="text-green-100 mb-8">
          Your document has been encrypted and secured in your vault.
        </p>

        <div className="bg-green-900/50 border border-green-400 rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold text-white mb-3">📋 Document Details:</h3>
          <p className="text-green-100">
            <strong>Name:</strong> {docName}
          </p>
          <p className="text-green-100">
            <strong>Type:</strong> {type === "scan" ? "Scanned Document" : "Uploaded Document"}
          </p>
          <p className="text-green-100">
            <strong>Format:</strong> {format.toUpperCase()}
          </p>
          <p className="text-green-100">
            <strong>Pages:</strong> {pages.length}
          </p>
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            📁 Back to Hub
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            🔗 Create Share Link
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-300 hover:text-white transition"
      >
        ← Back
      </button>

      {/* Pages Preview */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">
          📄 Preview ({pages.length} page{pages.length !== 1 ? "s" : ""})
        </h3>

        {/* Scrollable Preview */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {pages.map((page, idx) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-900 rounded-lg p-4"
              >
                <p className="text-gray-400 text-sm mb-2">Page {idx + 1}</p>
                {page.imageData && (
                  <img
                    src={page.imageData}
                    alt={`Page ${idx + 1}`}
                    className="w-full max-h-48 object-contain rounded border border-slate-600"
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Save Options */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">💾 Save Options</h3>

        {/* Document Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Document Name
          </label>
          <input
            type="text"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="e.g., Invoice 2026-04-17"
            className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Format Selection (only for scanned documents) */}
        {type === "scan" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setConvertFormat("pdf")}
                className={`p-4 rounded-lg border-2 transition font-semibold ${
                  convertFormat === "pdf"
                    ? "border-blue-500 bg-blue-900/30 text-blue-200"
                    : "border-slate-600 bg-slate-900 text-gray-400 hover:border-slate-500"
                }`}
              >
                📕 Save as PDF
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setConvertFormat("images")}
                className={`p-4 rounded-lg border-2 transition font-semibold ${
                  convertFormat === "images"
                    ? "border-blue-500 bg-blue-900/30 text-blue-200"
                    : "border-slate-600 bg-slate-900 text-gray-400 hover:border-slate-500"
                }`}
              >
                🖼️ Save as Images
              </motion.button>
            </div>
          </div>
        )}

        {/* Encryption Info */}
        <div className="bg-blue-900/30 border border-blue-600 text-blue-200 p-4 rounded-lg mb-6">
          <p className="text-sm">
            <strong>🔐 Encryption:</strong> Your document will be encrypted using AES-256
            and securely stored in your vault.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-600 text-red-200 p-4 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center flex-wrap">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={saving || !docName.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span> Saving...
              </>
            ) : (
              <>
                💾 Save to Vault
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            disabled={saving}
            className="bg-slate-700 hover:bg-slate-600 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition disabled:opacity-50"
          >
            Cancel
          </motion.button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl mb-2">🔐</div>
          <h4 className="font-semibold text-white text-sm">Encrypted</h4>
          <p className="text-gray-400 text-xs mt-1">
            AES-256 military-grade encryption
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl mb-2">🔗</div>
          <h4 className="font-semibold text-white text-sm">Shareable</h4>
          <p className="text-gray-400 text-xs mt-1">
            Create secure share links after saving
          </p>
        </div>
      </div>
    </motion.div>
  );
}
