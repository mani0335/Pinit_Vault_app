import React, { useState, useRef } from 'react';
import { ArrowLeft, Camera, Upload, Download } from 'lucide-react';
import { motion } from 'framer-motion';

interface ImageAnalyzerProps {
  userId: string;
  onBack?: () => void;
}

export const ImageAnalyzer: React.FC<ImageAnalyzerProps> = ({ userId, onBack }) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imageData = event.target?.result as string;
            setUploadedImage(imageData);
            setUploadedFile(file);
            analyzeImage(imageData, file);
          } catch (err) {
            console.error('❌ Error reading image:', err);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('❌ File upload error:', err);
    }
  };

  // Analyze image
  const analyzeImage = async (imageData: string, file: File) => {
    setIsAnalyzing(true);
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            
            // Generate simple asset ID from file
            const assetId = `AST-${Date.now().toString(36).toUpperCase()}`;
            const certId = `CERT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
            
            setAnalysisResult({
              detected: 'Image Analyzed',
              assetId: assetId,
              authorshipCertificateId: certId,
              userId: userId,
              timestamp: new Date().toISOString(),
              fileName: file.name,
              fileSize: file.size,
              imageDimensions: `${canvas.width}x${canvas.height}`,
              success: true
            });
          }
        } catch (err) {
          console.error('❌ Canvas error:', err);
          setAnalysisResult({ success: false, error: 'Failed to analyze image' });
        }
      };
      img.onerror = () => {
        console.error('❌ Image load error');
        setAnalysisResult({ success: false, error: 'Failed to load image' });
      };
      img.src = imageData;
    } catch (error) {
      console.error('❌ Analysis error:', error);
      setAnalysisResult({ success: false, error: String(error) });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Download report
  const downloadReport = () => {
    if (!analysisResult) return;

    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Image Analysis Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
          .report { background: white; padding: 30px; border-radius: 8px; max-width: 800px; }
          h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
          .field { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .label { font-weight: bold; color: #333; }
          .value { color: #666; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="report">
          <h1>Image Analysis Report</h1>
          <div class="field"><div class="label">Asset ID:</div><div class="value">${analysisResult.assetId}</div></div>
          <div class="field"><div class="label">Certificate:</div><div class="value">${analysisResult.authorshipCertificateId}</div></div>
          <div class="field"><div class="label">User ID:</div><div class="value">${analysisResult.userId}</div></div>
          <div class="field"><div class="label">File:</div><div class="value">${analysisResult.fileName}</div></div>
          <div class="field"><div class="label">Size:</div><div class="value">${(analysisResult.fileSize / 1024).toFixed(2)} KB</div></div>
          <div class="field"><div class="label">Dimensions:</div><div class="value">${analysisResult.imageDimensions}</div></div>
          <div class="field"><div class="label">Analyzed:</div><div class="value">${new Date(analysisResult.timestamp).toLocaleString()}</div></div>
          <hr style="margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Report Generated: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${analysisResult.assetId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <motion.button
            whileHover={{ x: -4 }}
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-slate-800/50 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-cyan-400" />
          </motion.button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-white">Image Analyzer</h1>
          <p className="text-slate-400 text-sm mt-1">Analyze and verify image ownership</p>
        </div>
      </div>

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50"
      >
        <div className="grid grid-cols-2 gap-4">
          {/* Camera Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => cameraInputRef.current?.click()}
            className="p-4 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Camera
          </motion.button>

          {/* Upload Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload
          </motion.button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </motion.div>

      {/* Image Preview */}
      {uploadedImage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl overflow-hidden border border-slate-700/50 bg-black/50"
        >
          <img src={uploadedImage} alt="uploaded" className="w-full max-h-80 object-cover" />
        </motion.div>
      )}

      {/* Analysis Results */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center p-8"
        >
          <div className="text-cyan-400 font-semibold flex items-center gap-2">
            <div className="animate-spin">⚙️</div>
            Analyzing image...
          </div>
        </motion.div>
      )}

      {analysisResult && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {analysisResult.success ? (
            <>
              {/* Success Result */}
              <div className="rounded-xl p-4 border bg-emerald-500/10 border-emerald-500/30">
                <div className="font-bold text-white text-lg mb-1">✅ Image Analyzed Successfully</div>
                <div className="text-sm text-slate-300">
                  File: <span className="font-mono text-cyan-400">{analysisResult.fileName}</span>
                </div>
              </div>

              {/* Ownership Section */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-cyan-400 font-semibold mb-3">Ownership Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Asset ID:</span><span className="text-white font-mono text-xs">{analysisResult.assetId}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Certificate:</span><span className="text-white font-mono text-xs">{analysisResult.authorshipCertificateId}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">User ID:</span><span className="text-white font-mono">{analysisResult.userId}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Analyzed:</span><span className="text-white">{new Date(analysisResult.timestamp).toLocaleString()}</span></div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-cyan-400 font-semibold mb-3">Technical Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Dimensions:</span><span className="text-white">{analysisResult.imageDimensions}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">File Size:</span><span className="text-white">{(analysisResult.fileSize / 1024).toFixed(2)} KB</span></div>
                </div>
              </div>

              {/* Download Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={downloadReport}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-5 h-5" />
                Download Report
              </motion.button>
            </>
          ) : (
            <div className="rounded-xl p-4 border bg-red-500/10 border-red-500/30">
              <p className="text-red-400 font-bold">❌ Analysis Failed</p>
              <p className="text-red-200 text-sm mt-2">{analysisResult.error || 'Unknown error'}</p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

