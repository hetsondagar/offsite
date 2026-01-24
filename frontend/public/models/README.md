# Face Recognition Models

This directory should contain the face-api.js models for face detection and recognition.

## Download Models

Download the following model files from the face-api.js repository and place them in this directory:

1. **tiny_face_detector_model-weights_manifest.json**
2. **tiny_face_detector_model-shard1**
3. **face_landmark_68_model-weights_manifest.json**
4. **face_landmark_68_model-shard1**
5. **face_recognition_model-weights_manifest.json**
6. **face_recognition_model-shard1**

## Quick Setup

Run this command in the frontend directory to download models:

```bash
# Create models directory if it doesn't exist
mkdir -p public/models

# Download models using curl or wget
cd public/models

# Tiny Face Detector
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1

# Face Landmark 68
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1

# Face Recognition
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
```

Or visit: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

## Alternative: Use CDN

If you prefer not to host models locally, you can modify `frontend/src/lib/face-recognition.ts` to load models from a CDN:

```typescript
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
```

Note: CDN loading may be slower and requires internet connection.
