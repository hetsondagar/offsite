/**
 * Image loading utilities optimized for Android WebView
 * Handles Cloudinary URLs and other external image sources safely
 */

/**
 * Ensure Cloudinary URLs use HTTPS for secure loading
 * Android WebView requires HTTPS for images when app is served over HTTPS
 */
export function getSecureImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) {
    return '';
  }

  // Convert to string if needed
  let url = String(imageUrl).trim();

  if (!url) {
    return '';
  }

  // Force HTTPS for all URLs to prevent mixed content
  if (url.startsWith('http://')) {
    url = url.replace(/^http:\/\//, 'https://');
  }

  return url;
}

/**
 * Get optimized image URL for mobile viewing
 * For Android compatibility, uses minimal transformations
 */
export function getOptimizedImageUrl(imageUrl: string | null | undefined, options?: {
  width?: number;
  height?: number;
  quality?: 'auto' | number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
}): string {
  // First, ensure HTTPS
  const url = getSecureImageUrl(imageUrl);

  if (!url) {
    return '';
  }

  // For non-Cloudinary URLs, return as-is
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  // For Cloudinary, just add minimal quality param if not present
  // Don't try complex transformations as they can break the URL
  if (!url.includes('q_')) {
    // Simple approach: just add quality to the URL
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      // Check if there are already transformations
      const pathAfterUpload = parts[1];
      const pathParts = pathAfterUpload.split('/');
      
      // If first part looks like transformation (has comma or underscore), insert quality there
      if (pathParts[0] && (pathParts[0].includes(',') || pathParts[0].includes('_'))) {
        // Already has transformations, add quality to them
        pathParts[0] = pathParts[0] + ',q_80';
        return parts[0] + '/upload/' + pathParts.join('/');
      } else {
        // No transformations, add quality as first transformation
        return parts[0] + '/upload/q_80/' + pathAfterUpload;
      }
    }
  }

  return url;
}

/**
 * Handle image load errors gracefully with retry logic
 * Useful for monitoring image loading issues on Android
 */
export function createImageLoadHandler(onError?: (error: Event) => void) {
  return (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const currentSrc = img.src;
    
    console.warn(`Failed to load image: ${currentSrc}`);
    
    // Try fallback: if image has transformations, try without them
    if (currentSrc.includes('res.cloudinary.com') && currentSrc.includes('/upload/')) {
      const parts = currentSrc.split('/upload/');
      if (parts.length === 2) {
        // Extract just the public ID without transformations
        const pathParts = parts[1].split('/');
        // Find the public ID (usually starts with a letter/digit, not transformation param)
        let publicId = pathParts[pathParts.length - 1];
        
        // Try with just secure_url, no transformations
        const fallbackUrl = `${parts[0]}/upload/${publicId}`;
        if (currentSrc !== fallbackUrl && !img.dataset.retried) {
          console.log(`Retrying image with fallback URL: ${fallbackUrl}`);
          img.dataset.retried = 'true';
          img.src = fallbackUrl;
          return;
        }
      }
    }
    
    if (onError) {
      onError(event.nativeEvent);
    }

    // Add error class for styling
    img.classList.add('image-load-error');
  };
}

/**
 * Preload images for Android WebView performance
 * Helps prevent flickering and improves perceived performance
 */
export function preloadImages(urls: (string | null | undefined)[]): void {
  if (typeof window === 'undefined') {
    return; // Skip on server
  }

  urls.forEach((url) => {
    const secureUrl = getSecureImageUrl(url);
    if (secureUrl) {
      const img = new Image();
      img.src = secureUrl;
    }
  });
}
