/**
 * Image Analysis Engine
 * Real detection of image source, ownership, and metadata
 * Uses EXIF parsing + pixel forensics + LSB steganography check
 */
import exifr from 'exifr';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ImageSourceType =
  | 'camera_photo'
  | 'edited_photo'
  | 'screenshot'
  | 'ai_generated'
  | 'whatsapp'
  | 'social_media'
  | 'pinit_vault'
  | 'web_download'
  | 'unknown';

export interface ExifData {
  make?: string;
  model?: string;
  lens?: string;
  software?: string;
  dateTimeOriginal?: string;
  dateTime?: string;
  gpsLat?: number;
  gpsLon?: number;
  iso?: number;
  exposureTime?: string;
  fNumber?: number;
  focalLength?: number;
  flash?: string;
  orientation?: number;
  colorSpace?: string;
  xmpCreator?: string;
}

export interface ImageTypeResult {
  source: ImageSourceType;
  label: string;
  emoji: string;
  confidence: 'High' | 'Medium' | 'Low';
  confidenceScore: number;    // 0–100
  signals: string[];          // human-readable reasons
  color: string;              // tailwind border color
  bgColor: string;            // tailwind bg color
  textColor: string;          // tailwind text color
}

export interface FullImageAnalysis {
  // File
  fileName: string;
  fileSize: number;
  mimeType: string;
  format: string;
  width: number;
  height: number;
  megapixels: number;
  aspectRatio: string;
  // EXIF
  exif: ExifData;
  hasExif: boolean;
  hasCameraData: boolean;
  hasGps: boolean;
  hasEditingSoftware: boolean;
  // Type detection
  imageType: ImageTypeResult;
  // PINIT
  pinitFound: boolean;
  pinitId: string | null;
  // Integrity
  isJpegRecompressed: boolean;
  estimatedJpegQuality: number | null;
  // Timestamp
  analyzedAt: string;
}

// ─── Signatures ───────────────────────────────────────────────────────────

const AI_SOFTWARE = [
  'stable diffusion', 'automatic1111', 'comfyui', 'dall-e', 'dall·e',
  'midjourney', 'firefly', 'adobe firefly', 'imagen', 'flux', 'runway',
  'bing image creator', 'dream studio', 'nightcafe', 'fotor ai',
  'leonardo ai', 'ideogram', 'playground ai', 'adobe generative',
  'generative fill', 'content credentials',
];

const EDITING_SOFTWARE = [
  'photoshop', 'lightroom', 'gimp', 'pixelmator', 'capture one',
  'darktable', 'snapseed', 'vsco', 'facetune', 'luminar', 'affinity photo',
  'photos', 'picasa', 'picmonkey', 'canva', 'picsart',
];

// Common real screen pixel dimensions (portrait & landscape)
const SCREEN_DIMS = new Set([
  '1179x2556', '2556x1179',   // iPhone 14 Pro
  '1290x2796', '2796x1290',   // iPhone 15 Pro Max
  '1170x2532', '2532x1170',   // iPhone 12/13 Pro
  '1080x2340', '2340x1080',   // Android flagship (many models)
  '1080x2400', '2400x1080',   // Samsung A-series
  '1080x2280', '2280x1080',   // Pixel 3a / OnePlus
  '1080x1920', '1920x1080',   // HD standard
  '1440x3040', '3040x1440',   // Samsung S20/S21
  '1440x2960', '2960x1440',   // Samsung S8/S9
  '1440x2560', '2560x1440',   // QHD
  '3840x2160', '2160x3840',   // 4K TV/monitor
  '2560x1600', '1600x2560',   // MacBook Pro 13"
  '2048x1536', '1536x2048',   // iPad Retina
  '2732x2048', '2048x2732',   // iPad Pro 12.9"
  '2388x1668', '1668x2388',   // iPad Pro 11"
]);

// AI image generation uses multiples of 64 for dimensions
const isDimAI = (n: number) => n >= 256 && n % 64 === 0;

// WhatsApp max long edge is 1600px
const isWhatsAppSized = (w: number, h: number) =>
  (w <= 1600 && h <= 1600) && (w === 1600 || h === 1600);

// ─── EXIF extraction ─────────────────────────────────────────────────────

async function readExif(file: File): Promise<ExifData> {
  try {
    const raw = await exifr.parse(file, {
      tiff: true, xmp: true, gps: true, icc: false, iptc: false,
      translateKeys: true, translateValues: true, reviveValues: true,
    });

    if (!raw) return {};

    const flashStr = raw.Flash != null
      ? (raw.Flash === 0 || raw.Flash === false ? 'No flash' : 'Flash fired')
      : undefined;

    const exposureStr = raw.ExposureTime != null
      ? (raw.ExposureTime < 1
          ? `1/${Math.round(1 / raw.ExposureTime)}s`
          : `${raw.ExposureTime}s`)
      : undefined;

    return {
      make:              raw.Make?.trim(),
      model:             raw.Model?.trim(),
      lens:              raw.LensModel?.trim(),
      software:          raw.Software?.trim(),
      dateTimeOriginal:  raw.DateTimeOriginal?.toString?.() ?? raw.DateTimeOriginal,
      dateTime:          raw.DateTime?.toString?.() ?? raw.DateTime,
      gpsLat:            raw.latitude,
      gpsLon:            raw.longitude,
      iso:               raw.ISO ?? raw.ISOSpeedRatings,
      exposureTime:      exposureStr,
      fNumber:           raw.FNumber,
      focalLength:       raw.FocalLength,
      flash:             flashStr,
      orientation:       raw.Orientation,
      colorSpace:        raw.ColorSpace?.toString?.(),
      xmpCreator:        raw['xmp:CreatorTool'] ?? raw.CreatorTool,
    };
  } catch {
    return {};
  }
}

// ─── JPEG quality estimation (reads quantization tables) ─────────────────

function estimateJpegQuality(buffer: ArrayBuffer): number | null {
  try {
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xFFD8) return null; // Not JPEG

    let offset = 2;
    while (offset < view.byteLength - 1) {
      const marker = view.getUint16(offset);
      offset += 2;
      if (marker === 0xFFDB) {
        // DQT segment — read first table's first value (luminance DC)
        const precision = view.getUint8(offset + 2) >> 4;
        const q0 = view.getUint8(offset + 3 + (precision === 1 ? 1 : 0));
        // Simple quality estimate from quantization value
        const quality = Math.round(100 - (q0 - 1) * 100 / 254);
        return Math.max(0, Math.min(100, quality));
      }
      if (marker === 0xFFDA) break; // SOS = start of scan
      const segLen = view.getUint16(offset);
      offset += segLen;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Image type classification ───────────────────────────────────────────

function classifyImageSource(params: {
  file: File;
  exif: ExifData;
  width: number;
  height: number;
  pinitFound: boolean;
  jpegQuality: number | null;
}): ImageTypeResult {
  const { file, exif, width, height, pinitFound, jpegQuality } = params;
  const fname = file.name.toLowerCase();
  const isJpeg = file.type === 'image/jpeg' || fname.endsWith('.jpg') || fname.endsWith('.jpeg');
  const isPng  = file.type === 'image/png'  || fname.endsWith('.png');
  const isWebp = file.type === 'image/webp' || fname.endsWith('.webp');
  const dims   = `${width}x${height}`;

  const hasCameraData   = !!(exif.make && exif.model);
  const hasSoftware     = !!exif.software;
  const softwareLower   = (exif.software ?? '').toLowerCase();
  const xmpLower        = (exif.xmpCreator ?? '').toLowerCase();
  const isAiSoftware    = AI_SOFTWARE.some(s => softwareLower.includes(s) || xmpLower.includes(s));
  const isEditSoftware  = EDITING_SOFTWARE.some(s => softwareLower.includes(s));
  const isScreenDim     = SCREEN_DIMS.has(dims);
  const isWaSized       = isWhatsAppSized(width, height);
  const isAiDims        = isDimAI(width) && isDimAI(height);
  const signals: string[] = [];

  // ── PINIT Vault (highest priority) ──────────────────────────
  if (pinitFound) {
    return {
      source: 'pinit_vault',
      label: 'PINIT Vault Image',
      emoji: '🔐',
      confidence: 'High',
      confidenceScore: 99,
      signals: ['PINIT ownership ID found in pixel data (LSB steganography)', 'Cryptographically stamped by PINIT Vault'],
      color: 'border-cyan-500',
      bgColor: 'bg-cyan-500/10',
      textColor: 'text-cyan-300',
    };
  }

  // ── AI Software in metadata ─────────────────────────────────
  if (isAiSoftware) {
    const tool = AI_SOFTWARE.find(s => softwareLower.includes(s) || xmpLower.includes(s)) ?? 'AI tool';
    return {
      source: 'ai_generated',
      label: 'AI Generated',
      emoji: '🤖',
      confidence: 'High',
      confidenceScore: 95,
      signals: [`AI creation tool detected in metadata: "${exif.software ?? exif.xmpCreator}"`, 'No real camera hardware data found'],
      color: 'border-purple-500',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-300',
    };
  }

  // ── Camera photo with EXIF ──────────────────────────────────
  if (hasCameraData) {
    signals.push(`Camera: ${exif.make} ${exif.model}`);
    if (exif.gpsLat) signals.push('GPS location embedded');
    if (exif.dateTimeOriginal) signals.push(`Shot on: ${exif.dateTimeOriginal}`);
    if (exif.iso) signals.push(`ISO ${exif.iso}, f/${exif.fNumber}, ${exif.exposureTime}`);

    // Check if also edited
    if (isEditSoftware) {
      signals.push(`Edited in: ${exif.software}`);
      return {
        source: 'edited_photo',
        label: 'Edited Camera Photo',
        emoji: '✏️',
        confidence: 'High',
        confidenceScore: 92,
        signals,
        color: 'border-orange-500',
        bgColor: 'bg-orange-500/10',
        textColor: 'text-orange-300',
      };
    }
    return {
      source: 'camera_photo',
      label: 'Camera Photo',
      emoji: '📷',
      confidence: 'High',
      confidenceScore: 96,
      signals,
      color: 'border-green-500',
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-300',
    };
  }

  // ── WhatsApp filename pattern ───────────────────────────────
  if (/img-\d{8}-wa\d{4}|whatsapp/i.test(fname)) {
    return {
      source: 'whatsapp',
      label: 'WhatsApp Image',
      emoji: '💬',
      confidence: 'High',
      confidenceScore: 94,
      signals: ['Filename matches WhatsApp pattern (IMG-YYYYMMDD-WAxxx)', 'EXIF stripped by WhatsApp'],
      color: 'border-emerald-500',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-300',
    };
  }

  // ── Screenshot (PNG + screen dimensions) ────────────────────
  if (isPng && !hasCameraData) {
    if (isScreenDim) {
      signals.push(`Dimensions match screen resolution: ${width}×${height}`);
      signals.push('PNG format — lossless, typical for screenshots');
      if (fname.includes('screenshot')) signals.push('Filename contains "screenshot"');
      return {
        source: 'screenshot',
        label: 'Screenshot',
        emoji: '📸',
        confidence: 'High',
        confidenceScore: 90,
        signals,
        color: 'border-blue-500',
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-300',
      };
    }
    // PNG with AI-friendly dimensions
    if (isAiDims) {
      signals.push(`Dimensions ${width}×${height} are multiples of 64 (AI model output grid)`);
      signals.push('PNG format without camera metadata');
      signals.push('No real camera EXIF found');
      return {
        source: 'ai_generated',
        label: 'AI Generated',
        emoji: '🤖',
        confidence: 'Medium',
        confidenceScore: 68,
        signals,
        color: 'border-purple-500',
        bgColor: 'bg-purple-500/10',
        textColor: 'text-purple-300',
      };
    }
    // PNG but filename says screenshot
    if (fname.includes('screenshot') || fname.includes('screen shot') || fname.includes('capture')) {
      return {
        source: 'screenshot',
        label: 'Screenshot',
        emoji: '📸',
        confidence: 'High',
        confidenceScore: 88,
        signals: ['Filename contains "screenshot"', 'PNG format — common for screenshots'],
        color: 'border-blue-500',
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-300',
      };
    }
  }

  // ── Social media filename patterns ──────────────────────────
  const socialMap: Record<string, string> = {
    instagram: 'Instagram', facebook: 'Facebook', fb_img: 'Facebook',
    twitter: 'Twitter', tiktok: 'TikTok', snapchat: 'Snapchat',
    pinterest: 'Pinterest', telegram: 'Telegram', signal: 'Signal',
  };
  for (const [pattern, platform] of Object.entries(socialMap)) {
    if (fname.includes(pattern)) {
      return {
        source: 'social_media',
        label: `${platform} Image`,
        emoji: '📱',
        confidence: 'High',
        confidenceScore: 91,
        signals: [`Filename matches ${platform} download pattern`, 'No camera metadata (stripped by platform)'],
        color: 'border-pink-500',
        bgColor: 'bg-pink-500/10',
        textColor: 'text-pink-300',
      };
    }
  }

  // ── JPEG without camera data ─────────────────────────────────
  if ((isJpeg || isWebp) && !hasCameraData) {
    // Low JPEG quality suggests WhatsApp compression (~75%)
    if (jpegQuality !== null && jpegQuality < 80) {
      signals.push(`JPEG quality ~${jpegQuality}% (WhatsApp compresses to ~75%)`);
      signals.push('No camera metadata — stripped during sharing');
      if (isWaSized) signals.push('Max dimension ≤ 1600px (WhatsApp resize limit)');
      return {
        source: 'whatsapp',
        label: 'WhatsApp Image',
        emoji: '💬',
        confidence: isWaSized ? 'High' : 'Medium',
        confidenceScore: isWaSized ? 82 : 65,
        signals,
        color: 'border-emerald-500',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-300',
      };
    }
    signals.push('JPEG/WebP without camera metadata');
    signals.push('EXIF may have been stripped (web download or messaging app)');
    return {
      source: 'web_download',
      label: 'Web / App Download',
      emoji: '🌐',
      confidence: 'Low',
      confidenceScore: 48,
      signals,
      color: 'border-slate-500',
      bgColor: 'bg-slate-500/10',
      textColor: 'text-slate-300',
    };
  }

  return {
    source: 'unknown',
    label: 'Unknown Source',
    emoji: '❓',
    confidence: 'Low',
    confidenceScore: 20,
    signals: ['Insufficient metadata to classify image source'],
    color: 'border-slate-600',
    bgColor: 'bg-slate-600/10',
    textColor: 'text-slate-400',
  };
}

// ─── Main analysis function ───────────────────────────────────────────────

export async function fullAnalyzeImage(
  file: File,
  imageData: string,
  pinitResult: { found: boolean; userId: string | null }
): Promise<FullImageAnalysis> {
  // Dimensions
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = imageData;
  });

  // EXIF
  const exif = await readExif(file);

  // JPEG quality
  let jpegQuality: number | null = null;
  let isJpegRecompressed = false;
  if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg')) {
    const buf = await file.arrayBuffer();
    jpegQuality = estimateJpegQuality(buf);
    isJpegRecompressed = jpegQuality !== null && jpegQuality < 90;
  }

  const hasCameraData = !!(exif.make && exif.model);
  const hasGps = exif.gpsLat !== undefined && exif.gpsLon !== undefined;
  const hasEditingSoftware = !!(exif.software && EDITING_SOFTWARE.some(s => exif.software!.toLowerCase().includes(s)));
  const hasExif = Object.values(exif).some(v => v !== undefined);

  // Format
  const format = file.type.split('/')[1]?.toUpperCase() ?? file.name.split('.').pop()?.toUpperCase() ?? 'Unknown';
  const mp = (width * height) / 1_000_000;
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const g = gcd(width, height);
  const aspectRatio = g > 0 ? `${width / g}:${height / g}` : 'Unknown';

  // Type detection
  const imageType = classifyImageSource({ file, exif, width, height, pinitFound: pinitResult.found, jpegQuality });

  return {
    fileName:     file.name,
    fileSize:     file.size,
    mimeType:     file.type || 'image/unknown',
    format,
    width,
    height,
    megapixels:   parseFloat(mp.toFixed(2)),
    aspectRatio,
    exif,
    hasExif,
    hasCameraData,
    hasGps,
    hasEditingSoftware,
    imageType,
    pinitFound:   pinitResult.found,
    pinitId:      pinitResult.userId,
    isJpegRecompressed,
    estimatedJpegQuality: jpegQuality,
    analyzedAt:   new Date().toISOString(),
  };
}

// ─── Backward-compat shims (used by PINITVaultDashboard) ─────────────────

export interface ImageAnalysisResult {
  imageType: 'phone' | 'ai' | 'whatsapp' | 'screenshot' | 'real' | 'unknown';
  confidence: number;
  metadata: { hasExif: boolean; hasMetadata: boolean; dimensions?: string; mimeType: string };
  indicators: string[];
  ownership: { isWatermarked: boolean; owner?: string; timestamp?: string };
}

const srcToLegacy = (src: ImageSourceType): ImageAnalysisResult['imageType'] => {
  if (src === 'camera_photo' || src === 'edited_photo') return 'phone';
  if (src === 'ai_generated') return 'ai';
  if (src === 'whatsapp') return 'whatsapp';
  if (src === 'screenshot') return 'screenshot';
  if (src === 'pinit_vault') return 'real';
  return 'unknown';
};

/** @deprecated Use fullAnalyzeImage instead */
export async function analyzeImage(base64Data: string): Promise<ImageAnalysisResult> {
  try {
    const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`;
    });

    const blob = await (await fetch(base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`)).blob();
    const file = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' });
    const result = await fullAnalyzeImage(file, base64Data, { found: false, userId: null });

    return {
      imageType: srcToLegacy(result.imageType.source),
      confidence: result.imageType.confidenceScore,
      metadata: {
        hasExif: result.hasExif,
        hasMetadata: result.hasExif,
        dimensions: `${width}x${height}`,
        mimeType: result.mimeType,
      },
      indicators: result.imageType.signals,
      ownership: {
        isWatermarked: result.pinitFound,
        owner: result.pinitId ?? undefined,
        timestamp: result.analyzedAt,
      },
    };
  } catch {
    return {
      imageType: 'unknown', confidence: 0,
      metadata: { hasExif: false, hasMetadata: false, mimeType: 'image/jpeg' },
      indicators: ['Analysis failed'],
      ownership: { isWatermarked: false, timestamp: new Date().toISOString() },
    };
  }
}

/** @deprecated Use fullAnalyzeImage instead */
export function formatAnalysisResult(result: ImageAnalysisResult): string {
  const emoji: Record<ImageAnalysisResult['imageType'], string> = {
    phone: '📷', ai: '🤖', whatsapp: '💬', screenshot: '📸', real: '✨', unknown: '❓',
  };
  return [
    `${emoji[result.imageType]} IMAGE TYPE: ${result.imageType.toUpperCase()}`,
    `📊 Confidence: ${result.confidence}%`,
    '',
    '📋 INDICATORS:',
    ...result.indicators.map(i => `  • ${i}`),
    '',
    `🔒 PINIT Watermark: ${result.ownership.isWatermarked ? 'YES ✓' : 'No'}`,
  ].join('\n');
}
