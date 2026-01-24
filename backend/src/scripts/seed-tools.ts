import mongoose from 'mongoose';
import { Tool } from '../modules/tools/tool.model';
import { User } from '../modules/users/user.model';
import dotenv from 'dotenv';

dotenv.config();

const toolsData = [
  // Power Tools
  { toolId: 'DRL001', name: 'Electric Drill 13mm', category: 'Power Tools', description: 'Heavy-duty electric drill with 13mm chuck' },
  { toolId: 'DRL002', name: 'Hammer Drill 16mm', category: 'Power Tools', description: 'Rotary hammer drill for concrete drilling' },
  { toolId: 'CIR003', name: 'Circular Saw 7.25"', category: 'Power Tools', description: '7.25 inch circular saw for wood cutting' },
  { toolId: 'JIG004', name: 'Jigsaw 550W', category: 'Power Tools', description: 'Electric jigsaw for curved cuts' },
  { toolId: 'GRD005', name: 'Angle Grinder 4.5"', category: 'Power Tools', description: '4.5 inch angle grinder for metal cutting' },
  { toolId: 'GRD006', name: 'Angle Grinder 7"', category: 'Power Tools', description: '7 inch angle grinder for heavy cutting' },
  { toolId: 'SND007', name: 'Orbital Sander', category: 'Power Tools', description: 'Random orbital sander for surface finishing' },
  { toolId: 'PLN008', name: 'Electric Planer', category: 'Power Tools', description: 'Electric planer for wood smoothing' },
  { toolId: 'RTR009', name: 'Router 1400W', category: 'Power Tools', description: 'High-power router for woodworking' },
  { toolId: 'MTR010', name: 'Impact Driver 18V', category: 'Power Tools', description: 'Cordless impact driver for screws' },
  
  // Hand Tools
  { toolId: 'HMR011', name: 'Claw Hammer 1.5kg', category: 'Hand Tools', description: 'Standard claw hammer' },
  { toolId: 'HMR012', name: 'Sledge Hammer 5kg', category: 'Hand Tools', description: 'Heavy sledge hammer for demolition' },
  { toolId: 'WRN013', name: 'Adjustable Wrench Set', category: 'Hand Tools', description: 'Set of 3 adjustable wrenches' },
  { toolId: 'SCW014', name: 'Screwdriver Set', category: 'Hand Tools', description: 'Set of 10 screwdrivers (flat/Phillips)' },
  { toolId: 'PLR015', name: 'Pliers Set', category: 'Hand Tools', description: 'Set of 5 different pliers' },
  { toolId: 'CHS016', name: 'Chisel Set', category: 'Hand Tools', description: 'Set of 8 wood chisels' },
  { toolId: 'LVL017', name: 'Spirit Level 1m', category: 'Hand Tools', description: '1 meter spirit level' },
  { toolId: 'LVL018', name: 'Spirit Level 2m', category: 'Hand Tools', description: '2 meter spirit level' },
  { toolId: 'TAP019', name: 'Measuring Tape 5m', category: 'Hand Tools', description: '5 meter measuring tape' },
  { toolId: 'TAP020', name: 'Measuring Tape 10m', category: 'Hand Tools', description: '10 meter measuring tape' },
  
  // Cutting Tools
  { toolId: 'HKS021', name: 'Hacksaw', category: 'Cutting Tools', description: 'Standard hacksaw for metal cutting' },
  { toolId: 'HKS022', name: 'Hand Saw', category: 'Cutting Tools', description: 'Traditional hand saw for wood' },
  { toolId: 'SNP023', name: 'Tin Snips', category: 'Cutting Tools', description: 'Heavy-duty tin snips' },
  { toolId: 'WRC024', name: 'Wire Cutter', category: 'Cutting Tools', description: 'Heavy-duty wire cutter' },
  { toolId: 'BOL025', name: 'Bolt Cutter', category: 'Cutting Tools', description: '24 inch bolt cutter' },
  
  // Measuring Tools
  { toolId: 'SQE026', name: 'Carpenter Square', category: 'Measuring Tools', description: 'Steel carpenter square' },
  { toolId: 'SQE027', name: 'Try Square', category: 'Measuring Tools', description: 'Precision try square' },
  { toolId: 'CLP028', name: 'Caliper', category: 'Measuring Tools', description: 'Digital caliper for precise measurements' },
  { toolId: 'LSR029', name: 'Laser Level', category: 'Measuring Tools', description: 'Self-leveling laser level' },
  { toolId: 'LSR030', name: 'Laser Distance Meter', category: 'Measuring Tools', description: 'Digital laser distance meter' },
  
  // Masonry Tools
  { toolId: 'TRW031', name: 'Trowel', category: 'Masonry Tools', description: 'Pointing trowel for masonry' },
  { toolId: 'TRW032', name: 'Brick Trowel', category: 'Masonry Tools', description: 'Standard brick laying trowel' },
  { toolId: 'FLT033', name: 'Float', category: 'Masonry Tools', description: 'Concrete finishing float' },
  { toolId: 'HOD034', name: 'Hod', category: 'Masonry Tools', description: 'Masonry hod for carrying bricks' },
  { toolId: 'JOL035', name: 'Jointer', category: 'Masonry Tools', description: 'Brick jointer tool' },
  
  // Concrete Tools
  { toolId: 'VBR036', name: 'Concrete Vibrator', category: 'Concrete Tools', description: 'Electric concrete vibrator' },
  { toolId: 'TMP037', name: 'Concrete Tamper', category: 'Concrete Tools', description: 'Heavy-duty concrete tamper' },
  { toolId: 'EDG038', name: 'Concrete Edger', category: 'Concrete Tools', description: 'Concrete edging tool' },
  { toolId: 'GRT039', name: 'Concrete Groover', category: 'Concrete Tools', description: 'Concrete grooving tool' },
  { toolId: 'SCF040', name: 'Concrete Screed', category: 'Concrete Tools', description: 'Aluminum screed board' },
  
  // Safety Equipment
  { toolId: 'HMT041', name: 'Hard Hat', category: 'Safety Equipment', description: 'Construction hard hat' },
  { toolId: 'SFT042', name: 'Safety Glasses', category: 'Safety Equipment', description: 'ANSI certified safety glasses' },
  { toolId: 'GRV043', name: 'Safety Gloves', category: 'Safety Equipment', description: 'Cut-resistant work gloves' },
  { toolId: 'BTS044', name: 'Safety Boots', category: 'Safety Equipment', description: 'Steel toe safety boots' },
  { toolId: 'VST045', name: 'Safety Vest', category: 'Safety Equipment', description: 'High-visibility safety vest' },
  
  // Lifting Equipment
  { toolId: 'JAK046', name: 'Hydraulic Jack 5T', category: 'Lifting Equipment', description: '5 ton hydraulic jack' },
  { toolId: 'JAK047', name: 'Hydraulic Jack 10T', category: 'Lifting Equipment', description: '10 ton hydraulic jack' },
  { toolId: 'PRY048', name: 'Crowbar', category: 'Lifting Equipment', description: 'Heavy-duty crowbar' },
  { toolId: 'PRY049', name: 'Pry Bar Set', category: 'Lifting Equipment', description: 'Set of 3 pry bars' },
  { toolId: 'LVR050', name: 'Lever', category: 'Lifting Equipment', description: 'Heavy-duty lever bar' },
];

async function seedTools() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/offsite');
    console.log('Connected to MongoDB');

    // Find an owner user to use as createdBy
    const owner = await User.findOne({ role: 'owner' });
    if (!owner) {
      console.error('No owner user found. Please create an owner user first.');
      process.exit(1);
    }

    // Clear existing tools (optional - comment out if you want to keep existing)
    // await Tool.deleteMany({});
    // console.log('Cleared existing tools');

    // Insert tools
    let created = 0;
    let skipped = 0;

    for (const toolData of toolsData) {
      const existing = await Tool.findOne({ toolId: toolData.toolId });
      if (existing) {
        console.log(`Tool ${toolData.toolId} already exists, skipping...`);
        skipped++;
        continue;
      }

      const tool = new Tool({
        ...toolData,
        status: 'AVAILABLE',
        history: [],
        createdBy: owner._id,
      });

      await tool.save();
      created++;
      console.log(`Created tool: ${toolData.toolId} - ${toolData.name}`);
    }

    console.log(`\nSeed completed!`);
    console.log(`Created: ${created} tools`);
    console.log(`Skipped: ${skipped} tools (already exist)`);
    console.log(`Total: ${toolsData.length} tools`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding tools:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedTools();
