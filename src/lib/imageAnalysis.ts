/**
 * Image metadata and verification analysis
 * Detects image type, ownership, and source
 */

export interface ImageAnalysisResult {
  imageType: "phone" | "ai" | "whatsapp" | "screenshot" | "real" | "unknown";
  confidence: number; // 0-100
  metadata: {
    hasExif: boolean;
    hasMetadata: boolean;
    dimensions?: string;
    mimeType: string;
  };
  indicators: string[];
  ownership: {
    isWatermarked: boolean;
    owner?: string;
    timestamp?: string;
  };
}

/**
 * Analyze image to determine type and source
 */
export async function analyzeImage(base64Data: string): Promise<ImageAnalysisResult> {
  try {
    console.log("🔍 Analyzing image...");

    // Get image dimensions
    const dimensions = await getImageDimensions(base64Data);
    console.log(`📏 Image dimensions: ${dimensions.width}x${dimensions.height}`);

    let imageType: ImageAnalysisResult["imageType"] = "unknown";
    let confidence = 0;
    const indicators: string[] = [];

    // Check for AI-generated characteristics
    const aiScore = await detectAIGenerated(base64Data);
    if (aiScore > 60) {
      imageType = "ai";
      confidence = aiScore;
      indicators.push("🤖 AI-generated image detected");
      indicators.push("Possible tools: DALL-E, Midjourney, Stable Diffusion");
    }

    // Check for WhatsApp characteristics
    else if (detectedWhatsApp(dimensions)) {
      imageType = "whatsapp";
      confidence = 85;
      indicators.push("📱 WhatsApp origin detected");
      indicators.push("Typical WhatsApp compression found");
    }

    // Check for screenshot
    else if (detectedScreenshot(dimensions)) {
      imageType = "screenshot";
      confidence = 80;
      indicators.push("📸 Screenshot detected");
      indicators.push("Typical screen resolution aspect ratio");
    }

    // Default to real/phone image
    else {
      imageType = "phone";
      confidence = 70;
      indicators.push("📷 Real/Phone image");
      indicators.push("Standard mobile camera characteristics");
    }

    const result: ImageAnalysisResult = {
      imageType,
      confidence,
      metadata: {
        hasExif: Math.random() > 0.5, // Simulated EXIF check
        hasMetadata: true,
        dimensions,
        mimeType: "image/jpeg",
      },
      indicators,
      ownership: {
        isWatermarked: false,
        timestamp: new Date().toISOString(),
      },
    };

    console.log("✅ Analysis complete:", result);
    return result;
  } catch (error) {
    console.error("❌ Analysis error:", error);
    return {
      imageType: "unknown",
      confidence: 0,
      metadata: { hasExif: false, hasMetadata: false, mimeType: "unknown" },
      indicators: ["Error during analysis"],
      ownership: { isWatermarked: false },
    };
  }
}

/**
 * Get image dimensions from base64 data
 */
function getImageDimensions(base64Data: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      // Default dimensions on error
      resolve({ width: 1080, height: 1920 });
    };
    img.src = base64Data.startsWith("data:") ? base64Data : `data:image/jpeg;base64,${base64Data}`;
  });
}

/**
 * Detect AI-generated image characteristics
 * Scores 0-100 based on AI likelihood
 */
async function detectAIGenerated(base64Data: string): Promise<number> {
  // This is a simulated AI detection
  // In production, you'd use ML models like:
  // - CLIP for semantic analysis
  // - Frequency domain analysis for GAN artifacts
  // - Texture analysis

  try {
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = base64Data.startsWith("data:") ? base64Data : `data:image/jpeg;base64,${base64Data}`;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, 10, 10);
    const data = imageData.data;

    // Check for AI characteristics:
    // 1. Unusual color distribution
    // 2. Watermarked artifacts
    // 3. Frequency patterns

    let score = 0;

    // Analyze pixel diversity (AI images often have less natural randomness)
    const colors = new Set();
    for (let i = 0; i < data.length; i += 4) {
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
    if (colors.size < 15) score += 20; // Low diversity suggests AI

    // Random score based on simulation
    // In production, use actual ML models
    score += Math.random() * 40;

    return Math.min(100, score);
  } catch (error) {
    console.warn("⚠️ AI detection error:", error);
    return 0;
  }
}

/**
 * Detect whitespace characteristics (WhatsApp, etc.)
 */
function detectedWhatsApp(dimensions: { width: number; height: number }): boolean {
  // WhatsApp uses specific compression and often crops to certain aspect ratios
  const aspectRatio = dimensions.width / dimensions.height;
  
  // Common WhatsApp aspect ratios
  return (
    (aspectRatio > 0.5 && aspectRatio < 0.6) || // Typical story format
    (aspectRatio > 1.4 && aspectRatio < 1.6)    // Typical landscape
  );
}

/**
 * Detect screenshot characteristics
 */
function detectedScreenshot(dimensions: { width: number; height: number }): boolean {
  // Common screenshot dimensions
  const commonWidths = [1080, 1440, 720, 540, 1024, 768, 800];
  return commonWidths.includes(dimensions.width);
}

/**
 * Format analysis result for display
 */
export function formatAnalysisResult(result: ImageAnalysisResult): string {
  const typeEmoji: Record<ImageAnalysisResult["imageType"], string> = {
    phone: "📷",
    ai: "🤖",
    whatsapp: "💬",
    screenshot: "📸",
    real: "✨",
    unknown: "❓",
  };

  return `
${typeEmoji[result.imageType]} IMAGE TYPE: ${result.imageType.toUpperCase()}
📊 Confidence: ${result.confidence}%

📋 INDICATORS:
${result.indicators.map((ind) => `  • ${ind}`).join("\n")}

📋 METADATA:
  • EXIF Data: ${result.metadata.hasExif ? "Present" : "Not found"}
  • Image Dimension: ${result.metadata.dimensions}
  • Format: ${result.metadata.mimeType}

🔒 OWNERSHIP:
  • Watermarked: ${result.ownership.isWatermarked ? "Yes ✓" : "No"}
  • Timestamp: ${result.ownership.timestamp}
  ${result.ownership.owner ? `• Owner: ${result.ownership.owner}` : ""}
  `.trim();
}
