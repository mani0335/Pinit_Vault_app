import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Upload, FileText } from "lucide-react";

interface UploadPageProps {
  onSelectScan: () => void;
  onSelectUpload: () => void;
  onBack: () => void;
}

export default function UploadPage({
  onSelectScan,
  onSelectUpload,
  onBack,
}: UploadPageProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <motion.button
          onClick={onBack}
          whileHover={{ x: -5 }}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-3">
            📄 Upload Documents
          </h1>
          <p className="text-gray-300 text-lg">
            Choose how you want to add documents to your vault
          </p>
        </motion.div>

        {/* Options Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Scan Document Option */}
          <motion.button
            variants={itemVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={onSelectScan}
            className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all"
          >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 group-hover:from-blue-500 group-hover:to-blue-700 transition-all duration-300" />

            {/* Glass Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition-opacity duration-300" />

            {/* Shadow */}
            <div className="absolute inset-0 shadow-2xl group-hover:shadow-blue-500/50 transition-shadow duration-300" />

            {/* Content */}
            <div className="relative z-10">
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="text-2xl mb-6 inline-block"
              >
                📷
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-3">
                Scan Document
              </h2>

             

              

              <div className="flex items-center text-white font-semibold group-hover:translate-x-2 transition-transform">
                <Camera className="w-5 h-5 mr-2" />
                Open Camera →
              </div>
            </div>
          </motion.button>

          {/* Upload from Device Option */}
          <motion.button
            variants={itemVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={onSelectUpload}
            className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all"
          >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-800 group-hover:from-green-500 group-hover:to-green-700 transition-all duration-300" />

            {/* Glass Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition-opacity duration-300" />

            {/* Shadow */}
            <div className="absolute inset-0 shadow-2xl group-hover:shadow-green-500/50 transition-shadow duration-300" />

            {/* Content */}
            <div className="relative z-10">
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="text-2xl mb-6 inline-block"
              >
                📤
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-3">
                Upload from Device
              </h2>

              

            

              <div className="flex items-center text-white font-semibold group-hover:translate-x-2 transition-transform">
                <Upload className="w-5 h-5 mr-2" />
                Choose File →
              </div>
            </div>
          </motion.button>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 p-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500/20 backdrop-blur-sm"
        >
          <div className="flex gap-4">
            <FileText className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-white font-semibold mb-2">💡 Pro Tip</h3>
              <p className="text-gray-300 text-sm">
                All documents are automatically encrypted and stored in your
                personal vault. You can access them anytime from your dashboard.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
