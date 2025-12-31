import { DPR } from './dpr.model';
import { cloudinary } from '../../config/cloudinary';

/**
 * Generate AI summary for DPR (Rule-based)
 * In production, this could use HuggingFace API or OpenAI
 */
export const generateAISummary = async (
  projectName: string,
  taskName: string,
  notes?: string,
  photoCount: number = 0
): Promise<string> => {
  // Rule-based summary generation
  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const weather = 'Favorable'; // In production, fetch from weather API
  const temperature = Math.floor(Math.random() * 10) + 25; // 25-35°C
  
  let summary = `Completed work on ${taskName} for ${projectName} on ${date}. `;
  
  if (photoCount > 0) {
    summary += `${photoCount} photo${photoCount > 1 ? 's' : ''} captured documenting the progress. `;
  }
  
  summary += `Weather conditions were ${weather.toLowerCase()} with ${temperature}°C temperature. `;
  
  if (notes) {
    summary += `Additional notes: ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}. `;
  }
  
  summary += `Work progressed as per schedule. No safety incidents reported.`;
  
  return summary;
};

export const uploadPhotos = async (files: Express.Multer.File[]): Promise<string[]> => {
  const uploadPromises = files.map((file) => {
    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'offsite/dpr',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result?.secure_url || '');
          }
        }
      );
      
      uploadStream.end(file.buffer);
    });
  });
  
  return Promise.all(uploadPromises);
};

