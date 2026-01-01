/**
 * Script to fix phone field index issues
 * 
 * Run this in MongoDB shell or MongoDB Compass:
 * 
 * use offsite  // or your database name
 * 
 * // Drop the old unique index on phone
 * db.users.dropIndex("phone_1")
 * 
 * // Clean up existing empty phone strings
 * db.users.updateMany(
 *   { $or: [{ phone: "" }, { phone: null }] },
 *   { $unset: { phone: "" } }
 * )
 * 
 * // Verify the index is gone
 * db.users.getIndexes()
 * 
 * The new non-unique sparse index will be created automatically by Mongoose on next server start.
 */

console.log(`
To fix the phone field index issue, run these commands in MongoDB:

1. Connect to your database:
   use offsite

2. Drop the old unique index:
   db.users.dropIndex("phone_1")

3. Clean up existing empty phone strings:
   db.users.updateMany(
     { $or: [{ phone: "" }, { phone: null }] },
     { $unset: { phone: "" } }
   )

4. Verify indexes:
   db.users.getIndexes()

The new non-unique sparse index will be created automatically.
`);

