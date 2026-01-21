import mongoose from 'mongoose';
import { MaterialCatalog } from '../src/modules/materials/material-catalog.model';
import { env } from '../src/config/env';
import { logger } from '../src/utils/logger';

/**
 * Seed script for Material Catalog with realistic Indian construction materials
 * This script inserts materials only if they do not already exist
 */

interface MaterialSeedData {
  name: string;
  unit: 'bag' | 'kg' | 'ton' | 'nos' | 'meter' | 'sqm' | 'cum' | 'liter';
  category: string;
  approxPriceINR: number;
  defaultAnomalyThreshold: number;
}

const materials: MaterialSeedData[] = [
  // Cement & Aggregates
  { name: 'OPC Cement (50kg bag)', unit: 'bag', category: 'Cement & Aggregates', approxPriceINR: 380, defaultAnomalyThreshold: 1.3 },
  { name: 'PPC Cement (50kg bag)', unit: 'bag', category: 'Cement & Aggregates', approxPriceINR: 360, defaultAnomalyThreshold: 1.3 },
  { name: 'River Sand', unit: 'ton', category: 'Cement & Aggregates', approxPriceINR: 1500, defaultAnomalyThreshold: 1.3 },
  { name: 'M-Sand', unit: 'ton', category: 'Cement & Aggregates', approxPriceINR: 1200, defaultAnomalyThreshold: 1.3 },
  { name: '20mm Aggregate', unit: 'ton', category: 'Cement & Aggregates', approxPriceINR: 1100, defaultAnomalyThreshold: 1.3 },
  { name: '40mm Aggregate', unit: 'ton', category: 'Cement & Aggregates', approxPriceINR: 950, defaultAnomalyThreshold: 1.3 },

  // Steel & Metals
  { name: 'TMT Steel Bar (Fe500)', unit: 'kg', category: 'Steel & Metals', approxPriceINR: 62, defaultAnomalyThreshold: 1.3 },
  { name: 'Binding Wire', unit: 'kg', category: 'Steel & Metals', approxPriceINR: 68, defaultAnomalyThreshold: 1.3 },
  { name: 'Structural Steel', unit: 'kg', category: 'Steel & Metals', approxPriceINR: 70, defaultAnomalyThreshold: 1.3 },

  // Bricks & Blocks
  { name: 'Red Clay Bricks', unit: 'nos', category: 'Bricks & Blocks', approxPriceINR: 9, defaultAnomalyThreshold: 1.3 },
  { name: 'Fly Ash Bricks', unit: 'nos', category: 'Bricks & Blocks', approxPriceINR: 6, defaultAnomalyThreshold: 1.3 },
  { name: 'AAC Blocks', unit: 'cum', category: 'Bricks & Blocks', approxPriceINR: 3500, defaultAnomalyThreshold: 1.3 },

  // Concrete & Chemicals
  { name: 'Ready Mix Concrete (M20)', unit: 'cum', category: 'Concrete & Chemicals', approxPriceINR: 5200, defaultAnomalyThreshold: 1.3 },
  { name: 'Ready Mix Concrete (M25)', unit: 'cum', category: 'Concrete & Chemicals', approxPriceINR: 5800, defaultAnomalyThreshold: 1.3 },
  { name: 'Waterproofing Chemical', unit: 'liter', category: 'Concrete & Chemicals', approxPriceINR: 180, defaultAnomalyThreshold: 1.3 },
  { name: 'Curing Compound', unit: 'liter', category: 'Concrete & Chemicals', approxPriceINR: 160, defaultAnomalyThreshold: 1.3 },

  // Wood & Fixtures
  // Note: Original price was ₹95/sqft, converted to ₹1023/sqm (1 sqm = 10.764 sqft)
  { name: 'Plywood (18mm)', unit: 'sqm', category: 'Wood & Fixtures', approxPriceINR: 1023, defaultAnomalyThreshold: 1.3 },
  { name: 'Door Frame', unit: 'nos', category: 'Wood & Fixtures', approxPriceINR: 1800, defaultAnomalyThreshold: 1.3 },
  { name: 'Window Frame', unit: 'nos', category: 'Wood & Fixtures', approxPriceINR: 2200, defaultAnomalyThreshold: 1.3 },

  // Electrical
  { name: 'Copper Wire (2.5 sqmm)', unit: 'meter', category: 'Electrical', approxPriceINR: 95, defaultAnomalyThreshold: 1.3 },
  { name: 'Switch Socket', unit: 'nos', category: 'Electrical', approxPriceINR: 120, defaultAnomalyThreshold: 1.3 },
  { name: 'Distribution Board', unit: 'nos', category: 'Electrical', approxPriceINR: 1900, defaultAnomalyThreshold: 1.3 },

  // Plumbing
  { name: 'PVC Pipe (1 inch)', unit: 'meter', category: 'Plumbing', approxPriceINR: 85, defaultAnomalyThreshold: 1.3 },
  { name: 'PVC Pipe (2 inch)', unit: 'meter', category: 'Plumbing', approxPriceINR: 140, defaultAnomalyThreshold: 1.3 },
  { name: 'Water Tap', unit: 'nos', category: 'Plumbing', approxPriceINR: 320, defaultAnomalyThreshold: 1.3 },
];

async function seedMaterialCatalog() {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    let insertedCount = 0;
    let skippedCount = 0;

    // Insert materials one by one to avoid duplicates
    for (const material of materials) {
      try {
        // Check if material already exists
        const existing = await MaterialCatalog.findOne({ name: material.name });
        
        if (existing) {
          logger.info(`Material "${material.name}" already exists, skipping...`);
          skippedCount++;
          continue;
        }

        // Insert new material
        await MaterialCatalog.create({
          ...material,
          priceUnit: material.unit, // priceUnit is same as unit
          isActive: true,
        });

        logger.info(`Inserted material: ${material.name}`);
        insertedCount++;
      } catch (error: any) {
        if (error.code === 11000) {
          // Duplicate key error
          logger.warn(`Material "${material.name}" already exists (duplicate key), skipping...`);
          skippedCount++;
        } else {
          logger.error(`Error inserting material "${material.name}":`, error.message);
        }
      }
    }

    logger.info(`\n=== Seed Summary ===`);
    logger.info(`Inserted: ${insertedCount} materials`);
    logger.info(`Skipped: ${skippedCount} materials (already exist)`);
    logger.info(`Total: ${materials.length} materials processed`);

    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error seeding material catalog:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed script
seedMaterialCatalog();
