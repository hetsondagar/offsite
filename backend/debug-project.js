const mongoose = require('mongoose');
require('dotenv').config();
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/offsite';

(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const projectCollection = mongoose.connection.db.collection('projects');
    const targetProject = await projectCollection.findOne({ _id: new mongoose.Types.ObjectId('69751577ecaa128470d283d8') });
    console.log('=== TARGET PROJECT (69751577ecaa128470d283d8) ===');
    console.log(JSON.stringify(targetProject, null, 2));
    
    // Check all invoices and their projects
    const invoiceCollection = mongoose.connection.db.collection('contractorinvoices');
    const invoices = await invoiceCollection.find({ status: 'PENDING_PM_APPROVAL' }).toArray();
    console.log('\n=== PENDING INVOICES WITH PROJECTS ===');
    invoices.forEach(inv => {
      console.log('Invoice', inv.invoiceNumber, '=> projectId=', inv.projectId.toString());
    });
    
    // List all projects
    const allProjects = await projectCollection.find({}).project({ _id: 1, name: 1 }).toArray();
    console.log('\n=== ALL PROJECTS IN DB ===');
    allProjects.forEach(p => {
      console.log(p._id.toString(), '=>', p.name);
    });
    
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  }
})();
