/**
 * Script to fix contractor invoices - remove GST and recalculate total
 * Total should be: labourCountTotal * ratePerLabour (no GST)
 * Usage: npx ts-node scripts/fix-contractor-invoice-calculation.ts
 */

import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { ContractorInvoice } from '../src/modules/contractor/contractor-invoice.model';

const main = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI || 'mongodb://localhost:27017/offsite');
    console.log('Connected to MongoDB');

    // Get all invoices
    const invoices = await ContractorInvoice.find({});
    console.log(`Found ${invoices.length} invoices to process`);

    let updatedCount = 0;

    for (const invoice of invoices) {
      // Recalculate: no GST, total = labourCountTotal * ratePerLabour
      const newTaxableAmount = invoice.labourCountTotal * invoice.ratePerLabour;
      const newGstAmount = 0;
      const newTotalAmount = newTaxableAmount;

      if (
        invoice.taxableAmount !== newTaxableAmount ||
        invoice.gstAmount !== newGstAmount ||
        invoice.totalAmount !== newTotalAmount
      ) {
        await ContractorInvoice.findByIdAndUpdate(invoice._id, {
          $set: {
            taxableAmount: newTaxableAmount,
            gstAmount: newGstAmount,
            totalAmount: newTotalAmount,
          },
        });
        updatedCount++;
        console.log(
          `✅ Invoice ${invoice.invoiceNumber}: Total = ${newTaxableAmount} (was ${invoice.totalAmount})`
        );
      }
    }

    console.log(`\nUpdated ${updatedCount} invoices`);
    console.log('Changes: Removed GST, Total = labourCountTotal × ratePerLabour');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();
