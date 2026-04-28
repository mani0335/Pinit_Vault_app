import { useState, useRef } from "react";
import { motion } from "framer-motion";
import PagePreview from "./PagePreview";

interface UploadedDocument {
  id: string;
  file: File;
  name: string;
  size: string;
  type: string;
  preview?: string;
}

export default function UploadDocument({ onBack }: { onBack: () => void }) {
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`File type not supported. Allowed: PDF, DOCX, XLSX only`);
      return false;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size: 50MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    setError(null);

    if (!validateFile(file)) {
      return;
    }

    // Store document (no image preview for documents)
    setDocument({
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearDocument = () => {
    setDocument(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
        ← Back to Document Hub
      </button>

      {!showPreview ? (
        <>
          {/* File Upload Area */}
          {!document ? (
            <motion.div
              whileHover={{ borderColor: "#3b82f6" }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition ${
                isDragging
                  ? "border-blue-400 bg-blue-900/20"
                  : "border-slate-600 bg-slate-800/50"
              }`}
            >
              <div className="text-5xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Drop your document here
              </h3>
              <p className="text-gray-400 mb-6">
                or click to browse your device
              </p>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition"
              >
                📂 Choose File
              </button>

              <p className="text-gray-500 text-sm mt-6">
                Supported: PDF, DOCX, XLSX (Max 50MB)
              </p>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleInputChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
              />
            </motion.div>
          ) : (
            /* Document Selected */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 rounded-xl p-6 border border-slate-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                📋 Document Ready
              </h3>

              {/* File Preview */}
              <div className="mb-6 bg-slate-900 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">
                  {document.type.includes("pdf")
                    ? "📕"
                    : document.type.includes("word")
                      ? "📘"
                      : "📗"}
                </div>
                <p className="text-gray-400">{document.type}</p>
              </div>

              {/* File Details */}
              <div className="bg-slate-900 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">File Name:</span>
                  <span className="text-white font-medium">{document.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">File Size:</span>
                  <span className="text-white font-medium">{document.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">File Type:</span>
                  <span className="text-white font-medium text-sm">
                    {document.type}
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/30 border border-red-600 text-red-200 p-3 rounded-lg mb-6 text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPreview(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                >
                  👁️ Preview & Save
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearDocument}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                >
                  🗑️ Clear
                </motion.button>
              </div>
            </motion.div>
          )}
        </>
      ) : document ? (
        <PagePreview
          pages={[
            {
              id: document.id,
              imageData: document.preview || "",
              timestamp: Date.now(),
            },
          ]}
          uploadedFile={document.file}
          onBack={() => setShowPreview(false)}
          type="upload"
        />
      ) : null}
    </motion.div>
  );
}
