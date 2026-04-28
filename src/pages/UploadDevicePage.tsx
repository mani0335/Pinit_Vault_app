import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Check } from "lucide-react";
import { vaultManager } from "@/lib/vaultManager";

export default function UploadDevicePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ name: string; type: string; size: number; id: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setError(null);
    const newFiles = [...uploadedFiles];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.type}. Allowed: PDF, images, DOCX, XLSX`);
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        setError(`File too large: ${file.name}. Max 50MB allowed.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        newFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });

        // Store file data temporarily
        sessionStorage.setItem(
          `file_${newFiles[newFiles.length - 1].id}`,
          base64
        );

        setUploadedFiles([...newFiles]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Save all files to vault
  const saveToVault = async () => {
    if (uploadedFiles.length === 0) {
      setError("Please select at least one file");
      return;
    }

    try {
      setIsUploading(true);
      console.log("💾 Saving", uploadedFiles.length, "files to vault...");

      for (const file of uploadedFiles) {
        const fileData = sessionStorage.getItem(`file_${file.id}`);
        if (!fileData) continue;

        // Simulate encryption
        const encrypted = vaultManager.encryptFile(fileData);

        // Determine file type
        const fileType: "pdf" | "image" | "doc" = file.type.includes("pdf")
          ? "pdf"
          : file.type.includes("image")
            ? "image"
            : "doc";

        // Create vault document
        const vaultDoc = {
          id: vaultManager.generateId(),
          fileName: file.name,
          fileType: fileType,
          fileUrl: `data:${file.type};base64,${encrypted}`,
          createdAt: new Date().toISOString(),
          size: file.size,
        };

        vaultManager.addDocument(vaultDoc);
        console.log("✅ Saved:", file.name);
      }

      // Clear session storage
      uploadedFiles.forEach((file) => {
        sessionStorage.removeItem(`file_${file.id}`);
      });

      // Navigate to vault
      navigate("/vault");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save files");
      console.error("Error saving files:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove a file
  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
    sessionStorage.removeItem(`file_${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => navigate("/upload")}
            className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-cyan-400" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-white">Upload from Device</h1>
            <p className="text-gray-400 mt-2">
              Select files to encrypt and store in your vault
            </p>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 bg-red-900/50 border border-red-500/50 rounded-lg p-4 text-red-200"
          >
            {error}
          </motion.div>
        )}

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-2 border-dashed border-purple-500/50 hover:border-purple-400 rounded-xl p-12 transition-all hover:bg-purple-600/10"
          >
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-purple-400" />
              <div>
                <p className="text-white font-bold text-lg">Choose Files</p>
                <p className="text-gray-400 text-sm">
                  PDF, Images, DOCX, XLSX (Max 50MB each)
                </p>
              </div>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            className="hidden"
          />
        </motion.div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mb-8"
          >
            <h2 className="text-xl font-bold text-white">
              Selected Files ({uploadedFiles.length})
            </h2>

            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/50 transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">
                        {file.name}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-red-400 hover:text-red-300 font-bold ml-2 flex-shrink-0"
                  >
                    ✕
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Save Button */}
            <button
              onClick={saveToVault}
              disabled={isUploading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all mt-6"
            >
              {isUploading
                ? "💾 Encrypting & Saving..."
                : "💾 Save to Vault"}
            </button>
          </motion.div>
        )}

        {/* More Files Button */}
        {uploadedFiles.length > 0 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 text-cyan-400 font-semibold py-2 px-4 rounded-lg transition-all"
          >
            + Add More Files
          </button>
        )}

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-10 bg-slate-800/50 rounded-xl p-6 border border-slate-700/50"
        >
          <h3 className="text-lg font-semibold text-white mb-2">
            ✨ Supported Formats
          </h3>
          <ul className="grid grid-cols-2 gap-2 text-gray-300 text-sm">
            <li>✅ PDF Documents</li>
            <li>✅ JPEG, PNG, WebP Images</li>
            <li>✅ Word Documents (.docx)</li>
            <li>✅ Excel Spreadsheets (.xlsx)</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
