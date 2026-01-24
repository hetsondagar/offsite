/**
 * Clear old tools from database
 */

import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { Tool } from '../src/modules/tools/tool.model';

const main = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI || 'mongodb://localhost:27017/offsite');
    const deleted = await Tool.deleteMany({});
    console.log(`✅ Deleted ${deleted.deletedCount} old tools`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();
