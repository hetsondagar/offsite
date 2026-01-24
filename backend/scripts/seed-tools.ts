/**
 * Script to seed mock tool data
 * Usage: npx ts-node scripts/seed-tools.ts
 */

import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { Tool, generateToolId } from '../src/modules/tools/tool.model';

const MOCK_TOOLS = [
  // Power Tools (15)
  { name: 'Power Drill', category: 'Power Tools', description: 'Cordless power drill with bits' },
  { name: 'Circular Saw', category: 'Power Tools', description: 'Electric circular saw' },
  { name: 'Impact Driver', category: 'Power Tools', description: 'Cordless impact driver' },
  { name: 'Orbital Sander', category: 'Power Tools', description: 'Electric orbital sander' },
  { name: 'Jigsaw', category: 'Power Tools', description: 'Electric jigsaw for curves' },
  { name: 'Angle Grinder', category: 'Power Tools', description: 'Heavy-duty angle grinder' },
  { name: 'Reciprocating Saw', category: 'Power Tools', description: 'Reciprocating saw for demolition' },
  { name: 'Belt Sander', category: 'Power Tools', description: 'Professional belt sander' },
  { name: 'Rotary Hammer', category: 'Power Tools', description: 'Rotary hammer drill' },
  { name: 'Impact Wrench', category: 'Power Tools', description: 'Cordless impact wrench' },
  { name: 'Nail Gun', category: 'Power Tools', description: 'Pneumatic nail gun' },
  { name: 'Brad Nailer', category: 'Power Tools', description: 'Brad nailer for trim' },
  { name: 'Staple Gun', category: 'Power Tools', description: 'Electric staple gun' },
  { name: 'Drywall Screwdriver', category: 'Power Tools', description: 'Drywall screw driver' },
  { name: 'Multi-Tool', category: 'Power Tools', description: 'Oscillating multi-tool' },

  // Hand Tools (15)
  { name: 'Hammer', category: 'Hand Tools', description: 'Claw hammer 2kg' },
  { name: 'Wrench Set', category: 'Hand Tools', description: 'Adjustable wrench set' },
  { name: 'Screwdriver Set', category: 'Hand Tools', description: 'Mixed screwdriver set' },
  { name: 'Level (Spirit)', category: 'Hand Tools', description: 'Standard spirit level' },
  { name: 'Tape Measure', category: 'Hand Tools', description: '25m measuring tape' },
  { name: 'Pliers Set', category: 'Hand Tools', description: 'Needle nose and slip joint pliers' },
  { name: 'Socket Set', category: 'Hand Tools', description: 'Complete socket wrench set' },
  { name: 'Chisel Set', category: 'Hand Tools', description: 'Wood chisel set' },
  { name: 'Saw', category: 'Hand Tools', description: 'Hand saw for general use' },
  { name: 'Crowbar', category: 'Hand Tools', description: 'Metal crowbar for prying' },
  { name: 'Utility Knife', category: 'Hand Tools', description: 'Box cutter utility knife' },
  { name: 'Flashlight', category: 'Hand Tools', description: 'LED work flashlight' },
  { name: 'Adjustable Wrench', category: 'Hand Tools', description: 'Large adjustable wrench' },
  { name: 'Hex Key Set', category: 'Hand Tools', description: 'Complete hex key set' },
  { name: 'Hammer Drill Bit Set', category: 'Hand Tools', description: 'Drill bits for masonry' },

  // Heavy Equipment (10)
  { name: 'Cement Mixer', category: 'Heavy Equipment', description: 'Portable cement mixing machine' },
  { name: 'Scaffolding', category: 'Heavy Equipment', description: 'Steel scaffolding kit' },
  { name: 'Compressor', category: 'Heavy Equipment', description: 'Air compressor 2HP' },
  { name: 'Power Generator', category: 'Heavy Equipment', description: 'Portable power generator 5kW' },
  { name: 'Pneumatic Pump', category: 'Heavy Equipment', description: 'Water pump for dewatering' },
  { name: 'Concrete Vibrator', category: 'Heavy Equipment', description: 'Electric concrete vibrator' },
  { name: 'Chain Hoist', category: 'Heavy Equipment', description: 'Manual chain hoist 1ton' },
  { name: 'Pulley Block', category: 'Heavy Equipment', description: 'Movable pulley block' },
  { name: 'Jack (Hydraulic)', category: 'Heavy Equipment', description: 'Hydraulic floor jack 2ton' },
  { name: 'Clamping System', category: 'Heavy Equipment', description: 'C-clamp and bar clamp set' },

  // Safety Equipment (10)
  { name: 'Safety Harness', category: 'Safety Equipment', description: 'Full body safety harness' },
  { name: 'Hard Hat', category: 'Safety Equipment', description: 'Safety helmet ANSI approved' },
  { name: 'Safety Glasses', category: 'Safety Equipment', description: 'Protective safety goggles' },
  { name: 'Work Gloves', category: 'Safety Equipment', description: 'Leather work gloves' },
  { name: 'Safety Vest', category: 'Safety Equipment', description: 'High visibility safety vest' },
  { name: 'Respirator', category: 'Safety Equipment', description: 'Dust mask respirator' },
  { name: 'Ear Plugs', category: 'Safety Equipment', description: 'Foam ear plugs pack' },
  { name: 'Safety Boots', category: 'Safety Equipment', description: 'Steel-toed safety boots' },
  { name: 'Face Shield', category: 'Safety Equipment', description: 'Clear face shield protection' },
  { name: 'Knee Pads', category: 'Safety Equipment', description: 'Padded knee protection' },

  // Measurement & Layout (5)
  { name: 'Digital Multimeter', category: 'Measurement', description: 'Digital multimeter DMM' },
  { name: 'Laser Level', category: 'Measurement', description: 'Laser level tool' },
  { name: 'Distance Meter', category: 'Measurement', description: 'Laser distance meter 50m' },
  { name: 'Chalk Line', category: 'Measurement', description: 'Snap chalk line reel' },
  { name: 'Angle Finder', category: 'Measurement', description: 'Digital angle finder' },
];


const main = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI || 'mongodb://localhost:27017/offsite');
    console.log('Connected to MongoDB');

    // Check if tools already exist
    const existingCount = await Tool.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing tools. Skipping seed.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create tools
    const tools = [];
    for (const toolData of MOCK_TOOLS) {
      const toolId = await generateToolId();
      const tool = new Tool({
        toolId,
        ...toolData,
        status: 'AVAILABLE',
        history: [],
        createdBy: new mongoose.Types.ObjectId(), // Default creator
      });
      tools.push(tool);
    }

    // Save all tools
    await Tool.insertMany(tools);
    console.log(`✅ Seeded ${tools.length} tools`);

    // Get tools list for reference
    const allTools = await Tool.find({});
    console.log(`\n✅ Seeded ${allTools.length} tools\n`);
    console.log('Seeded Tools by Category:');
    
    const categories = new Map<string, typeof allTools>();
    allTools.forEach(tool => {
      const category = tool.category || 'Other';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(tool);
    });

    categories.forEach((tools, category) => {
      console.log(`\n${category} (${tools.length}):`);
      tools.forEach(tool => {
        console.log(`  - ${tool.toolId}: ${tool.name}`);
      });
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding tools:', error);
    process.exit(1);
  }
};

main();
