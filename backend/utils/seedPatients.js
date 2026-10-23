/**
 * CareOps AI - Development Database Seeder
 * Populates MongoDB with default users and patient profiles for browser verification.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const User = require("../models/User");
const Patient = require("../models/Patient");
const InsuranceClaim = require("../models/InsuranceClaim");
const Department = require("../models/Department");
const { USER_ROLES } = require("../config/roles");

async function seed() {
  const uri = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/careops";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB for seeding...");

  // 1. Seed or update Users
  const usersToSeed = [
    {
      name: "Dr. Evelyn Vance",
      email: "admin@metrohealth.eco",
      password: "password123",
      role: USER_ROLES.ADMIN,
      department: "Administration",
    },
    {
      name: "Dr. Rahul",
      email: "dr.rahul@metrohealth.eco",
      password: "password123",
      role: USER_ROLES.DOCTOR,
      department: "Post-Surgical General & Acute Recovery",
    },
    {
      name: "Clara Oswald",
      email: "clara.o@metrohealth.eco",
      password: "password123",
      role: USER_ROLES.RECEPTIONIST,
      department: "Central Intake & Scheduling",
    },
    {
      name: "Marcus Sterling",
      email: "marcus.s@metrohealth.eco",
      password: "password123",
      role: USER_ROLES.INSURANCE_EMPLOYEE,
      department: "RCM & Prior-Authorization Division",
    },
    {
      name: "Dr. Eleanor Vance",
      email: "eleanor.v@metrohealth.eco",
      password: "password123",
      role: USER_ROLES.DEPARTMENT_MANAGER,
      department: "Surgical Recovery & Operations Management",
    },
    {
      name: "Rahul Sharma",
      email: "rahul.sharma@email.com",
      password: "password123",
      role: USER_ROLES.PATIENT,
      phone: "+1 (555) 349-8812",
      department: "Post-Surgical General",
    },
  ];

  const seededUsers = {};
  for (const u of usersToSeed) {
    let existing = await User.findOne({ email: u.email });
    if (!existing) {
      existing = new User(u);
      await existing.save();
      console.log(`Created user: ${u.email} (${u.role})`);
    } else {
      existing.name = u.name;
      existing.role = u.role;
      existing.department = u.department;
      existing.password = u.password;
      await existing.save();
      console.log(`Updated user: ${u.email} (${u.role})`);
    }
    seededUsers[u.role] = existing;
  }

  // 2. Seed Patient Profiles
  let rahulPatient = await Patient.findOne({ email: "rahul.sharma@email.com" });
  if (!rahulPatient) {
    rahulPatient = new Patient({
      userId: seededUsers[USER_ROLES.PATIENT]._id,
      mrn: "MRN-884920",
      name: "Rahul Sharma",
      email: "rahul.sharma@email.com",
      phone: "+1 (555) 349-8812",
      dateOfBirth: "1984-06-12",
      gender: "Male",
      address: "124 Park Ave, Suite 410, New York, NY",
      bloodGroup: "O+",
      emergencyContact: "+1 (555) 349-8819",
      medicalSummary: "Post-op wound redness & low-grade fever after laparoscopic appendectomy",
      assignedDoctorId: seededUsers[USER_ROLES.DOCTOR]._id,
      assignedDoctorName: "Dr. Rahul",
      department: "Post-Surgical General & Acute Recovery",
      insuranceProvider: "BlueCross Premier PPO (#BC-992014)",
      insuranceStatus: "Active & Verified",
      status: "ACTIVE",
    });
    await rahulPatient.save();
    console.log("Created Patient profile: Rahul Sharma (MRN-884920)");
  } else {
    console.log("Patient profile already exists: Rahul Sharma");
  }

  // Seed second patient
  let ananyaPatient = await Patient.findOne({ email: "ananya.patel@email.com" });
  if (!ananyaPatient) {
    ananyaPatient = new Patient({
      mrn: "MRN-773194",
      name: "Ananya Patel",
      email: "ananya.patel@email.com",
      phone: "+1 (555) 672-9901",
      dateOfBirth: "1990-11-23",
      gender: "Female",
      address: "450 Lexington St, Boston, MA",
      bloodGroup: "O+",
      emergencyContact: "+1 (555) 672-9909",
      medicalSummary: "Post-cholecystectomy bile reflux evaluation and diet progression",
      assignedDoctorId: seededUsers[USER_ROLES.DOCTOR]._id,
      assignedDoctorName: "Dr. Rahul",
      department: "Post-Surgical General & Acute Recovery",
      insuranceProvider: "Aetna Choice POS II",
      insuranceStatus: "Active & Verified",
      status: "ACTIVE",
    });
    await ananyaPatient.save();
    console.log("Created Patient profile: Ananya Patel (MRN-773194)");
  }

  // 3. Seed Doctor Profile for Dr. Rahul
  const Doctor = require("../models/Doctor");
  let rahulDoctor = await Doctor.findOne({ email: "dr.rahul@metrohealth.eco" });
  if (!rahulDoctor) {
    rahulDoctor = new Doctor({
      userId: seededUsers[USER_ROLES.DOCTOR]._id,
      employeeId: "DOC-1001",
      name: "Dr. Rahul",
      email: "dr.rahul@metrohealth.eco",
      phone: "+1 (555) 749-2101",
      specialization: "Post-Surgical General & Acute Recovery",
      department: "Post-Surgical General & Acute Recovery",
      qualification: "MBBS, MD (Cardiothoracic Care)",
      experience: 12,
      availability: [
        { day: "Monday", start: "09:00", end: "17:00", slots: ["10:30 AM", "11:15 AM", "02:00 PM", "04:30 PM"] },
        { day: "Wednesday", start: "09:00", end: "17:00", slots: ["10:30 AM", "02:00 PM"] },
      ],
      assignedPatients: [rahulPatient._id, ananyaPatient._id],
      status: "ACTIVE",
    });
    await rahulDoctor.save();
    console.log("Created Doctor profile: Dr. Rahul (DOC-1001)");
  } else {
    console.log("Doctor profile already exists: Dr. Rahul");
  }

  // 4. Seed Insurance Claims
  const InsuranceClaim = require("../models/InsuranceClaim");
  const existingClaimsCount = await InsuranceClaim.countDocuments();
  if (existingClaimsCount === 0) {
    const adminUser = seededUsers[USER_ROLES.ADMIN];
    await InsuranceClaim.create([
      {
        patientId: rahulPatient._id,
        insuranceProvider: "BlueCross BlueShield",
        policyNumber: "BCBS-8849-01",
        claimAmount: 3450.00,
        claimReason: "Laparoscopic appendectomy pre-authorization & surgical coverage",
        claimType: "POST_OP_COVERAGE",
        priority: "HIGH",
        status: "SUBMITTED",
        submittedBy: adminUser._id,
        aiMetadata: {
          callId: "call-live-001",
          transcriptSnippet: "I have a scheduled post-op review and need BlueCross pre-auth confirmation.",
        },
      },
      {
        patientId: rahulPatient._id,
        insuranceProvider: "BlueCross BlueShield",
        policyNumber: "BCBS-8849-01",
        claimAmount: 850.00,
        claimReason: "Post-op abdominal ultrasound imaging verification",
        claimType: "DIAGNOSTIC_IMAGING",
        priority: "MEDIUM",
        status: "UNDER_REVIEW",
        submittedBy: adminUser._id,
        reviewNotes: "Carrier audit in progress with BlueCross claims division.",
      },
      {
        patientId: ananyaPatient._id,
        insuranceProvider: "Aetna Health",
        policyNumber: "AET-7731-99",
        claimAmount: 1950.00,
        claimReason: "Cardiovascular stress telemetry & clinical clearance",
        claimType: "PRIOR_AUTHORIZATION",
        priority: "HIGH",
        status: "APPROVED",
        submittedBy: adminUser._id,
        reviewedBy: seededUsers[USER_ROLES.INSURANCE_EMPLOYEE]._id,
        reviewNotes: "Prior-authorization electronic token issued.",
      },
    ]);
    console.log("Seeded 3 operational Insurance Claims in MongoDB.");
  } else {
    console.log(`Insurance claims already present in database: ${existingClaimsCount}`);
  }

  // 4. Seed Departments
  const existingDeptCount = await Department.countDocuments({});
  if (existingDeptCount === 0) {
    const adminUser = seededUsers[USER_ROLES.ADMIN];
    const docUser = seededUsers[USER_ROLES.DOCTOR];
    const recUser = seededUsers[USER_ROLES.RECEPTIONIST];
    const insUser = seededUsers[USER_ROLES.INSURANCE_EMPLOYEE];
    const mgrUser = seededUsers[USER_ROLES.DEPARTMENT_MANAGER];

    await Department.insertMany([
      {
        name: "Doctors & Clinical Staff",
        description: "Inpatient, outpatient, tele-triage, and surgical follow-up specialists.",
        managerId: docUser?._id || null,
        status: "ACTIVE",
      },
      {
        name: "Reception & Intake",
        description: "Patient registration, front-desk coordination, and appointment scheduling.",
        managerId: recUser?._id || null,
        status: "ACTIVE",
      },
      {
        name: "Insurance & Pre-Auth",
        description: "Revenue cycle management, carrier prior authorizations, and claim adjudication.",
        managerId: insUser?._id || null,
        status: "ACTIVE",
      },
      {
        name: "Surgical Recovery & Operations Management",
        description: "Post-operative patient monitoring, wound care coordination, and bed planning.",
        managerId: mgrUser?._id || null,
        status: "ACTIVE",
      },
      {
        name: "Executive Administration",
        description: "Hospital governance, compliance, audit oversight, and workforce operations.",
        managerId: adminUser?._id || null,
        status: "ACTIVE",
      },
    ]);
    console.log("Seeded 5 Hospital Departments in MongoDB.");
  } else {
    console.log(`Departments already present in database: ${existingDeptCount}`);
  }

  await mongoose.disconnect();
  console.log("Database seeded successfully!");
}

if (require.main === module) {
  seed().catch(console.error);
}

module.exports = seed;
