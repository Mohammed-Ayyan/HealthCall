const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const seedDatabase = require('./seedDatabase');

const DEMO_EMAILS = [
  'dr.rahul@metrohealth.eco',
  'clara.o@metrohealth.eco',
  'rahul.sharma@email.com',
  'marcus.s@metrohealth.eco',
  'eleanor.v@metrohealth.eco',
  'admin@metrohealth.eco',
];

async function cleanDatabase() {
  console.log('====================================================');
  console.log('  HealthCall — Database Cleanup & Reset to Clean State');
  console.log('====================================================\n');

  const dbUrl = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/careops';
  await mongoose.connect(dbUrl);
  console.log('[CLEAN] Connected to MongoDB at:', dbUrl);

  const db = mongoose.connection.db;

  // 1. Log BEFORE counts
  console.log('\n--- BEFORE Cleanup Counts ---');
  const beforeTasks = await db.collection('tasks').countDocuments().catch(() => 0);
  const beforeAppts = await db.collection('appointments').countDocuments().catch(() => 0);
  const beforeClaims = await db.collection('insuranceclaims').countDocuments().catch(() => 0);
  const beforeUsers = await db.collection('users').countDocuments().catch(() => 0);
  const beforePatients = await db.collection('patients').countDocuments().catch(() => 0);
  const beforeDoctors = await db.collection('doctors').countDocuments().catch(() => 0);
  const beforeDepts = await db.collection('departments').countDocuments().catch(() => 0);

  console.log(`- Tasks: ${beforeTasks}`);
  console.log(`- Appointments: ${beforeAppts}`);
  console.log(`- Insurance Claims: ${beforeClaims}`);
  console.log(`- Users: ${beforeUsers}`);
  console.log(`- Patients: ${beforePatients}`);
  console.log(`- Doctors: ${beforeDoctors}`);
  console.log(`- Departments: ${beforeDepts}`);

  // 2. Perform Transactional Deletions of Operational Data
  console.log('\n--- Clearing Operational Data ---');
  const delTasks = await db.collection('tasks').deleteMany({});
  console.log(`✓ Deleted ${delTasks.deletedCount} operational tasks.`);

  const delAppts = await db.collection('appointments').deleteMany({});
  console.log(`✓ Deleted ${delAppts.deletedCount} operational appointments.`);

  const delClaims = await db.collection('insuranceclaims').deleteMany({});
  console.log(`✓ Deleted ${delClaims.deletedCount} operational insurance claims.`);

  // 3. Clean Stale Registration Test Records
  console.log('\n--- Pruning Stale Test Profiles (Preserving Master Demo Profiles) ---');
  const delUsers = await db.collection('users').deleteMany({ email: { $nin: DEMO_EMAILS } });
  console.log(`✓ Pruned ${delUsers.deletedCount} test user accounts.`);

  const delPatients = await db.collection('patients').deleteMany({ email: { $nin: ['rahul.sharma@email.com'] } });
  console.log(`✓ Pruned ${delPatients.deletedCount} test patient records.`);

  const delDoctors = await db.collection('doctors').deleteMany({ email: { $nin: ['dr.rahul@metrohealth.eco'] } });
  console.log(`✓ Pruned ${delDoctors.deletedCount} test doctor profiles.`);

  await mongoose.disconnect();

  // 4. Re-synchronize Master Profiles via seedDatabase()
  console.log('\n--- Re-synchronizing Master Reference Profiles ---');
  await seedDatabase();

  // 5. Reconnect to log AFTER counts
  await mongoose.connect(dbUrl);
  console.log('\n--- AFTER Cleanup Counts (Clean State) ---');
  const afterTasks = await db.collection('tasks').countDocuments().catch(() => 0);
  const afterAppts = await db.collection('appointments').countDocuments().catch(() => 0);
  const afterClaims = await db.collection('insuranceclaims').countDocuments().catch(() => 0);
  const afterUsers = await db.collection('users').countDocuments().catch(() => 0);
  const afterPatients = await db.collection('patients').countDocuments().catch(() => 0);
  const afterDoctors = await db.collection('doctors').countDocuments().catch(() => 0);
  const afterDepts = await db.collection('departments').countDocuments().catch(() => 0);

  console.log(`- Tasks: ${afterTasks} (Target: 0)`);
  console.log(`- Appointments: ${afterAppts} (Target: 0)`);
  console.log(`- Insurance Claims: ${afterClaims} (Target: 0)`);
  console.log(`- Users: ${afterUsers} (Target: 6 master accounts)`);
  console.log(`- Patients: ${afterPatients} (Target: 1 master patient)`);
  console.log(`- Doctors: ${afterDoctors} (Target: 1 master doctor)`);
  console.log(`- Departments: ${afterDepts} (Target: 5 master departments)`);

  await mongoose.disconnect();
  console.log('\n====================================================');
  console.log('  Database Cleanup & Master Sync Completed Successfully!');
  console.log('====================================================');
}

cleanDatabase().catch((err) => {
  console.error('[CLEANUP FAILED]:', err);
  process.exit(1);
});
