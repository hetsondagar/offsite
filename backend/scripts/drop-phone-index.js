/**
 * Script to drop the unique index on the phone field
 * Run this script using: node backend/scripts/drop-phone-index.js
 * 
 * This fixes the issue where signup fails when phone number is not provided
 * due to an old unique index on the phone field.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function dropPhoneIndex() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/offsite';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get the users collection
    const collection = mongoose.connection.db.collection('users');

    // List all indexes
    const indexes = await collection.indexes();
    console.log('\nCurrent indexes on users collection:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${idx.unique || false})`);
    });

    // Check if phone_1 unique index exists
    const phoneUniqueIndex = indexes.find(idx => 
      idx.name === 'phone_1' && idx.unique === true
    );

    if (phoneUniqueIndex) {
      console.log('\n⚠️  Found unique index on phone field (phone_1)');
      console.log('Dropping unique index on phone field...');
      
      try {
        await collection.dropIndex('phone_1');
        console.log('✅ Successfully dropped unique index on phone field');
      } catch (error) {
        if (error.code === 27) {
          console.log('ℹ️  Index phone_1 does not exist (may have been already dropped)');
        } else {
          throw error;
        }
      }
    } else {
      console.log('\n✅ No unique index found on phone field - phone is already optional');
    }

    // Verify sparse index exists (for fast lookups without uniqueness)
    const phoneSparseIndex = indexes.find(idx => 
      idx.name === 'phone_1' && idx.sparse === true
    );

    if (!phoneSparseIndex) {
      console.log('\nCreating sparse index on phone field for fast lookups...');
      await collection.createIndex({ phone: 1 }, { sparse: true });
      console.log('✅ Created sparse index on phone field');
    } else {
      console.log('\n✅ Sparse index on phone field already exists');
    }

    // List indexes again to confirm
    const finalIndexes = await collection.indexes();
    console.log('\nFinal indexes on users collection:');
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${idx.unique || false}, sparse: ${idx.sparse || false})`);
    });

    console.log('\n✅ Phone field is now optional. Signup should work without phone number.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
dropPhoneIndex();

