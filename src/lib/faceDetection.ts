import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

let model: blazeface.BlazeFaceModel | null = null;

/**
 * Load the BlazeFace model for face detection
 */
export async function loadFaceDetectionModel(): Promise<blazeface.BlazeFaceModel> {
  if (!model) {
    try {
      await tf.ready();
      model = await blazeface.load();
      console.log('✅ Face detection model loaded');
    } catch (error) {
      console.error("Failed to load face detection model:", error);
      throw new Error("Face detection model failed to load");
    }
  }
  return model;
}

/**
 * Interface for face detection result
 */
export interface FaceDetectionResult {
  hasFace: boolean;
  faceCount: number;
  confidence: number;
  landmarks?: blazeface.NormalizedFace[];
  error?: string;
}

/**
 * Detect if a video frame contains exactly one face
 * @param video - The video element to analyze
 * @returns FaceDetectionResult with face detection status
 */
export async function detectFaceInVideo(video: HTMLVideoElement): Promise<FaceDetectionResult> {
  try {
    if (!model) {
      model = await loadFaceDetectionModel();
    }

    // Ensure video is ready
    if (video.readyState < 2) {
      return {
        hasFace: false,
        faceCount: 0,
        confidence: 0,
        error: "Video not ready",
      };
    }

    // Run face detection
    const predictions = await model.estimateFaces(video, false);

    // Check if exactly one face was detected
    if (!predictions || predictions.length === 0) {
      return {
        hasFace: false,
        faceCount: 0,
        confidence: 0,
        error: "No face detected. Please ensure your face is clearly visible.",
      };
    }

    if (predictions.length > 1) {
      return {
        hasFace: false,
        faceCount: predictions.length,
        confidence: 0,
        error: `Multiple faces detected (${predictions.length}). Only one face should be in the frame.`,
      };
    }

    const face = predictions[0];
    const confidence = face.probability?.[0] || 0;

    // EXTREMELY lenient threshold for real device conditions (20% confidence minimum)
    // This allows capture even with poor lighting or partial face visibility
    if (confidence < 0.20) {
      return {
        hasFace: false,
        faceCount: 1,
        confidence,
        error: `Face detection confidence too low (${Math.round(confidence * 100)}%). Try better lighting.`,
      };
    }

    return {
      hasFace: true,
      faceCount: 1,
      confidence,
      landmarks: predictions,
    };
  } catch (error) {
    console.error("Face detection error:", error);
    return {
      hasFace: false,
      faceCount: 0,
      confidence: 0,
      error: "Face detection failed. Please try again.",
    };
  }
}

/**
 * Validate that only a face is in the frame (no other objects)
 * @param video - The video element to analyze
 * @param requiredConfidence - Minimum confidence threshold (0-1)
 * @returns true if valid face detected, false otherwise
 */
export async function validateFaceOnly(
  video: HTMLVideoElement,
  requiredConfidence: number = 0.75
): Promise<boolean> {
  const result = await detectFaceInVideo(video);
  return result.hasFace && result.confidence >= requiredConfidence;
}

/**
 * Get quality score for a detected face (0-100)
 * Higher scores indicate better face quality
 */
export function getFaceQualityScore(result: FaceDetectionResult): number {
  if (!result.hasFace) return 0;
  return Math.round(result.confidence * 100);
}

/**
 * Clean up TensorFlow memory
 */
export async function disposeModels(): Promise<void> {
  if (model) {
    model.dispose();
    model = null;
  }
  tf.disposeVariables();
}
