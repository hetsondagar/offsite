/**
 * Migration: Add owner field to existing projects.
 * Sets owner = members[0] (creator) for projects missing owner.
 * Run once after adding owner to Project model: npx ts-node -r tsconfig-paths/register backend/scripts/migrate-project-owner.ts
 */

import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { logger } from '../src/utils/logger';

async function migrate() {
  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No DB connection');
  const coll = db.collection('projects');

  const withoutOwner = await coll.find({
    $or: [{ owner: { $exists: false } }, { owner: null }],
  }).toArray();

  if (withoutOwner.length === 0) {
    logger.info('No projects missing owner. Migration skipped.');
    await mongoose.disconnect();
    return;
  }

  let updated = 0;
  let skipped = 0;
  for (const doc of withoutOwner) {
    const members = doc.members || [];
    const first = members[0];
    if (!first) {
      logger.warn(`Project ${doc._id} has no members; skipping.`);
      skipped++;
      continue;
    }
    await coll.updateOne(
      { _id: doc._id },
      { $set: { owner: first } }
    );
    updated++;
  }

  logger.info(`Migration done. Updated ${updated} projects, skipped ${skipped}.`);
  await mongoose.disconnect();
}

migrate().catch((e) => {
  logger.error('Migration failed:', e);
  process.exit(1);
});
