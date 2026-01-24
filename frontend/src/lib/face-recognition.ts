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
let modelLoadingPromise: Promise<void> | null = null;

/**
 * Preload models early (call this on app startup)
 */
export async function preloadFaceModels(): Promise<void> {
  try {
    await loadFaceModels();
  } catch (error) {
    console.warn('Failed to preload face models, will retry on first use:', error);
  }
}

/**
 * Load face-api.js models with fallback to CDN
 */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded && faceapi) {
    return;
  }

  // If already loading, wait for that promise
  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  modelLoadingPromise = (async () => {
    try {
      // Dynamically import face-api.js
      faceapi = await import('face-api.js');
      
      // Try local models first, fallback to CDN
      const LOCAL_MODEL_URL = '/models';
      const CDN_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      
      let modelUrl = LOCAL_MODEL_URL;
      let useCDN = false;
      
      try {
        // Try to load from local first
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(LOCAL_MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(LOCAL_MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(LOCAL_MODEL_URL),
        ]);
        console.log('Face recognition models loaded from local');
      } catch (localError) {
        console.warn('Local models not found, using CDN:', localError);
        useCDN = true;
        modelUrl = CDN_MODEL_URL;
        
        // Load from CDN
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(CDN_MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(CDN_MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(CDN_MODEL_URL),
        ]);
        console.log('Face recognition models loaded from CDN');
      }
      
      modelsLoaded = true;
    } catch (error) {
      console.error('Failed to load face recognition models:', error);
      modelsLoaded = false;
      modelLoadingPromise = null;
      throw new Error('Face recognition models failed to load. Please check your internet connection or ensure models are in /public/models folder.');
    }
  })();

  return modelLoadingPromise;
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
      // Handle blob URLs, file URLs, and regular URLs
      if (imageUrl.startsWith('blob:') || imageUrl.startsWith('file://')) {
        img = await createImageElement(imageUrl);
      } else {
        try {
          img = await faceapi.fetchImage(imageUrl);
        } catch (fetchError) {
          // Fallback to createImageElement if fetchImage fails
          img = await createImageElement(imageUrl);
        }
      }
    } else {
      img = imageUrl;
    }

    // Wait for image to load
    if (!img.complete) {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
    }

    // Use more lenient detection options for better face detection
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ 
        inputSize: 320, // Larger input size for better detection
        scoreThreshold: 0.3 // Lower threshold to detect more faces
      }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) {
      console.warn('No face detected in image');
      return null;
    }

    // Convert Float32Array to regular array
    const embedding = Array.from(detection.descriptor);
    console.log('Face embedding extracted successfully, length:', embedding.length);
    return embedding;
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
      // Handle blob URLs, file URLs, and regular URLs
      if (imageUrl.startsWith('blob:') || imageUrl.startsWith('file://')) {
        img = await createImageElement(imageUrl);
      } else {
        try {
          img = await faceapi.fetchImage(imageUrl);
        } catch (fetchError) {
          // Fallback to createImageElement if fetchImage fails
          img = await createImageElement(imageUrl);
        }
      }
    } else {
      img = imageUrl;
    }

    // Wait for image to load
    if (!img.complete) {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
    }

    // Use more lenient detection options for better face detection
    const detections = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ 
        inputSize: 320, // Larger input size for better detection
        scoreThreshold: 0.3 // Lower threshold to detect more faces
      }))
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections || detections.length === 0) {
      console.warn('No faces detected in image');
      return [];
    }

    console.log(`Detected ${detections.length} face(s) in image`);
    
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
  threshold: number = 0.5
): Map<string, number> {
  const matches = new Map<string, number>();
  const usedFaceIndices = new Set<number>(); // Prevent one face matching multiple labours

  // Sort by similarity score to match best faces first
  const matchCandidates: Array<{ labourId: string; faceIndex: number; score: number }> = [];

  for (const [labourId, savedEmbedding] of labourEmbeddings.entries()) {
    for (let i = 0; i < detectedFaces.length; i++) {
      const similarity = calculateFaceSimilarity(savedEmbedding, detectedFaces[i]);
      if (similarity > threshold) {
        matchCandidates.push({ labourId, faceIndex: i, score: similarity });
      }
    }
  }

  // Sort by score descending and match best candidates first
  matchCandidates.sort((a, b) => b.score - a.score);

  // Assign matches (one face per labour, one labour per face)
  for (const candidate of matchCandidates) {
    if (!matches.has(candidate.labourId) && !usedFaceIndices.has(candidate.faceIndex)) {
      matches.set(candidate.labourId, candidate.faceIndex);
      usedFaceIndices.add(candidate.faceIndex);
      console.log(`Matched labour ${candidate.labourId} with face ${candidate.faceIndex} (similarity: ${candidate.score.toFixed(3)})`);
    }
  }

  return matches;
}

/**
 * Create image element from base64, blob URL, file URL, or regular URL
 */
export function createImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Don't set crossOrigin for blob/file URLs
    if (!src.startsWith('blob:') && !src.startsWith('file://') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      console.log('Image loaded successfully:', src.substring(0, 50));
      resolve(img);
    };
    
    img.onerror = (error) => {
      console.error('Failed to load image:', src.substring(0, 50), error);
      reject(new Error(`Failed to load image: ${src.substring(0, 50)}...`));
    };
    
    img.src = src;
    
    // If image is already loaded (cached), resolve immediately
    if (img.complete) {
      resolve(img);
    }
  });
}
