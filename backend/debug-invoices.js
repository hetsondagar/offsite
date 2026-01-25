const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/offsite';

async function debugInvoices() {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log('Connected to MongoDB');

    // Check all contractor invoices
    const contractorInvoiceCollection = mongoose.connection.db.collection('contractorinvoices');
    const allInvoices = await contractorInvoiceCollection.find({}).toArray();
    console.log('\n=== ALL CONTRACTOR INVOICES ===');
    console.log(`Total invoices: ${allInvoices.length}`);
    console.log(JSON.stringify(allInvoices.slice(0, 5), null, 2));

    // Check pending invoices
    const pendingInvoices = await contractorInvoiceCollection.find({ status: 'PENDING_PM_APPROVAL' }).toArray();
    console.log('\n=== PENDING PM APPROVAL INVOICES ===');
    console.log(`Count: ${pendingInvoices.length}`);
    if (pendingInvoices.length > 0) {
      console.log(JSON.stringify(pendingInvoices.slice(0, 5), null, 2));
    }

    // Check all projects
    const projectCollection = mongoose.connection.db.collection('projects');
    const allProjects = await projectCollection.find({}).toArray();
    console.log('\n=== ALL PROJECTS ===');
    console.log(`Total projects: ${allProjects.length}`);
    console.log(JSON.stringify(allProjects.slice(0, 3), null, 2));

    // Check users
    const userCollection = mongoose.connection.db.collection('users');
    const allUsers = await userCollection.find({ role: 'manager' }).toArray();
    console.log('\n=== MANAGER USERS ===');
    console.log(`Total managers: ${allUsers.length}`);
    console.log(JSON.stringify(allUsers.slice(0, 3), null, 2));

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugInvoices();
