/**
 * Camera wrapper for Capacitor
 * Falls back to file input on web
 */

import { Camera, CameraResultType, CameraSource, CameraPermissionStatus } from '@capacitor/camera';
import { isNative } from './capacitor';

export interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
  source?: 'camera' | 'gallery';
}

/**
 * Request camera permissions (Android/iOS)
 * Returns true if permission is granted, false otherwise
 */
async function requestCameraPermissions(): Promise<boolean> {
  if (!isNative()) {
    return true; // Browser handles permissions automatically
  }

  try {
    // Check current permission status
    const permissionStatus = await Camera.checkPermissions();
    
    if (permissionStatus.camera === 'granted') {
      return true;
    }

    // Request permission if not granted
    const requestResult = await Camera.requestPermissions({ permissions: ['camera'] });
    return requestResult.camera === 'granted';
  } catch (error) {
    console.error('Error requesting camera permissions:', error);
    return false;
  }
}

/**
 * Take a photo or pick from gallery
 * Uses Capacitor Camera on native, falls back to file input on web
 */
export async function pickImage(options: CameraOptions = {}): Promise<File[]> {
  if (isNative()) {
    // Request camera permissions if using camera source
    if (options.source === 'camera') {
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) {
        throw new Error('Camera permission denied. Please enable camera permissions in app settings.');
      }
    }

    // Use Capacitor Camera on native
    const source = options.source === 'gallery' 
      ? CameraSource.Photos 
      : CameraSource.Camera;

    const image = await Camera.getPhoto({
      quality: options.quality ?? 90,
      allowEditing: options.allowEditing ?? false,
      resultType: CameraResultType.Uri,
      source,
    });

    // Convert Capacitor photo to File
    const response = await fetch(image.webPath!);
    const blob = await response.blob();
    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    return [file];
  } else {
    // Fallback to file input on web
    return new Promise<File[]>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = (e: any) => {
        const files = Array.from(e.target.files) as File[];
        resolve(files);
      };
      input.onerror = reject;
      input.click();
    });
  }
}

/**
 * Pick multiple images
 * On native, picks one image at a time (user can call multiple times)
 * Respects the source option ('camera' or 'gallery')
 */
export async function pickImages(options: CameraOptions = {}): Promise<File[]> {
  if (isNative()) {
    // On native, we can only pick one at a time
    // Use the source option if provided, otherwise default to gallery for multiple picks
    const source = options.source || 'gallery';
    return pickImage({ ...options, source });
  } else {
    // On web, use file input with multiple
    return new Promise<File[]>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = (e: any) => {
        const files = Array.from(e.target.files) as File[];
        resolve(files);
      };
      input.onerror = reject;
      input.click();
    });
  }
}

/**
 * Convenience helper matching existing page usage: take a single photo and
 * return a URL (native `webPath` or object URL for web fallback).
 */
export async function takePhoto(options: CameraOptions = {}): Promise<string> {
  if (isNative()) {
    const source = CameraSource.Camera;
    const image = await Camera.getPhoto({
      quality: options.quality ?? 90,
      allowEditing: options.allowEditing ?? false,
      resultType: CameraResultType.Uri,
      source,
    });
    // Prefer webPath (works on Capacitor webview) and fall back to path
    return image.webPath || (image as any).path || '';
  } else {
    // Web fallback: open file input and return an object URL for the selected file
    const files = await new Promise<File[]>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = false;
      input.onchange = (e: any) => {
        const files = Array.from(e.target.files) as File[];
        resolve(files);
      };
      input.onerror = reject;
      input.click();
    });
    const file = files[0];
    if (!file) throw new Error('No file selected');
    return URL.createObjectURL(file);
  }
}
