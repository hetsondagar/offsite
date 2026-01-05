/**
 * Migration Script: Drop duplicate invoiceNumber index
 * 
 * Run this script once to fix the duplicate key error issue.
 * 
 * Usage: node backend/scripts/fix-invoice-index.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixInvoiceIndex() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/offsite';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get the invoices collection
    const db = mongoose.connection.db;
    const collection = db.collection('invoices');

    // List all indexes
    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Drop the duplicate invoiceNumber_1 index if it exists
    try {
      await collection.dropIndex('invoiceNumber_1');
      console.log('\n✅ Dropped duplicate invoiceNumber_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('\n⚠️  Index invoiceNumber_1 does not exist (already removed)');
      } else {
        throw error;
      }
    }

    // Drop the old invoiceId_1 index if it exists (legacy field)
    try {
      await collection.dropIndex('invoiceId_1');
      console.log('✅ Dropped legacy invoiceId_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('⚠️  Index invoiceId_1 does not exist (already removed)');
      } else {
        console.warn('⚠️  Could not drop invoiceId_1 index:', error.message);
      }
    }

    // Verify the unique sparse index still exists
    const finalIndexes = await collection.indexes();
    console.log('\n📋 Final indexes:');
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    const hasUniqueIndex = finalIndexes.some(
      index => index.key.invoiceNumber && index.unique && index.sparse
    );

    if (hasUniqueIndex) {
      console.log('\n✅ Unique sparse index on invoiceNumber is correctly configured');
    } else {
      console.log('\n⚠️  Creating unique sparse index on invoiceNumber...');
      await collection.createIndex(
        { invoiceNumber: 1 },
        { unique: true, sparse: true }
      );
      console.log('✅ Created unique sparse index');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('You can now create invoices without duplicate key errors.\n');

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
fixInvoiceIndex();
