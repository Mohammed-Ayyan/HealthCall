/**
 * CareOps AI - Cloud Database Setup & Collections Initialization
 * 
 * Connects to MongoDB Atlas Cloud Cluster, creates collections ("tables"),
 * builds indexes, and provisions initial system accounts.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { connectDB, disconnectDB } = require("../config/db");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const { USER_ROLES } = require("../config/roles");

async function setupCloudDatabase() {
  console.log("==================================================");
  console.log("CareOps AI - MongoDB Atlas Cloud Table / Collection Setup");
  console.log("Database URI:", process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:]*@/, ":****@") : "N/A");
  console.log("==================================================");

  try {
    const conn = await connectDB();
    console.log(`\n[1/4] Connected to cloud database: ${conn.name}`);

    // 1. Ensure Collections Exist
    console.log("\n[2/4] Initializing Collections ('Tables') in Cloud...");
    const existingCollections = await conn.db.listCollections().toArray();
    const existingNames = existingCollections.map((c) => c.name);

    const requiredCollections = ["users", "doctors", "patients"];
    for (const colName of requiredCollections) {
      if (!existingNames.includes(colName)) {
        await conn.db.createCollection(colName);
        console.log(`  + Created collection: ${colName}`);
      } else {
        console.log(`  ✓ Collection already exists: ${colName}`);
      }
    }

    // 2. Build Schema Indexes
    console.log("\n[3/4] Ensuring Indexes across collections...");
    await User.createIndexes();
    console.log("  ✓ User collection indexes built (email unique, role, status)");
    await Doctor.createIndexes();
    console.log("  ✓ Doctor collection indexes built (employeeId unique, userId unique)");
    await Patient.createIndexes();
    console.log("  ✓ Patient collection indexes built (mrn unique, userId unique, email, phone)");

    // 3. Seed Default Staff Accounts
    console.log("\n[4/4] Provisioning default system accounts...");
    const seedAccounts = [
      {
        name: "Hospital Super Admin",
        email: "admin@careops.org",
        password: "Password123!",
        role: USER_ROLES.ADMIN,
        department: "Operations",
        phone: "+1-555-0100",
      },
      {
        name: "Dr. Jordan Hayes, MD",
        email: "j.hayes@metrohealth.eco",
        password: "Password123!",
        role: USER_ROLES.DOCTOR,
        department: "Emergency Medicine",
        phone: "+1-555-0101",
      },
      {
        name: "Sarah Miller (Reception)",
        email: "reception@metrohealth.eco",
        password: "Password123!",
        role: USER_ROLES.RECEPTIONIST,
        department: "Front Desk",
        phone: "+1-555-0102",
      },
      {
        name: "Marcus Vance",
        email: "patient@metrohealth.eco",
        password: "Password123!",
        role: USER_ROLES.PATIENT,
        department: "",
        phone: "+1-555-0103",
      },
    ];

    for (const acc of seedAccounts) {
      const exists = await User.findOne({ email: acc.email });
      if (!exists) {
        const created = await User.create(acc);
        console.log(`  + Created default user: ${acc.email} (${acc.role})`);

        // If doctor, create linked doctor profile
        if (acc.role === USER_ROLES.DOCTOR) {
          await Doctor.create({
            userId: created._id,
            employeeId: "DOC-2026-001",
            name: acc.name,
            email: acc.email,
            phone: acc.phone,
            department: acc.department,
            specialization: "Emergency & Critical Care",
            qualifications: ["MD", "ABEM Certified"],
          });
          console.log(`    + Created linked doctor profile for ${acc.name}`);
        }
      } else {
        console.log(`  ✓ User exists: ${acc.email} (${acc.role})`);
      }
    }

    // 4. Summarize Database State
    const finalCollections = await conn.db.listCollections().toArray();
    console.log("\n==================================================");
    console.log("Cloud Database Setup Completed Successfully!");
    console.log("Database:", conn.name);
    console.log("Collections:", finalCollections.map((c) => c.name));
    for (const col of finalCollections) {
      const count = await conn.db.collection(col.name).countDocuments();
      console.log(`  • ${col.name}: ${count} records`);
    }
    console.log("==================================================");
  } catch (error) {
    console.error("\n[Error during Cloud Setup]:", error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  setupCloudDatabase();
}

module.exports = { setupCloudDatabase };
