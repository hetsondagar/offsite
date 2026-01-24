// Script to generate Android launcher icons from favicon/logo
// This requires sharp package: npm install sharp --save-dev

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const iconSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

const baseDir = join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const logoPath = join(__dirname, '..', 'public', 'logo.png');

async function generateIcons() {
  try {
    // Check if logo exists
    if (!existsSync(logoPath)) {
      console.error('logo.png not found at:', logoPath);
      process.exit(1);
    }

    // Generate icons for each density
    for (const [folder, size] of Object.entries(iconSizes)) {
      const outputDir = join(baseDir, folder);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = join(outputDir, 'ic_launcher.png');
      const roundOutputPath = join(outputDir, 'ic_launcher_round.png');
      const foregroundPath = join(outputDir, 'ic_launcher_foreground.png');

      console.log(`Generating ${size}x${size} icon for ${folder}...`);

      // Generate square icon
      await sharp(logoPath)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 107, b: 53, alpha: 1 } })
        .toFile(outputPath);

      // Generate round icon (same as square for now)
      await sharp(logoPath)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 107, b: 53, alpha: 1 } })
        .toFile(roundOutputPath);

      // Generate foreground (for adaptive icon) - 108dp equivalent
      const foregroundSize = Math.round(size * 1.125); // 108dp is 1.125x the base size
      await sharp(logoPath)
        .resize(foregroundSize, foregroundSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toFile(foregroundPath);

      console.log(`✓ Generated icons for ${folder}`);
    }

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
