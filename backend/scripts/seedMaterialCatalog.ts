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
  // Cement & Aggregates (10 items)
  { name: 'OPC Cement (50kg bag)', unit: 'bag', category: 'Cement & Aggregates', approxPriceINR: 380, defaultAnomalyThreshold: 1.3 },
  { name: 'PPC Cement (50kg bag)', unit: 'bag', category: 'Cement & Aggregates', approxPriceINR: 360, defaultAnomalyThreshold: 1.3 },
  { name: 'White Cement (50kg bag)', unit: 'bag', category: 'Cement & Aggregates', approxPriceINR: 680, defaultAnomalyThreshold: 1.3 },
  { name: 'River Sand', unit: 'ton', category: 'Cement & Aggregates', approxPriceINR: 1500, defaultAnomalyThreshold: 1.3 },
  { name: 'M-Sand', unit: 'ton', category: 'Cement & Aggregates', approxPriceINR: 1200, defaultAnomalyThreshold: 1.3 },
  { name: '20mm Aggregate', unit: 'ton', category: 'Cement & Aggregates', approxPriceINR: 1100, defaultAnomalyThreshold: 1.3 },
  { name: '40mm Aggregate', unit: 'ton', category: 'Cement & Aggregates', approxPriceINR: 950, defaultAnomalyThreshold: 1.3 },
  { name: '10mm Aggregate', unit: 'ton', category: 'Cement & Aggregates', approxPriceINR: 1250, defaultAnomalyThreshold: 1.3 },
  { name: 'Stone Dust', unit: 'ton', category: 'Cement & Aggregates', approxPriceINR: 800, defaultAnomalyThreshold: 1.3 },
  { name: 'Gravel', unit: 'ton', category: 'Cement & Aggregates', approxPriceINR: 1050, defaultAnomalyThreshold: 1.3 },

  // Steel & Metals (8 items)
  { name: 'TMT Steel Bar (Fe500)', unit: 'kg', category: 'Steel & Metals', approxPriceINR: 62, defaultAnomalyThreshold: 1.3 },
  { name: 'TMT Steel Bar (Fe550)', unit: 'kg', category: 'Steel & Metals', approxPriceINR: 65, defaultAnomalyThreshold: 1.3 },
  { name: 'Binding Wire', unit: 'kg', category: 'Steel & Metals', approxPriceINR: 68, defaultAnomalyThreshold: 1.3 },
  { name: 'Structural Steel', unit: 'kg', category: 'Steel & Metals', approxPriceINR: 70, defaultAnomalyThreshold: 1.3 },
  { name: 'MS Plate (6mm)', unit: 'kg', category: 'Steel & Metals', approxPriceINR: 72, defaultAnomalyThreshold: 1.3 },
  { name: 'MS Angle', unit: 'kg', category: 'Steel & Metals', approxPriceINR: 68, defaultAnomalyThreshold: 1.3 },
  { name: 'MS Channel', unit: 'kg', category: 'Steel & Metals', approxPriceINR: 70, defaultAnomalyThreshold: 1.3 },
  { name: 'Welding Electrode', unit: 'kg', category: 'Steel & Metals', approxPriceINR: 180, defaultAnomalyThreshold: 1.3 },

  // Bricks & Blocks (7 items)
  { name: 'Red Clay Bricks', unit: 'nos', category: 'Bricks & Blocks', approxPriceINR: 9, defaultAnomalyThreshold: 1.3 },
  { name: 'Fly Ash Bricks', unit: 'nos', category: 'Bricks & Blocks', approxPriceINR: 6, defaultAnomalyThreshold: 1.3 },
  { name: 'AAC Blocks', unit: 'cum', category: 'Bricks & Blocks', approxPriceINR: 3500, defaultAnomalyThreshold: 1.3 },
  { name: 'Hollow Blocks', unit: 'nos', category: 'Bricks & Blocks', approxPriceINR: 45, defaultAnomalyThreshold: 1.3 },
  { name: 'Solid Blocks', unit: 'nos', category: 'Bricks & Blocks', approxPriceINR: 38, defaultAnomalyThreshold: 1.3 },
  { name: 'Paver Blocks', unit: 'sqm', category: 'Bricks & Blocks', approxPriceINR: 180, defaultAnomalyThreshold: 1.3 },
  { name: 'Interlocking Tiles', unit: 'sqm', category: 'Bricks & Blocks', approxPriceINR: 220, defaultAnomalyThreshold: 1.3 },

  // Concrete & Chemicals (8 items)
  { name: 'Ready Mix Concrete (M20)', unit: 'cum', category: 'Concrete & Chemicals', approxPriceINR: 5200, defaultAnomalyThreshold: 1.3 },
  { name: 'Ready Mix Concrete (M25)', unit: 'cum', category: 'Concrete & Chemicals', approxPriceINR: 5800, defaultAnomalyThreshold: 1.3 },
  { name: 'Ready Mix Concrete (M30)', unit: 'cum', category: 'Concrete & Chemicals', approxPriceINR: 6400, defaultAnomalyThreshold: 1.3 },
  { name: 'Waterproofing Chemical', unit: 'liter', category: 'Concrete & Chemicals', approxPriceINR: 180, defaultAnomalyThreshold: 1.3 },
  { name: 'Curing Compound', unit: 'liter', category: 'Concrete & Chemicals', approxPriceINR: 160, defaultAnomalyThreshold: 1.3 },
  { name: 'Concrete Admixture', unit: 'liter', category: 'Concrete & Chemicals', approxPriceINR: 220, defaultAnomalyThreshold: 1.3 },
  { name: 'Epoxy Resin', unit: 'kg', category: 'Concrete & Chemicals', approxPriceINR: 450, defaultAnomalyThreshold: 1.3 },
  { name: 'Grout Material', unit: 'kg', category: 'Concrete & Chemicals', approxPriceINR: 85, defaultAnomalyThreshold: 1.3 },

  // Wood & Fixtures (8 items)
  { name: 'Plywood (18mm)', unit: 'sqm', category: 'Wood & Fixtures', approxPriceINR: 1023, defaultAnomalyThreshold: 1.3 },
  { name: 'Plywood (12mm)', unit: 'sqm', category: 'Wood & Fixtures', approxPriceINR: 680, defaultAnomalyThreshold: 1.3 },
  { name: 'Block Board', unit: 'sqm', category: 'Wood & Fixtures', approxPriceINR: 750, defaultAnomalyThreshold: 1.3 },
  { name: 'Door Frame', unit: 'nos', category: 'Wood & Fixtures', approxPriceINR: 1800, defaultAnomalyThreshold: 1.3 },
  { name: 'Window Frame', unit: 'nos', category: 'Wood & Fixtures', approxPriceINR: 2200, defaultAnomalyThreshold: 1.3 },
  { name: 'Teak Wood (per cft)', unit: 'cum', category: 'Wood & Fixtures', approxPriceINR: 85000, defaultAnomalyThreshold: 1.3 },
  { name: 'Hardwood (per cft)', unit: 'cum', category: 'Wood & Fixtures', approxPriceINR: 45000, defaultAnomalyThreshold: 1.3 },
  { name: 'Shuttering Plywood', unit: 'sqm', category: 'Wood & Fixtures', approxPriceINR: 450, defaultAnomalyThreshold: 1.3 },

  // Electrical (10 items)
  { name: 'Copper Wire (2.5 sqmm)', unit: 'meter', category: 'Electrical', approxPriceINR: 95, defaultAnomalyThreshold: 1.3 },
  { name: 'Copper Wire (4 sqmm)', unit: 'meter', category: 'Electrical', approxPriceINR: 150, defaultAnomalyThreshold: 1.3 },
  { name: 'Copper Wire (6 sqmm)', unit: 'meter', category: 'Electrical', approxPriceINR: 220, defaultAnomalyThreshold: 1.3 },
  { name: 'Switch Socket', unit: 'nos', category: 'Electrical', approxPriceINR: 120, defaultAnomalyThreshold: 1.3 },
  { name: 'Distribution Board', unit: 'nos', category: 'Electrical', approxPriceINR: 1900, defaultAnomalyThreshold: 1.3 },
  { name: 'MCB (16A)', unit: 'nos', category: 'Electrical', approxPriceINR: 450, defaultAnomalyThreshold: 1.3 },
  { name: 'MCB (32A)', unit: 'nos', category: 'Electrical', approxPriceINR: 650, defaultAnomalyThreshold: 1.3 },
  { name: 'LED Bulb (9W)', unit: 'nos', category: 'Electrical', approxPriceINR: 180, defaultAnomalyThreshold: 1.3 },
  { name: 'LED Tube Light (18W)', unit: 'nos', category: 'Electrical', approxPriceINR: 320, defaultAnomalyThreshold: 1.3 },
  { name: 'Conduit Pipe (20mm)', unit: 'meter', category: 'Electrical', approxPriceINR: 35, defaultAnomalyThreshold: 1.3 },

  // Plumbing (10 items)
  { name: 'PVC Pipe (1 inch)', unit: 'meter', category: 'Plumbing', approxPriceINR: 85, defaultAnomalyThreshold: 1.3 },
  { name: 'PVC Pipe (2 inch)', unit: 'meter', category: 'Plumbing', approxPriceINR: 140, defaultAnomalyThreshold: 1.3 },
  { name: 'PVC Pipe (4 inch)', unit: 'meter', category: 'Plumbing', approxPriceINR: 320, defaultAnomalyThreshold: 1.3 },
  { name: 'CPVC Pipe (1 inch)', unit: 'meter', category: 'Plumbing', approxPriceINR: 120, defaultAnomalyThreshold: 1.3 },
  { name: 'GI Pipe (1 inch)', unit: 'meter', category: 'Plumbing', approxPriceINR: 180, defaultAnomalyThreshold: 1.3 },
  { name: 'Water Tap', unit: 'nos', category: 'Plumbing', approxPriceINR: 320, defaultAnomalyThreshold: 1.3 },
  { name: 'Bathroom Fitting Set', unit: 'nos', category: 'Plumbing', approxPriceINR: 2500, defaultAnomalyThreshold: 1.3 },
  { name: 'PVC Elbow (1 inch)', unit: 'nos', category: 'Plumbing', approxPriceINR: 25, defaultAnomalyThreshold: 1.3 },
  { name: 'PVC Tee (1 inch)', unit: 'nos', category: 'Plumbing', approxPriceINR: 30, defaultAnomalyThreshold: 1.3 },
  { name: 'Water Tank (1000L)', unit: 'nos', category: 'Plumbing', approxPriceINR: 8500, defaultAnomalyThreshold: 1.3 },

  // Tiles & Flooring (8 items)
  { name: 'Ceramic Tiles (2x2 ft)', unit: 'sqm', category: 'Tiles & Flooring', approxPriceINR: 180, defaultAnomalyThreshold: 1.3 },
  { name: 'Vitrified Tiles (2x2 ft)', unit: 'sqm', category: 'Tiles & Flooring', approxPriceINR: 320, defaultAnomalyThreshold: 1.3 },
  { name: 'Marble (Indian)', unit: 'sqm', category: 'Tiles & Flooring', approxPriceINR: 850, defaultAnomalyThreshold: 1.3 },
  { name: 'Granite (30mm)', unit: 'sqm', category: 'Tiles & Flooring', approxPriceINR: 1200, defaultAnomalyThreshold: 1.3 },
  { name: 'Tile Adhesive', unit: 'kg', category: 'Tiles & Flooring', approxPriceINR: 45, defaultAnomalyThreshold: 1.3 },
  { name: 'Grout (White)', unit: 'kg', category: 'Tiles & Flooring', approxPriceINR: 35, defaultAnomalyThreshold: 1.3 },
  { name: 'Laminate Flooring', unit: 'sqm', category: 'Tiles & Flooring', approxPriceINR: 280, defaultAnomalyThreshold: 1.3 },
  { name: 'Vinyl Flooring', unit: 'sqm', category: 'Tiles & Flooring', approxPriceINR: 220, defaultAnomalyThreshold: 1.3 },

  // Paints & Finishes (6 items)
  { name: 'Emulsion Paint (20L)', unit: 'liter', category: 'Paints & Finishes', approxPriceINR: 280, defaultAnomalyThreshold: 1.3 },
  { name: 'Distemper (20L)', unit: 'liter', category: 'Paints & Finishes', approxPriceINR: 120, defaultAnomalyThreshold: 1.3 },
  { name: 'Primer (20L)', unit: 'liter', category: 'Paints & Finishes', approxPriceINR: 320, defaultAnomalyThreshold: 1.3 },
  { name: 'Enamel Paint (1L)', unit: 'liter', category: 'Paints & Finishes', approxPriceINR: 450, defaultAnomalyThreshold: 1.3 },
  { name: 'Putty (40kg)', unit: 'kg', category: 'Paints & Finishes', approxPriceINR: 12, defaultAnomalyThreshold: 1.3 },
  { name: 'Thinner', unit: 'liter', category: 'Paints & Finishes', approxPriceINR: 180, defaultAnomalyThreshold: 1.3 },

  // Insulation & Waterproofing (5 items)
  { name: 'Thermocol Sheet (50mm)', unit: 'sqm', category: 'Insulation & Waterproofing', approxPriceINR: 85, defaultAnomalyThreshold: 1.3 },
  { name: 'Bitumen Sheet', unit: 'sqm', category: 'Insulation & Waterproofing', approxPriceINR: 120, defaultAnomalyThreshold: 1.3 },
  { name: 'Waterproofing Membrane', unit: 'sqm', category: 'Insulation & Waterproofing', approxPriceINR: 180, defaultAnomalyThreshold: 1.3 },
  { name: 'Rockwool Insulation', unit: 'sqm', category: 'Insulation & Waterproofing', approxPriceINR: 220, defaultAnomalyThreshold: 1.3 },
  { name: 'Expansion Joint Filler', unit: 'meter', category: 'Insulation & Waterproofing', approxPriceINR: 95, defaultAnomalyThreshold: 1.3 },

  // Hardware & Fasteners (6 items)
  { name: 'Screws (Pack of 100)', unit: 'nos', category: 'Hardware & Fasteners', approxPriceINR: 85, defaultAnomalyThreshold: 1.3 },
  { name: 'Nails (1kg)', unit: 'kg', category: 'Hardware & Fasteners', approxPriceINR: 95, defaultAnomalyThreshold: 1.3 },
  { name: 'Hinges (Pair)', unit: 'nos', category: 'Hardware & Fasteners', approxPriceINR: 180, defaultAnomalyThreshold: 1.3 },
  { name: 'Door Handle', unit: 'nos', category: 'Hardware & Fasteners', approxPriceINR: 320, defaultAnomalyThreshold: 1.3 },
  { name: 'Lock Set', unit: 'nos', category: 'Hardware & Fasteners', approxPriceINR: 850, defaultAnomalyThreshold: 1.3 },
  { name: 'Anchor Bolts (M12)', unit: 'nos', category: 'Hardware & Fasteners', approxPriceINR: 45, defaultAnomalyThreshold: 1.3 },

  // Safety & Tools (4 items)
  { name: 'Safety Helmet', unit: 'nos', category: 'Safety & Tools', approxPriceINR: 280, defaultAnomalyThreshold: 1.3 },
  { name: 'Safety Shoes', unit: 'nos', category: 'Safety & Tools', approxPriceINR: 1200, defaultAnomalyThreshold: 1.3 },
  { name: 'Safety Gloves (Pair)', unit: 'nos', category: 'Safety & Tools', approxPriceINR: 85, defaultAnomalyThreshold: 1.3 },
  { name: 'Safety Vest', unit: 'nos', category: 'Safety & Tools', approxPriceINR: 320, defaultAnomalyThreshold: 1.3 },
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
