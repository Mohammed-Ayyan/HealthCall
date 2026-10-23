/**
 * CareOps AI - Standard Database Initializer & Demo Accounts Provisioner
 * 
 * Seeds only the required demo authentication profiles and hospital departments.
 * Zero hardcoded tasks or calls: tasks and calls are generated exclusively from
 * simulated calls, audio uploads, or live microphone recordings.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Department = require("../models/Department");
const Task = require("../models/Task");
const { USER_ROLES } = require("../config/roles");

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/careops";

async function seedDatabase() {
  console.log("==================================================");
  console.log(" CareOps AI - Database Provisioning & Seeder");
  console.log(" Target:", DATABASE_URL.replace(/:[^:]*@/, ":****@"));
  console.log("==================================================");

  try {
    await mongoose.connect(DATABASE_URL);
    console.log("Connected to MongoDB.");

    // 1. Provision Departments
    const departments = [
      { name: "Clinical Care", code: "CLINICAL", description: "Inpatient, surgical, and acute care clinical management" },
      { name: "Central Reception Desk", code: "RECEPTION", description: "Front desk intake, scheduling, and patient registration" },
      { name: "Insurance & Prior-Auth", code: "INSURANCE", description: "Revenue cycle management and insurer clearance" },
      { name: "Administration", code: "ADMINISTRATION", description: "Executive operations, governance, and compliance" },
      { name: "Pharmacy", code: "PHARMACY", description: "Prescription routing and formulary dispensation" },
    ];

    for (const d of departments) {
      await Department.findOneAndUpdate({ name: d.name }, d, { upsert: true, new: true });
    }
    console.log("✓ Departments initialized.");

    // 2. Demo User Accounts
    const demoAccounts = [
      {
        name: "Dr. Rahul Sharma",
        email: "dr.rahul@metrohealth.eco",
        password: "password123",
        role: USER_ROLES.DOCTOR,
        department: "Clinical Care",
        phone: "+1-555-0101",
      },
      {
        name: "Clara Oswald",
        email: "clara.o@metrohealth.eco",
        password: "password123",
        role: USER_ROLES.RECEPTIONIST,
        department: "Central Reception Desk",
        phone: "+1-555-0102",
      },
      {
        name: "Rahul Sharma",
        email: "rahul.sharma@email.com",
        password: "password123",
        role: USER_ROLES.PATIENT,
        department: "General Medicine",
        phone: "+1-555-0192",
      },
      {
        name: "Marcus Shaw",
        email: "marcus.s@metrohealth.eco",
        password: "password123",
        role: USER_ROLES.INSURANCE_EMPLOYEE,
        department: "Insurance & Prior-Auth",
        phone: "+1-555-0104",
      },
      {
        name: "Eleanor Vance",
        email: "eleanor.v@metrohealth.eco",
        password: "password123",
        role: USER_ROLES.DEPARTMENT_MANAGER,
        department: "Clinical Care",
        phone: "+1-555-0105",
      },
      {
        name: "Hospital Administrator",
        email: "admin@metrohealth.eco",
        password: "password123",
        role: USER_ROLES.ADMIN,
        department: "Administration",
        phone: "+1-555-0100",
      },
    ];

    let doctorUserId = null;
    let patientUserId = null;

    for (const acc of demoAccounts) {
      let user = await User.findOne({ email: acc.email });
      if (!user) {
        user = await User.create(acc);
        console.log(`+ Created demo user: ${acc.email} (${acc.role})`);
      } else {
        user.password = acc.password;
        user.name = acc.name;
        user.role = acc.role;
        user.department = acc.department;
        await user.save();
        console.log(`✓ Synchronized demo user: ${acc.email} (${acc.role})`);
      }

      if (acc.role === USER_ROLES.DOCTOR) {
        doctorUserId = user._id;
        await Doctor.findOneAndUpdate(
          { userId: user._id },
          {
            userId: user._id,
            employeeId: "DOC-RAHUL-01",
            name: acc.name,
            email: acc.email,
            phone: acc.phone,
            department: "Clinical Care",
            specialization: "Cardiology & Post-Surgical Recovery",
            licenseNumber: "MD-2026-9921",
            status: "ACTIVE",
          },
          { upsert: true, new: true }
        );
      }

      if (acc.role === USER_ROLES.PATIENT) {
        patientUserId = user._id;
        await Patient.findOneAndUpdate(
          { userId: user._id },
          {
            userId: user._id,
            name: acc.name,
            email: acc.email,
            phone: acc.phone,
            dateOfBirth: "1988-06-15",
            gender: "Male",
            mrn: "MRN-884920",
            department: "General Medicine",
            assignedDoctor: doctorUserId,
            insuranceProvider: "BlueCross Premier PPO",
            insuranceStatus: "Active",
            medicalSummary: "Post-operative laparoscopic appendectomy recovery. Monitored for fever and wound integrity.",
          },
          { upsert: true, new: true }
        );
      }
    }

    // Link master patient to primary attending physician
    const masterPatient = await Patient.findOne({ email: "rahul.sharma@email.com" });
    if (masterPatient) {
      await Doctor.findOneAndUpdate(
        { email: "dr.rahul@metrohealth.eco" },
        { assignedPatients: [masterPatient._id] }
      );
    }

    console.log("✓ Demo user profiles initialized.");
    console.log("\nZero hardcoded operational tasks present. Tasks populate dynamically via incoming calls.");
    console.log("==================================================");
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = seedDatabase;
