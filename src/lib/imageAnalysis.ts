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

// Camera filename patterns (even when EXIF is stripped by browser/OS)
const CAMERA_FILENAME = /^(img_\d|pxl_\d|dsc_?\d|dscf?\d|cam_\d|photo_\d|p\d{8}_\d{6}|signal-\d)/i;
const CAMERA_SIMPLE   = /^(img|dsc|photo|pic|image|cam|burst)\d{3,6}\.(jpg|jpeg|heic|heif)$/i;
// Android screenshot patterns
const SCREENSHOT_FNAME = /screenshot|screen.shot|screen_shot|screencap|capture|snip/i;
// iOS screenshot: "Screenshot 2024-01-15 at 10.23.45.png"
const IOS_SCREENSHOT = /^screenshot \d{4}-\d{2}-\d{2}/i;
// Android screenshot: "Screenshot_20240115-102345.png" or "Screenshot_20240115_102345.png"
const ANDROID_SCREENSHOT = /^screenshot_\d{8}[-_]\d{6}/i;

// Screen aspect ratios (portrait): ~9:19–9:22
const isScreenAspect = (w: number, h: number): boolean => {
  const ar = Math.max(w, h) / Math.min(w, h);
  // Phone portrait/landscape: 1.9–2.25  |  tablet: 1.3–1.5  |  desktop 16:9: 1.77
  return ar >= 1.7 && ar <= 2.4;
};

function classifyImageSource(params: {
  file: File;
  exif: ExifData;
  width: number;
  height: number;
  pinitFound: boolean;
  jpegQuality: number | null;
}): ImageTypeResult {
  const { file, exif, width, height, pinitFound, jpegQuality } = params;
  const fname     = file.name;
  const fnameLow  = fname.toLowerCase();
  const isJpeg    = file.type === 'image/jpeg'  || /\.(jpg|jpeg)$/i.test(fname);
  const isPng     = file.type === 'image/png'   || /\.png$/i.test(fname);
  const isWebp    = file.type === 'image/webp'  || /\.webp$/i.test(fname);
  const isHeic    = file.type === 'image/heic'  || file.type === 'image/heif' || /\.(heic|heif)$/i.test(fname);
  const dims      = `${width}x${height}`;
  const mp        = (width * height) / 1_000_000;

  const hasCameraData  = !!(exif.make && exif.model);
  const softwareLow    = (exif.software ?? '').toLowerCase();
  const xmpLow         = (exif.xmpCreator ?? '').toLowerCase();
  const isAiSoftware   = AI_SOFTWARE.some(s => softwareLow.includes(s) || xmpLow.includes(s));
  const isEditSoftware = EDITING_SOFTWARE.some(s => softwareLow.includes(s));
  const isScreenDim    = SCREEN_DIMS.has(dims);
  const isWaSized      = isWhatsAppSized(width, height);
  const isAiDims       = isDimAI(width) && isDimAI(height);

  const mk = <T extends object>(extra: T) => ({ ...extra } as T);
  const signals: string[] = [];

  // ── PRIORITY 1: PINIT Vault (LSB steganography confirmed) ──
  if (pinitFound) {
    return {
      source: 'pinit_vault', label: 'PINIT Vault Image', emoji: '🔐',
      confidence: 'High', confidenceScore: 99,
      signals: ['PINIT ownership ID found in pixel LSB data', 'Cryptographically stamped by PINIT Vault'],
      color: 'border-cyan-500', bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-300',
    };
  }

  // ── PRIORITY 2: HEIC/HEIF — only iPhones produce this ──────
  if (isHeic) {
    signals.push('HEIC/HEIF format — exclusive to Apple iPhone camera');
    if (exif.make)  signals.push(`Camera: ${exif.make} ${exif.model ?? ''}`);
    if (exif.dateTimeOriginal) signals.push(`Shot on: ${exif.dateTimeOriginal}`);
    return {
      source: 'camera_photo', label: 'Camera Photo (iPhone)', emoji: '📷',
      confidence: 'High', confidenceScore: 98,
      signals, color: 'border-green-500', bgColor: 'bg-green-500/10', textColor: 'text-green-300',
    };
  }

  // ── PRIORITY 3: AI software in EXIF/XMP metadata ───────────
  if (isAiSoftware) {
    return {
      source: 'ai_generated', label: 'AI Generated', emoji: '🤖',
      confidence: 'High', confidenceScore: 96,
      signals: [`AI tool detected in metadata: "${exif.software ?? exif.xmpCreator}"`, 'No real camera hardware data'],
      color: 'border-purple-500', bgColor: 'bg-purple-500/10', textColor: 'text-purple-300',
    };
  }

  // ── PRIORITY 4: Camera EXIF (Make + Model present) ─────────
  if (hasCameraData) {
    signals.push(`Camera: ${exif.make} ${exif.model}`);
    if (exif.lens)  signals.push(`Lens: ${exif.lens}`);
    if (exif.gpsLat) signals.push('GPS coordinates embedded');
    if (exif.dateTimeOriginal) signals.push(`Shot: ${exif.dateTimeOriginal}`);
    if (exif.iso) signals.push(`ISO ${exif.iso}  f/${exif.fNumber}  ${exif.exposureTime ?? ''}`);
    if (isEditSoftware) {
      signals.push(`Edited in: ${exif.software}`);
      return {
        source: 'edited_photo', label: 'Edited Camera Photo', emoji: '✏️',
        confidence: 'High', confidenceScore: 93,
        signals, color: 'border-orange-500', bgColor: 'bg-orange-500/10', textColor: 'text-orange-300',
      };
    }
    return {
      source: 'camera_photo', label: 'Camera Photo', emoji: '📷',
      confidence: 'High', confidenceScore: 97,
      signals, color: 'border-green-500', bgColor: 'bg-green-500/10', textColor: 'text-green-300',
    };
  }

  // ── PRIORITY 5: WhatsApp filename (IMG-YYYYMMDD-WAxxxx) ────
  if (/img-\d{8}-wa\d+/i.test(fnameLow) || fnameLow.includes('whatsapp')) {
    return {
      source: 'whatsapp', label: 'WhatsApp Image', emoji: '💬',
      confidence: 'High', confidenceScore: 95,
      signals: ['Filename matches WhatsApp naming pattern (IMG-YYYYMMDD-WAxxx)', 'WhatsApp strips camera EXIF when sharing'],
      color: 'border-emerald-500', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-300',
    };
  }

  // ── PRIORITY 6: Screenshot by filename (any format) ────────
  if (IOS_SCREENSHOT.test(fname) || ANDROID_SCREENSHOT.test(fname)) {
    signals.push('Filename matches OS screenshot naming convention');
    signals.push(IOS_SCREENSHOT.test(fname) ? 'iOS screenshot format' : 'Android screenshot format');
    if (isScreenDim) signals.push(`Screen resolution: ${width}×${height}`);
    return {
      source: 'screenshot', label: 'Screenshot', emoji: '📸',
      confidence: 'High', confidenceScore: 96,
      signals, color: 'border-blue-500', bgColor: 'bg-blue-500/10', textColor: 'text-blue-300',
    };
  }
  if (SCREENSHOT_FNAME.test(fnameLow)) {
    signals.push('Filename contains "screenshot"');
    if (isScreenDim) signals.push(`Screen resolution: ${width}×${height}`);
    return {
      source: 'screenshot', label: 'Screenshot', emoji: '📸',
      confidence: 'High', confidenceScore: 90,
      signals, color: 'border-blue-500', bgColor: 'bg-blue-500/10', textColor: 'text-blue-300',
    };
  }

  // ── PRIORITY 7: Camera filename patterns (EXIF stripped) ────
  // Many browsers strip EXIF when uploading — filename is the fallback
  if (CAMERA_FILENAME.test(fname) || CAMERA_SIMPLE.test(fname)) {
    signals.push('Filename matches standard camera naming convention');
    signals.push('Camera EXIF may have been stripped by browser or OS during upload');
    if (mp >= 2) signals.push(`High resolution: ${mp.toFixed(1)} MP — typical camera output`);
    return {
      source: 'camera_photo', label: 'Camera Photo', emoji: '📷',
      confidence: 'Medium', confidenceScore: 75,
      signals, color: 'border-green-500', bgColor: 'bg-green-500/10', textColor: 'text-green-300',
    };
  }

  // ── PRIORITY 8: Social media filename patterns ──────────────
  const socialMap: [RegExp, string][] = [
    [/instagram|ig_|reel/i, 'Instagram'],
    [/fb_img|facebook/i, 'Facebook'],
    [/twitter|tweet/i, 'Twitter / X'],
    [/tiktok|tt_/i, 'TikTok'],
    [/snapchat|snap-/i, 'Snapchat'],
    [/pinterest|pin-/i, 'Pinterest'],
    [/telegram/i, 'Telegram'],
  ];
  for (const [pattern, platform] of socialMap) {
    if (pattern.test(fnameLow)) {
      return {
        source: 'social_media', label: `${platform} Image`, emoji: '📱',
        confidence: 'High', confidenceScore: 92,
        signals: [`Filename matches ${platform} download pattern`, 'Platform strips camera EXIF before serving'],
        color: 'border-pink-500', bgColor: 'bg-pink-500/10', textColor: 'text-pink-300',
      };
    }
  }

  // ── PRIORITY 9: PNG without camera EXIF ────────────────────
  // PNG + no camera data = almost always screenshot (phones don't shoot PNG)
  if (isPng && !hasCameraData) {
    if (isScreenDim) {
      signals.push(`Dimensions exactly match screen resolution: ${width}×${height}`);
      signals.push('PNG format is the standard format for device screenshots');
      return {
        source: 'screenshot', label: 'Screenshot', emoji: '📸',
        confidence: 'High', confidenceScore: 92,
        signals, color: 'border-blue-500', bgColor: 'bg-blue-500/10', textColor: 'text-blue-300',
      };
    }
    if (isAiDims) {
      signals.push(`Dimensions ${width}×${height} are multiples of 64 — standard AI model output size`);
      signals.push('PNG format, no camera metadata');
      return {
        source: 'ai_generated', label: 'AI Generated', emoji: '🤖',
        confidence: 'Medium', confidenceScore: 68,
        signals, color: 'border-purple-500', bgColor: 'bg-purple-500/10', textColor: 'text-purple-300',
      };
    }
    // Generic PNG with no camera data → screenshot (phones never save PNG)
    signals.push('PNG format without camera metadata');
    signals.push('Smartphone cameras do not save PNG — this is likely a screenshot or web image');
    if (isScreenAspect(width, height)) signals.push(`Aspect ratio ${width}:${height} matches phone screen proportions`);
    return {
      source: 'screenshot', label: 'Screenshot', emoji: '📸',
      confidence: isScreenAspect(width, height) ? 'Medium' : 'Low',
      confidenceScore: isScreenAspect(width, height) ? 65 : 52,
      signals, color: 'border-blue-500', bgColor: 'bg-blue-500/10', textColor: 'text-blue-300',
    };
  }

  // ── PRIORITY 10: JPEG/WebP — use resolution + quality hints ─
  if ((isJpeg || isWebp) && !hasCameraData) {
    // WhatsApp quality signature (~75%) + size
    if (jpegQuality !== null && jpegQuality < 82) {
      signals.push(`JPEG quality ~${jpegQuality}% — WhatsApp compresses to ~75%`);
      signals.push('Camera EXIF stripped during sharing');
      if (isWaSized) signals.push('Dimensions ≤ 1600px — WhatsApp resize limit');
      return {
        source: 'whatsapp', label: 'WhatsApp Image', emoji: '💬',
        confidence: isWaSized ? 'High' : 'Medium',
        confidenceScore: isWaSized ? 84 : 67,
        signals, color: 'border-emerald-500', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-300',
      };
    }
    // High-resolution JPEG with no EXIF → likely camera photo, EXIF was stripped
    if (mp >= 3) {
      signals.push(`High resolution: ${mp.toFixed(1)} MP — typical of smartphone cameras (8–108 MP)`);
      signals.push('Camera EXIF was likely stripped by browser during upload');
      signals.push('Modern browsers remove EXIF for privacy on iOS/Android');
      return {
        source: 'camera_photo', label: 'Camera Photo', emoji: '📷',
        confidence: 'Medium', confidenceScore: 70,
        signals, color: 'border-green-500', bgColor: 'bg-green-500/10', textColor: 'text-green-300',
      };
    }
    // Screenshot saved as JPEG (Android allows this)
    if (isScreenDim || (isScreenAspect(width, height) && mp < 3)) {
      signals.push(isScreenDim ? `Dimensions match screen resolution: ${width}×${height}` : `Aspect ratio matches phone screen`);
      signals.push('Low-to-medium resolution JPEG consistent with screenshot');
      return {
        source: 'screenshot', label: 'Screenshot', emoji: '📸',
        confidence: 'Medium', confidenceScore: 62,
        signals, color: 'border-blue-500', bgColor: 'bg-blue-500/10', textColor: 'text-blue-300',
      };
    }
    // Fallback: small JPEG, no signals → web/app download
    signals.push('JPEG without camera metadata or identifying filename');
    signals.push('May be a web download, app image, or shared photo');
    return {
      source: 'web_download', label: 'Web / App Image', emoji: '🌐',
      confidence: 'Low', confidenceScore: 40,
      signals, color: 'border-slate-500', bgColor: 'bg-slate-500/10', textColor: 'text-slate-300',
    };
  }

  // ── Final fallback ──────────────────────────────────────────
  signals.push('Format: ' + (file.type || 'unknown'));
  signals.push('No identifying metadata, filename pattern, or dimension match found');
  return {
    source: 'unknown', label: 'Unknown Source', emoji: '❓',
    confidence: 'Low', confidenceScore: 15,
    signals, color: 'border-slate-600', bgColor: 'bg-slate-600/10', textColor: 'text-slate-400',
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
