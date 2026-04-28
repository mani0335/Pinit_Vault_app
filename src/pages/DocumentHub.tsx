import { useState } from "react";
import { motion } from "framer-motion";
import ScanDocumentEnhanced from "../components/ScanDocumentEnhanced";
import UploadDocument from "../components/UploadDocument";

export default function DocumentHub() {
  const [activeTab, setActiveTab] = useState<"scan" | "upload" | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Document Hub</h1>
          <p className="text-gray-300">Upload or scan documents securely</p>
        </motion.div>

        {activeTab === null ? (
          /* Choose Method Screen */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scan Document Option */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab("scan")}
              className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-8 text-left hover:shadow-2xl transition-all"
            >
              <div className="text-4xl mb-4">📷</div>
              <h2 className="text-2xl font-bold text-white mb-2">Scan Document</h2>
              <p className="text-blue-100">
                Use your camera to scan multiple pages. All pages are grouped in a single collection that you can convert to PDF and encrypt.
              </p>
              <div className="mt-4 flex items-center text-blue-200">
                <span>Open Camera →</span>
              </div>
            </motion.button>

            {/* Upload Document Option */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab("upload")}
              className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-8 text-left hover:shadow-2xl transition-all"
            >
              <div className="text-4xl mb-4">📤</div>
              <h2 className="text-2xl font-bold text-white mb-2">Upload Document</h2>
              <p className="text-green-100">
                Select a file from your device. Supported formats: PDF, DOCX, XLSX, images. File will be encrypted automatically.
              </p>
              <div className="mt-4 flex items-center text-green-200">
                <span>Choose File →</span>
              </div>
            </motion.button>
          </div>
        ) : (
          /* Active Tab Content */
          <div>
            {activeTab === "scan" && <ScanDocumentEnhanced onBack={() => setActiveTab(null)} />}
            {activeTab === "upload" && <UploadDocument onBack={() => setActiveTab(null)} />}
          </div>
        )}
      </div>
    </div>
  );
}
