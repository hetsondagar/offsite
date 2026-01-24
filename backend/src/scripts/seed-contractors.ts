import mongoose from 'mongoose';
import { Contractor } from '../modules/contractor/contractor.model';
import { User } from '../modules/users/user.model';
import { generateOffsiteId } from '../utils/generateOffsiteId';
import dotenv from 'dotenv';

dotenv.config();

// Indian contractor names with realistic company names
const contractorsData = [
  { name: 'Rajesh Kumar', companyName: 'Kumar Construction Services', rating: 4.5 },
  { name: 'Amit Sharma', companyName: 'Sharma Builders & Contractors', rating: 4.8 },
  { name: 'Vikram Singh', companyName: 'Singh Infrastructure Pvt Ltd', rating: 4.2 },
  { name: 'Priya Patel', companyName: 'Patel Construction Works', rating: 4.7 },
  { name: 'Rahul Mehta', companyName: 'Mehta Engineering Solutions', rating: 4.4 },
  { name: 'Suresh Reddy', companyName: 'Reddy Builders', rating: 4.6 },
  { name: 'Anjali Desai', companyName: 'Desai Contractors', rating: 4.3 },
  { name: 'Mohammed Ali', companyName: 'Ali Construction Services', rating: 4.5 },
  { name: 'Deepak Joshi', companyName: 'Joshi Builders & Associates', rating: 4.1 },
  { name: 'Kavita Nair', companyName: 'Nair Construction Group', rating: 4.9 },
  { name: 'Nikhil Gupta', companyName: 'Gupta Builders', rating: 4.0 },
  { name: 'Sunita Iyer', companyName: 'Iyer Construction Services', rating: 4.6 },
  { name: 'Arjun Malhotra', companyName: 'Malhotra Builders', rating: 4.3 },
  { name: 'Meera Kapoor', companyName: 'Kapoor Contractors', rating: 4.7 },
  { name: 'Ravi Verma', companyName: 'Verma Infrastructure', rating: 4.2 },
  { name: 'Sneha Agarwal', companyName: 'Agarwal Construction', rating: 4.8 },
  { name: 'Karan Thakur', companyName: 'Thakur Builders & Co', rating: 4.4 },
  { name: 'Divya Menon', companyName: 'Menon Construction Works', rating: 4.5 },
  { name: 'Harsh Shah', companyName: 'Shah Builders Pvt Ltd', rating: 4.1 },
  { name: 'Pooja Rao', companyName: 'Rao Construction Services', rating: 4.6 },
  { name: 'Yash Jain', companyName: 'Jain Builders', rating: 4.3 },
  { name: 'Neha Bhatt', companyName: 'Bhatt Contractors', rating: 4.7 },
  { name: 'Aditya Chawla', companyName: 'Chawla Construction Group', rating: 4.4 },
  { name: 'Swati Dutta', companyName: 'Dutta Builders', rating: 4.2 },
  { name: 'Rohit Banerjee', companyName: 'Banerjee Infrastructure', rating: 4.5 },
];

async function seedContractors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/offsite');
    console.log('Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const contractorData of contractorsData) {
      // Check if user with this name already exists
      let user = await User.findOne({ 
        name: { $regex: new RegExp(`^${contractorData.name}$`, 'i') },
        role: 'contractor'
      });

      if (user) {
        // Check if contractor record exists
        const existingContractor = await Contractor.findOne({ userId: user._id });
        if (existingContractor) {
          console.log(`Contractor ${contractorData.name} already exists, skipping...`);
          skipped++;
          continue;
        }
      } else {
        // Create new user
        const offsiteId = await generateOffsiteId('contractor');
        user = new User({
          name: contractorData.name,
          email: `${contractorData.name.toLowerCase().replace(/\s+/g, '.')}@contractor.offsite.com`,
          password: '$2b$10$dummy.hash.for.seeded.users.change.in.production', // Dummy hash - should be changed in production
          role: 'contractor',
          offsiteId,
          isActive: true,
        });
        await user.save();
        console.log(`Created user: ${contractorData.name} (${offsiteId})`);
      }

      // Create contractor record
      const contractor = new Contractor({
        userId: user._id,
        assignedProjects: [],
        rating: contractorData.rating,
        contracts: [],
      });

      await contractor.save();
      created++;
      console.log(`Created contractor: ${contractorData.name} (Rating: ${contractorData.rating})`);
    }

    console.log(`\nSeed completed!`);
    console.log(`Created: ${created} contractors`);
    console.log(`Skipped: ${skipped} contractors (already exist)`);
    console.log(`Total: ${contractorsData.length} contractors`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding contractors:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedContractors();
