/**
 * Camera wrapper for Capacitor
 * Falls back to file input on web
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNative } from './capacitor';

export interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
  source?: 'camera' | 'gallery';
}

/**
 * Take a photo or pick from gallery
 * Uses Capacitor Camera on native, falls back to file input on web
 */
export async function pickImage(options: CameraOptions = {}): Promise<File[]> {
  if (isNative()) {
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
 */
export async function pickImages(options: CameraOptions = {}): Promise<File[]> {
  if (isNative()) {
    // On native, we can only pick one at a time, so we'll use Photos source
    // and let the user pick multiple times if needed
    // For now, return single image in array (can be enhanced later)
    return pickImage({ ...options, source: 'gallery' });
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
