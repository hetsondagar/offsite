/**
 * Face Recognition Utility using face-api.js
 * Handles face detection and embedding extraction for labour attendance
 */

// Face-api.js types
interface FaceDetection {
  detection: {
    box: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    score: number;
  };
  landmarks?: any;
  descriptor?: Float32Array;
}

let modelsLoaded = false;
let faceapi: any = null;

/**
 * Load face-api.js models
 */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded && faceapi) {
    return;
  }

  try {
    // Dynamically import face-api.js
    faceapi = await import('face-api.js');
    
    const MODEL_URL = '/models'; // Models should be in public/models folder
    
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    
    modelsLoaded = true;
    console.log('Face recognition models loaded');
  } catch (error) {
    console.error('Failed to load face recognition models:', error);
    throw new Error('Face recognition models failed to load. Please ensure models are in /public/models folder.');
  }
}

/**
 * Extract face embedding from an image
 * @param imageUrl Image URL or HTMLImageElement
 * @returns Face embedding array (128 dimensions) or null if no face detected
 */
export async function extractFaceEmbedding(imageUrl: string | HTMLImageElement): Promise<number[] | null> {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  try {
    let img: HTMLImageElement;
    
    if (typeof imageUrl === 'string') {
      img = await faceapi.fetchImage(imageUrl);
    } else {
      img = imageUrl;
    }

    // Detect face and extract descriptor
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) {
      return null;
    }

    // Convert Float32Array to regular array
    return Array.from(detection.descriptor);
  } catch (error) {
    console.error('Error extracting face embedding:', error);
    return null;
  }
}

/**
 * Detect all faces in an image and extract embeddings
 * @param imageUrl Image URL or HTMLImageElement
 * @returns Array of face embeddings with bounding boxes
 */
export async function detectAllFaces(imageUrl: string | HTMLImageElement): Promise<Array<{
  embedding: number[];
  box: { x: number; y: number; width: number; height: number };
  score: number;
}>> {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  try {
    let img: HTMLImageElement;
    
    if (typeof imageUrl === 'string') {
      img = await faceapi.fetchImage(imageUrl);
    } else {
      img = imageUrl;
    }

    // Detect all faces
    const detections = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections || detections.length === 0) {
      return [];
    }

    return detections.map((detection: FaceDetection) => ({
      embedding: Array.from(detection.descriptor!),
      box: detection.detection.box,
      score: detection.detection.score,
    }));
  } catch (error) {
    console.error('Error detecting faces:', error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two face embeddings
 * @param embedding1 First embedding
 * @param embedding2 Second embedding
 * @returns Similarity score (0-1, higher is more similar)
 */
export function calculateFaceSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Match detected faces with saved labour face embeddings
 * @param detectedFaces Array of detected face embeddings
 * @param labourEmbeddings Map of labourId -> face embedding
 * @param threshold Similarity threshold (default: 0.6)
 * @returns Map of labourId -> matched face index
 */
export function matchFaces(
  detectedFaces: number[][],
  labourEmbeddings: Map<string, number[]>,
  threshold: number = 0.6
): Map<string, number> {
  const matches = new Map<string, number>();

  for (const [labourId, savedEmbedding] of labourEmbeddings.entries()) {
    let bestMatch = -1;
    let bestScore = threshold;

    for (let i = 0; i < detectedFaces.length; i++) {
      const similarity = calculateFaceSimilarity(savedEmbedding, detectedFaces[i]);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = i;
      }
    }

    if (bestMatch !== -1) {
      matches.set(labourId, bestMatch);
    }
  }

  return matches;
}

/**
 * Create image element from base64 or URL
 */
export function createImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
