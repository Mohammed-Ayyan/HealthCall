const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.resolve('C:\\Users\\sumiy\\.gemini\\antigravity-ide\\brain\\1c2a016d-c088-4569-8dfa-32e0ae63b63d\\database_backup');
const BACKUP_FILE = path.join(BACKUP_DIR, 'careops_pre_cleanup_snapshot.json');

async function backupDatabase() {
  console.log('[BACKUP] Starting MongoDB careops backup...');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  await mongoose.connect('mongodb://127.0.0.1:27017/careops');
  console.log('[BACKUP] Connected to mongodb://127.0.0.1:27017/careops');

  const collections = await mongoose.connection.db.listCollections().toArray();
  const backupData = {
    timestamp: new Date().toISOString(),
    sourceDatabase: 'careops',
    collections: {}
  };

  for (const col of collections) {
    const docs = await mongoose.connection.db.collection(col.name).find({}).toArray();
    backupData.collections[col.name] = docs;
    console.log(`- Dumped ${docs.length} documents from collection: ${col.name}`);
  }

  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`[BACKUP] Saved snapshot to: ${BACKUP_FILE}`);

  // Verify backup
  const stat = fs.statSync(BACKUP_FILE);
  const parsed = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
  console.log(`[BACKUP VERIFICATION] Backup file size: ${(stat.size / 1024).toFixed(2)} KB`);
  console.log(`[BACKUP VERIFICATION] Collections backed up: ${Object.keys(parsed.collections).join(', ')}`);
  
  await mongoose.disconnect();
  console.log('[BACKUP] Completed and verified successfully.');
}

backupDatabase().catch((err) => {
  console.error('[BACKUP FAILED]:', err);
  process.exit(1);
});
