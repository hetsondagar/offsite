import fs from 'fs';
import path from 'path';
import { cloudinary } from '../../config/cloudinary';
import { env } from '../../config/env';
import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

function isCloudinaryConfigured(): boolean {
  return Boolean(
    (env.CLOUDINARY_URL && env.CLOUDINARY_URL.trim()) ||
      (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_CLOUD_NAME.trim() && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)
  );
}

export async function uploadReceiptPhoto(file: Express.Multer.File): Promise<string> {
  if (!file?.buffer?.length) {
    throw new Error('Receipt photo is empty');
  }

  // Prefer Cloudinary when configured (works across devices/environments)
  if (isCloudinaryConfigured()) {
    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'offsite/petty-cash',
          resource_type: 'image',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) return reject(error);
          const url = result?.secure_url;
          if (!url) return reject(new Error('Cloudinary upload returned empty URL'));
          resolve(url);
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  // Fallback: save to local disk and serve via `/uploads/*`
  const uploadsDir = path.join(process.cwd(), 'backend', 'uploads', 'petty-cash');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const safeExt = (() => {
    const extFromName = path.extname(file.originalname || '').toLowerCase();
    if (extFromName && extFromName.length <= 8) return extFromName;
    if (file.mimetype === 'image/png') return '.png';
    if (file.mimetype === 'image/webp') return '.webp';
    return '.jpg';
  })();

  const filename = `receipt_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, file.buffer);

  return `/uploads/petty-cash/${filename}`;
}
