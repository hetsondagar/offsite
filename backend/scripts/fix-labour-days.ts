/**
 * Script to update contractor invoices with Labour Days from 0 to 10
 * Usage: npx ts-node scripts/fix-labour-days.ts
 */

import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { ContractorInvoice } from '../src/modules/contractor/contractor-invoice.model';

const main = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI || 'mongodb://localhost:27017/offsite');
    console.log('Connected to MongoDB');

    // Find all invoices with labourCountTotal = 0
    const invoicesWithZero = await ContractorInvoice.find({ labourCountTotal: 0 });
    console.log(`Found ${invoicesWithZero.length} invoices with Labour Days = 0`);

    if (invoicesWithZero.length === 0) {
      console.log('No invoices to update');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Update all to 10
    const result = await ContractorInvoice.updateMany(
      { labourCountTotal: 0 },
      {
        $set: {
          labourCountTotal: 10,
        },
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} invoices`);
    console.log(`Labour Days changed from 0 to 10 for all affected invoices`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();
