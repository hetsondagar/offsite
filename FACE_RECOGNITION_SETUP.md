# Face Recognition Setup Guide

This guide explains how to set up face recognition for labour attendance in the OffSite app.

## Overview

The face recognition system uses `face-api.js` to:
1. Extract face embeddings when registering labours
2. Detect and match faces in group photos during attendance
3. Validate that only detected faces are marked as present

## Installation Steps

### 1. Install face-api.js

```bash
cd frontend
npm install face-api.js
```

### 2. Download Face Recognition Models

The models need to be placed in `frontend/public/models/` directory.

**Option A: Manual Download**

1. Create the models directory:
   ```bash
   mkdir -p frontend/public/models
   ```

2. Download the following files from https://github.com/justadudewhohacks/face-api.js/tree/master/weights:
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`

**Option B: Using Script (Linux/Mac)**

```bash
cd frontend/public/models
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
```

**Option C: Use CDN (Alternative)**

If you prefer not to host models locally, modify `frontend/src/lib/face-recognition.ts`:

```typescript
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
```

Note: CDN loading requires internet connection and may be slower.

## How It Works

### 1. Labour Registration

When a contractor registers a labour:
- Takes a face photo using camera (Android/Web)
- Extracts face embedding (128-dimensional vector)
- Saves embedding to database
- Only labours with valid face embeddings can be used for attendance

### 2. Daily Attendance

When marking attendance:
- Takes a group photo using camera
- Captures GPS location (validates against project geo-fence)
- Detects all faces in the photo
- Extracts embeddings for each detected face
- Compares with saved labour embeddings (cosine similarity)
- Only matched labours are marked as present
- Sends detected face IDs to backend for validation

### 3. Face Matching Algorithm

- Uses cosine similarity to compare embeddings
- Default threshold: 0.6 (60% similarity)
- Higher threshold = stricter matching
- Lower threshold = more lenient matching

## Features

✅ **Camera Support**: Works on both Android (Capacitor) and Web
✅ **Geolocation**: Validates attendance location against project geo-fence
✅ **Face Detection**: Automatically detects faces in group photos
✅ **Face Matching**: Only matched faces are marked as present
✅ **Offline Support**: Models can be cached for offline use

## Troubleshooting

### Models Not Loading

- Ensure models are in `frontend/public/models/`
- Check browser console for loading errors
- Verify model file names match exactly

### No Faces Detected

- Ensure good lighting
- Face should be clearly visible
- Avoid masks or obstructions
- Try different angles

### Low Matching Accuracy

- Ensure face photos are clear during registration
- Use consistent lighting conditions
- Adjust similarity threshold in `face-recognition.ts` (default: 0.6)

### Camera Not Working

- Check camera permissions (Android: Settings > Apps > OffSite > Permissions)
- Ensure HTTPS for web (required for camera API)
- Try different browsers (Chrome recommended)

## API Endpoints

### Register Labour (with face embedding)
```
POST /api/contractor/labour
Body: {
  name: string,
  faceImageUrl?: string,
  faceEmbedding?: number[],
  projectId: string
}
```

### Upload Attendance (with face detection)
```
POST /api/contractor/attendance
Body: {
  projectId: string,
  date: string,
  groupPhotoUrl: string,
  presentLabourIds: string[],
  detectedFaces?: string[],
  latitude?: number,
  longitude?: number
}
```

## Security Notes

- Face embeddings are stored securely in database
- Only matched faces are marked as present
- Geolocation validates attendance location
- Backend validates all face matches server-side
