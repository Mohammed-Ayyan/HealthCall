const mongoose = require('mongoose');

async function audit() {
  await mongoose.connect('mongodb://127.0.0.1:27017/careops');
  console.log('[AUDIT] Connected to MongoDB 127.0.0.1:27017/careops');
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('\n--- MongoDB Collections ---');
  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(`- ${col.name}: ${count} documents`);
  }

  // Check specific operational collections
  const taskCount = await mongoose.connection.db.collection('tasks').countDocuments().catch(() => 0);
  const apptCount = await mongoose.connection.db.collection('appointments').countDocuments().catch(() => 0);
  const userCount = await mongoose.connection.db.collection('users').countDocuments().catch(() => 0);
  const docCount = await mongoose.connection.db.collection('doctors').countDocuments().catch(() => 0);
  const patCount = await mongoose.connection.db.collection('patients').countDocuments().catch(() => 0);
  const deptCount = await mongoose.connection.db.collection('departments').countDocuments().catch(() => 0);

  console.log('\nDetailed Counts:');
  console.log(`Tasks: ${taskCount}`);
  console.log(`Appointments: ${apptCount}`);
  console.log(`Users: ${userCount}`);
  console.log(`Doctors: ${docCount}`);
  console.log(`Patients: ${patCount}`);
  console.log(`Departments: ${deptCount}`);

  await mongoose.disconnect();
}

audit().catch(console.error);
