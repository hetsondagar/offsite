const mongoose = require('mongoose');
require('dotenv').config();
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/offsite';

(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    
    const projectCollection = mongoose.connection.db.collection('projects');
    const managerUserId = new mongoose.Types.ObjectId('69721a0c9775ab1c15c07f11'); // Manager OSPM0001
    const projectId = new mongoose.Types.ObjectId('69751577ecaa128470d283d8'); // ajsckhn project
    
    // Add manager to project members
    const result = await projectCollection.updateOne(
      { _id: projectId },
      { $addToSet: { members: managerUserId } }
    );
    
    console.log('Updated project:');
    console.log('  Matched:', result.matchedCount);
    console.log('  Modified:', result.modifiedCount);
    
    // Verify
    const updated = await projectCollection.findOne({ _id: projectId });
    console.log('\nProject members after update:');
    updated.members.forEach(m => {
      console.log('  -', m.toString());
    });
    
    await mongoose.disconnect();
    console.log('\nDone! Manager should now see pending invoices for this project.');
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
