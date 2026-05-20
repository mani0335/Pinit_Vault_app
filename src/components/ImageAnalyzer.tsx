import React, { useState, useRef } from 'react';
import { ArrowLeft, Camera, Upload, Download, Shield, MapPin, Clock, Cpu, Eye, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractUUIDAdvanced } from '@/lib/cryptoUtils';
import { fullAnalyzeImage, type FullImageAnalysis } from '@/lib/imageAnalysis';

interface ImageAnalyzerProps {
  userId: string;
  onBack?: () => void;
}

export const ImageAnalyzer: React.FC<ImageAnalyzerProps> = ({ userId, onBack }) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FullImageAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const imageData = evt.target?.result as string;
      setUploadedImage(imageData);
      setAnalysis(null);
      setError(null);
      runAnalysis(file, imageData);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const runAnalysis = async (file: File, imageData: string) => {
    setIsAnalyzing(true);
    try {
      // Step 1: Check for PINIT ID in pixel LSBs
      const pinitResult = await new Promise<{ found: boolean; userId: string | null }>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve({ found: false, userId: null }); return; }
          ctx.drawImage(img, 0, 0);
          const raw = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const extracted = extractUUIDAdvanced(raw);
          resolve({ found: extracted.found && !!extracted.userId, userId: extracted.userId ?? null });
        };
        img.onerror = () => resolve({ found: false, userId: null });
        img.src = imageData;
      });

      // Step 2: Full analysis (EXIF + type detection + metadata)
      const result = await fullAnalyzeImage(file, imageData, pinitResult);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadReport = () => {
    if (!analysis) return;
    const { imageType: t, exif } = analysis;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>PINIT Vault — Image Analysis Report</title>
<style>
  body{font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:24px}
  .wrap{max-width:720px;margin:0 auto}
  h1{color:#22d3ee;border-bottom:2px solid #22d3ee;padding-bottom:12px}
  .card{background:#1e293b;border-radius:12px;padding:20px;margin:16px 0;border:1px solid #334155}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-weight:bold;font-size:14px}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #334155}
  .row:last-child{border-bottom:none}
  .label{color:#94a3b8}.value{font-family:monospace;color:#e2e8f0}
  .signal{padding:4px 0;color:#94a3b8}
  .yes{color:#4ade80}.no{color:#f87171}
</style>
</head>
<body>
<div class="wrap">
  <h1>🔍 PINIT Vault — Image Analysis Report</h1>
  <div class="card">
    <h2>${t.emoji} ${t.label} <span class="badge" style="background:#1e293b;border:1px solid #475569">${t.confidence} Confidence — ${t.confidenceScore}%</span></h2>
    <ul>${t.signals.map(s => `<li class="signal">${s}</li>`).join('')}</ul>
  </div>
  <div class="card">
    <h2>🔐 PINIT Ownership</h2>
    <div class="row"><span class="label">PINIT ID Embedded</span><span class="value ${analysis.pinitFound ? 'yes' : 'no'}">${analysis.pinitFound ? '✅ YES' : '❌ NO'}</span></div>
    ${analysis.pinitFound ? `<div class="row"><span class="label">Owner PINIT ID</span><span class="value">${analysis.pinitId}</span></div>` : ''}
  </div>
  <div class="card">
    <h2>📋 File Details</h2>
    <div class="row"><span class="label">File Name</span><span class="value">${analysis.fileName}</span></div>
    <div class="row"><span class="label">Format</span><span class="value">${analysis.format}</span></div>
    <div class="row"><span class="label">Size</span><span class="value">${(analysis.fileSize / 1024).toFixed(1)} KB</span></div>
    <div class="row"><span class="label">Dimensions</span><span class="value">${analysis.width}×${analysis.height} px</span></div>
    <div class="row"><span class="label">Megapixels</span><span class="value">${analysis.megapixels} MP</span></div>
    <div class="row"><span class="label">Aspect Ratio</span><span class="value">${analysis.aspectRatio}</span></div>
    ${analysis.estimatedJpegQuality ? `<div class="row"><span class="label">JPEG Quality</span><span class="value">~${analysis.estimatedJpegQuality}%</span></div>` : ''}
  </div>
  ${analysis.hasCameraData ? `
  <div class="card">
    <h2>📷 Camera EXIF Data</h2>
    ${exif.make ? `<div class="row"><span class="label">Make</span><span class="value">${exif.make}</span></div>` : ''}
    ${exif.model ? `<div class="row"><span class="label">Model</span><span class="value">${exif.model}</span></div>` : ''}
    ${exif.lens ? `<div class="row"><span class="label">Lens</span><span class="value">${exif.lens}</span></div>` : ''}
    ${exif.dateTimeOriginal ? `<div class="row"><span class="label">Date Taken</span><span class="value">${exif.dateTimeOriginal}</span></div>` : ''}
    ${exif.iso ? `<div class="row"><span class="label">ISO</span><span class="value">${exif.iso}</span></div>` : ''}
    ${exif.fNumber ? `<div class="row"><span class="label">Aperture</span><span class="value">f/${exif.fNumber}</span></div>` : ''}
    ${exif.exposureTime ? `<div class="row"><span class="label">Shutter</span><span class="value">${exif.exposureTime}</span></div>` : ''}
    ${exif.focalLength ? `<div class="row"><span class="label">Focal Length</span><span class="value">${exif.focalLength}mm</span></div>` : ''}
  </div>` : ''}
  ${analysis.hasGps ? `<div class="card"><h2>📍 GPS Location</h2>
    <div class="row"><span class="label">Latitude</span><span class="value">${exif.gpsLat?.toFixed(6)}</span></div>
    <div class="row"><span class="label">Longitude</span><span class="value">${exif.gpsLon?.toFixed(6)}</span></div>
  </div>` : ''}
  <p style="color:#475569;font-size:12px;margin-top:24px">Generated by PINIT Vault on ${new Date(analysis.analyzedAt).toLocaleString()}</p>
</div>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pinit-analysis-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pb-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <motion.button whileHover={{ x: -4 }} onClick={onBack}
            className="p-2 rounded-xl hover:bg-slate-800/50 transition-colors">
            <ArrowLeft className="w-6 h-6 text-cyan-400" />
          </motion.button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">Image Analyzer</h1>
          <p className="text-slate-400 text-sm mt-0.5">Detect ownership, source type & metadata</p>
        </div>
      </div>

      {/* Upload buttons */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => cameraInputRef.current?.click()}
          className="p-4 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white font-semibold flex items-center justify-center gap-2">
          <Camera className="w-5 h-5" /> Camera
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => fileInputRef.current?.click()}
          className="p-4 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white font-semibold flex items-center justify-center gap-2">
          <Upload className="w-5 h-5" /> Upload
        </motion.button>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      </div>

      {/* Image preview */}
      <AnimatePresence>
        {uploadedImage && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl overflow-hidden border border-slate-700/50 bg-black/50 max-h-56">
            <img src={uploadedImage} alt="uploaded" className="w-full h-full object-cover" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyzing spinner */}
      {isAnalyzing && (
        <div className="flex items-center justify-center gap-3 p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-300 font-medium">Analyzing image…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {analysis && !isAnalyzing && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* ── Image Type Card (biggest) ─────────────────────── */}
            <div className={`rounded-2xl p-5 border-2 ${analysis.imageType.color} ${analysis.imageType.bgColor}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{analysis.imageType.emoji}</span>
                  <div>
                    <p className={`text-xl font-bold ${analysis.imageType.textColor}`}>{analysis.imageType.label}</p>
                    <p className="text-slate-400 text-xs mt-0.5">Image Source Type</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${analysis.imageType.textColor}`}>{analysis.imageType.confidenceScore}%</div>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full border ${analysis.imageType.color} ${analysis.imageType.textColor}`}>
                    {analysis.imageType.confidence} Confidence
                  </div>
                </div>
              </div>
              {/* Confidence bar */}
              <div className="w-full bg-slate-700/50 rounded-full h-1.5 mb-3">
                <div className={`h-1.5 rounded-full bg-current ${analysis.imageType.textColor}`}
                  style={{ width: `${analysis.imageType.confidenceScore}%` }} />
              </div>
              {/* Detection signals */}
              <div className="space-y-1.5">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Detection Signals</p>
                {analysis.imageType.signals.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-current ${analysis.imageType.textColor}`} />
                    <p className="text-slate-300 text-sm">{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── PINIT Ownership ──────────────────────────────── */}
            <div className={`rounded-2xl p-5 border ${analysis.pinitFound ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-slate-700/50 bg-slate-800/40'}`}>
              <div className="flex items-center gap-3 mb-3">
                <Shield className={`w-5 h-5 ${analysis.pinitFound ? 'text-cyan-400' : 'text-slate-500'}`} />
                <p className="font-semibold text-white">PINIT Ownership</p>
              </div>
              {analysis.pinitFound ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-cyan-400" />
                    <span className="text-cyan-300 font-semibold">Ownership ID Detected</span>
                  </div>
                  <p className="text-slate-400 text-xs">This image was cryptographically stamped by PINIT Vault using LSB steganography.</p>
                  <div className="bg-black/40 rounded-xl p-3 mt-2">
                    <p className="text-slate-500 text-xs mb-1">Owner PINIT ID</p>
                    <p className="font-mono text-cyan-300 text-sm break-all">{analysis.pinitId}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400 text-sm">No PINIT ID found — not stamped by PINIT Vault</span>
                </div>
              )}
            </div>

            {/* ── File Details ─────────────────────────────────── */}
            <div className="rounded-2xl p-5 border border-slate-700/50 bg-slate-800/40">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-slate-400" />
                <p className="font-semibold text-white">File Details</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <InfoRow label="Format" value={analysis.format} />
                <InfoRow label="Size" value={`${(analysis.fileSize / 1024).toFixed(1)} KB`} />
                <InfoRow label="Dimensions" value={`${analysis.width}×${analysis.height}`} />
                <InfoRow label="Megapixels" value={`${analysis.megapixels} MP`} />
                <InfoRow label="Aspect Ratio" value={analysis.aspectRatio} />
                <InfoRow label="EXIF Data" value={analysis.hasExif ? '✅ Present' : '❌ Missing'} />
                {analysis.estimatedJpegQuality !== null && (
                  <InfoRow label="JPEG Quality" value={`~${analysis.estimatedJpegQuality}%${analysis.isJpegRecompressed ? ' (recompressed)' : ''}`} />
                )}
              </div>
            </div>

            {/* ── Camera EXIF ──────────────────────────────────── */}
            {analysis.hasCameraData && (
              <div className="rounded-2xl p-5 border border-green-700/40 bg-green-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-4 h-4 text-green-400" />
                  <p className="font-semibold text-white">Camera Data</p>
                  <span className="text-xs text-green-400 bg-green-500/10 border border-green-700/40 px-2 py-0.5 rounded-full">From EXIF</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {analysis.exif.make  && <InfoRow label="Make"  value={analysis.exif.make} />}
                  {analysis.exif.model && <InfoRow label="Model" value={analysis.exif.model} />}
                  {analysis.exif.lens  && <InfoRow label="Lens"  value={analysis.exif.lens} />}
                  {analysis.exif.dateTimeOriginal && <InfoRow label="Date Taken" value={String(analysis.exif.dateTimeOriginal)} />}
                  {analysis.exif.iso      && <InfoRow label="ISO"      value={String(analysis.exif.iso)} />}
                  {analysis.exif.fNumber  && <InfoRow label="Aperture" value={`f/${analysis.exif.fNumber}`} />}
                  {analysis.exif.exposureTime && <InfoRow label="Shutter" value={analysis.exif.exposureTime} />}
                  {analysis.exif.focalLength  && <InfoRow label="Focal Length" value={`${analysis.exif.focalLength}mm`} />}
                  {analysis.exif.flash        && <InfoRow label="Flash"  value={analysis.exif.flash} />}
                  {analysis.exif.software     && <InfoRow label="Software" value={analysis.exif.software} />}
                </div>
              </div>
            )}

            {/* ── GPS ─────────────────────────────────────────── */}
            {analysis.hasGps && (
              <div className="rounded-2xl p-5 border border-blue-700/40 bg-blue-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <p className="font-semibold text-white">GPS Location</p>
                  <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-700/40 px-2 py-0.5 rounded-full">Location data embedded</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <InfoRow label="Latitude"  value={analysis.exif.gpsLat?.toFixed(6) ?? ''} />
                  <InfoRow label="Longitude" value={analysis.exif.gpsLon?.toFixed(6) ?? ''} />
                </div>
                <motion.a
                  whileHover={{ scale: 1.01 }}
                  href={`https://www.google.com/maps?q=${analysis.exif.gpsLat},${analysis.exif.gpsLon}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-blue-400 text-xs hover:text-blue-300 transition-colors"
                >
                  <MapPin className="w-3 h-3" /> View on Google Maps →
                </motion.a>
              </div>
            )}

            {/* ── Integrity Warnings ───────────────────────────── */}
            {(analysis.isJpegRecompressed || !analysis.hasExif) && (
              <div className="rounded-2xl p-5 border border-amber-700/40 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <p className="font-semibold text-white">Integrity Notes</p>
                </div>
                <div className="space-y-2">
                  {analysis.isJpegRecompressed && (
                    <div className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                      <p className="text-amber-200/80">Image has been recompressed (quality ~{analysis.estimatedJpegQuality}%). PINIT LSB data and original EXIF may be lost.</p>
                    </div>
                  )}
                  {!analysis.hasExif && (
                    <div className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                      <p className="text-amber-200/80">No EXIF metadata found. Could indicate screenshot, social media strip, or AI-generated image.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Analysis time ────────────────────────────────── */}
            <div className="flex items-center gap-2 text-slate-500 text-xs px-1">
              <Clock className="w-3 h-3" />
              <span>Analyzed: {new Date(analysis.analyzedAt).toLocaleString()}</span>
            </div>

            {/* ── Download Report ──────────────────────────────── */}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={downloadReport}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Download Full Report
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Small helper component ────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-slate-500 text-xs">{label}</span>
    <span className="text-slate-200 text-sm font-medium truncate">{value}</span>
  </div>
);

export default ImageAnalyzer;
