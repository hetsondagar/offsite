import { connectDB } from '../src/config/db';
import { calculateBillableAmount } from '../src/modules/invoices/billable-amount.service';
import { MaterialRequest } from '../src/modules/materials/material.model';

async function run(projectId: string, fromIso: string, toIso: string) {
  await connectDB();
  console.log('Connected to DB');

  const from = new Date(fromIso);
  const to = new Date(toIso);

  console.log(`Querying approved material requests for project ${projectId} between ${from.toISOString()} and ${to.toISOString()}`);

  const approvedMaterials = await MaterialRequest.find({
    projectId,
    status: 'approved',
    approvedAt: { $gte: from, $lte: to },
  }).lean();

  console.log('Approved materials found:', approvedMaterials.length);
  for (const m of approvedMaterials) {
    console.log({ id: m._id, materialName: m.materialName, quantity: m.quantity, unit: m.unit, approvedAt: m.approvedAt });
  }

  console.log('\nRunning calculateBillableAmount...');
  const result = await calculateBillableAmount(projectId, from, to);
  console.log('Billable result:', JSON.stringify(result, null, 2));

  process.exit(0);
}

// CLI args: projectId fromIso toIso
const [,, projectId, fromIso, toIso] = process.argv;
if (!projectId || !fromIso || !toIso) {
  console.error('Usage: ts-node scripts/diagnoseBillable.ts <projectId> <fromIso> <toIso>');
  process.exit(2);
}

run(projectId, fromIso, toIso).catch(err => {
  console.error(err);
  process.exit(1);
});
