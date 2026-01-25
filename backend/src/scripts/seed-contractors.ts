import mongoose from 'mongoose';
import { Contractor } from '../modules/contractor/contractor.model';
import { Project } from '../modules/projects/project.model';
import { User } from '../modules/users/user.model';
import { generateOffsiteId } from '../utils/generateOffsiteId';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const dotenvPath = (() => {
  if (process.env.DOTENV_PATH) return process.env.DOTENV_PATH;
  const envDefault = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envDefault)) return envDefault;
  const envMongo = path.resolve(process.cwd(), '.env.mongodb');
  if (fs.existsSync(envMongo)) return envMongo;
  return undefined;
})();

dotenv.config(dotenvPath ? { path: dotenvPath } : undefined);

// Indian contractor names with realistic company names
const contractorsData = [
  { name: 'Rajesh Kumar', companyName: 'Kumar Construction Services', rating: 4.5 },
  { name: 'Amit Sharma', companyName: 'Sharma Builders & Contractors', rating: 4.8 },
  { name: 'Vikram Singh', companyName: 'Singh Infrastructure Pvt Ltd', rating: 4.2 },
  { name: 'Priya Patel', companyName: 'Patel Construction Works', rating: 4.7 },
  { name: 'Rahul Mehta', companyName: 'Mehta Engineering Solutions', rating: 4.4 },
];

type SeedContractor = {
  name: string;
  companyName: string;
  rating: number;
};

const DEFAULT_OWNER_EMAIL = 'seed.owner@offsite.local';
const DEFAULT_PM_EMAIL = 'seed.pm@offsite.local';
const DEFAULT_SEED_PASSWORD = 'ChangeMe123!';

async function ensureSeedUser(params: {
  role: 'owner' | 'manager';
  defaultName: string;
  defaultEmail: string;
  preferredEmailEnvVar?: 'SEED_OWNER_EMAIL' | 'SEED_MANAGER_EMAIL';
}) {
  const preferredEmail = params.preferredEmailEnvVar
    ? process.env[params.preferredEmailEnvVar]
    : undefined;

  // Prefer an explicitly configured email (useful when you already have a real owner/manager account)
  if (preferredEmail) {
    const byEmail = await User.findOne({
      email: preferredEmail.toLowerCase(),
      role: params.role,
    });
    if (byEmail) {
      console.log(`Using existing ${params.role} by email: ${byEmail.email}`);
      return byEmail;
    }
  }

  // Otherwise reuse any existing user for that role (so seeded data shows up for your current accounts)
  const existingByRole = await User.findOne({ role: params.role }).sort({ createdAt: 1 });
  if (existingByRole) {
    console.log(`Using existing ${params.role}: ${existingByRole.email}`);
    return existingByRole;
  }

  // Finally create a seed user if none exist
  const offsiteId = await generateOffsiteId(params.role);
  const user = new User({
    name: params.defaultName,
    email: (preferredEmail || params.defaultEmail).toLowerCase(),
    password: DEFAULT_SEED_PASSWORD,
    role: params.role,
    offsiteId,
    isActive: true,
    assignedProjects: [],
  });
  await user.save();
  console.log(`Created ${params.role}: ${user.name} (${offsiteId})`);
  return user;
}

function buildMockProjects(params: {
  ownerId: mongoose.Types.ObjectId;
  managerId: mongoose.Types.ObjectId;
  contractorUserIds: mongoose.Types.ObjectId[];
}) {
  const base = new Date();
  const coords = [
    { latitude: 19.0760, longitude: 72.8777 }, // Mumbai
    { latitude: 28.6139, longitude: 77.2090 }, // Delhi
    { latitude: 12.9716, longitude: 77.5946 }, // Bengaluru
  ];

  return [
    {
      name: 'Mock Project - Riverside Tower',
      location: 'Mumbai, Maharashtra',
      startDate: new Date(base.getFullYear(), base.getMonth() - 2, 1),
      geoCenter: coords[0],
      contractorUserId: params.contractorUserIds[0],
    },
    {
      name: 'Mock Project - Metro Depot Expansion',
      location: 'New Delhi, Delhi',
      startDate: new Date(base.getFullYear(), base.getMonth() - 1, 5),
      geoCenter: coords[1],
      contractorUserId: params.contractorUserIds[1] || params.contractorUserIds[0],
    },
    {
      name: 'Mock Project - Tech Park Block C',
      location: 'Bengaluru, Karnataka',
      startDate: new Date(base.getFullYear(), base.getMonth(), 10),
      geoCenter: coords[2],
      contractorUserId: params.contractorUserIds[2] || params.contractorUserIds[0],
    },
  ].map((p) => ({
    ...p,
    ownerId: params.ownerId,
    managerId: params.managerId,
  }));
}

async function seedContractors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/offsite');
    console.log('Connected to MongoDB');

    const ownerUser = await ensureSeedUser({
      role: 'owner',
      defaultName: 'Seed Owner',
      defaultEmail: DEFAULT_OWNER_EMAIL,
      preferredEmailEnvVar: 'SEED_OWNER_EMAIL',
    });
    const managerUser = await ensureSeedUser({
      role: 'manager',
      defaultName: 'Seed Project Manager',
      defaultEmail: DEFAULT_PM_EMAIL,
      preferredEmailEnvVar: 'SEED_MANAGER_EMAIL',
    });

    let created = 0;
    let skipped = 0;
    const seededContractorUserIds: mongoose.Types.ObjectId[] = [];

    const limitedContractors: SeedContractor[] = contractorsData.slice(0, 5);

    for (const contractorData of limitedContractors) {
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
          seededContractorUserIds.push(user._id);
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
      seededContractorUserIds.push(user._id);
      console.log(`Created contractor: ${contractorData.name} (Rating: ${contractorData.rating})`);
    }

    // Create mock projects and link them with contractors + manager + owner
    const mockProjects = buildMockProjects({
      ownerId: ownerUser._id,
      managerId: managerUser._id,
      contractorUserIds: seededContractorUserIds,
    });

    let projectsCreated = 0;
    let projectsSkipped = 0;

    for (const mp of mockProjects) {
      const existingProject = await Project.findOne({
        name: mp.name,
        owner: ownerUser._id,
      }).select('_id');

      let projectId: mongoose.Types.ObjectId;

      if (existingProject) {
        projectsSkipped++;
        projectId = existingProject._id as mongoose.Types.ObjectId;
      } else {
        const project = new Project({
          name: mp.name,
          location: mp.location,
          startDate: mp.startDate,
          status: 'active',
          owner: ownerUser._id,
          members: [ownerUser._id, managerUser._id, mp.contractorUserId],
          progress: 0,
          healthScore: 0,
          geoFence: {
            enabled: true,
            center: mp.geoCenter,
            radiusMeters: 200,
            bufferMeters: 20,
          },
          siteLatitude: mp.geoCenter.latitude,
          siteLongitude: mp.geoCenter.longitude,
          siteRadiusMeters: 200,
        });
        await project.save();
        projectsCreated++;
        projectId = project._id as mongoose.Types.ObjectId;
        console.log(`Created mock project: ${mp.name}`);
      }

      // Ensure project members are set (in case project existed from previous run)
      await Project.updateOne(
        { _id: projectId },
        {
          $addToSet: {
            members: { $each: [ownerUser._id, managerUser._id, mp.contractorUserId] },
          },
          $set: {
            owner: ownerUser._id,
          },
        }
      );

      // Update assignedProjects for owner, project manager, contractor user
      await User.updateMany(
        { _id: { $in: [ownerUser._id, managerUser._id, mp.contractorUserId] } },
        { $addToSet: { assignedProjects: projectId } }
      );

      // Ensure contractor record links to project and contains a mock contract
      const contractorDoc = await Contractor.findOne({ userId: mp.contractorUserId });
      if (contractorDoc) {
        const alreadyAssigned = contractorDoc.assignedProjects.some((p) => p.toString() === projectId.toString());
        if (!alreadyAssigned) {
          contractorDoc.assignedProjects.push(projectId);
        }

        const hasContract = contractorDoc.contracts.some((c) => c.projectId.toString() === projectId.toString());
        if (!hasContract) {
          contractorDoc.contracts.push({
            projectId,
            labourCountPerDay: 20,
            ratePerLabourPerDay: 800,
            gstRate: 18,
            startDate: mp.startDate,
            isActive: true,
          });
        }
        await contractorDoc.save();
      }
    }

    console.log(`\nSeed completed!`);
    console.log(`Created: ${created} contractors`);
    console.log(`Skipped: ${skipped} contractors (already exist)`);
    console.log(`Total: ${limitedContractors.length} contractors`);
    console.log(`Mock projects created: ${projectsCreated}`);
    console.log(`Mock projects skipped: ${projectsSkipped} (already exist)`);
    console.log(`Owner used: ${ownerUser.email}`);
    console.log(`Project Manager used: ${managerUser.email}`);
    console.log(`Tip: set SEED_OWNER_EMAIL and SEED_MANAGER_EMAIL to target specific existing accounts`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding contractors:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedContractors();
