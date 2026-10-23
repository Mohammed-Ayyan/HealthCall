/**
 * CareOps AI - Doctor Management Integration Test Suite
 * 
 * Verifies doctor profile creation, User link verification, role permissions,
 * patient roster assignment, queue retrieval, availability management,
 * clinical note recording, and security boundaries.
 */

const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../app");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const { USER_ROLES } = require("../config/roles");

let mongoServer;

// Auth tokens for various roles
let adminToken;
let doctorAToken;
let doctorBToken;
let receptionistToken;
let managerCardioToken;
let patientToken;
let insuranceToken;

// Sample IDs
let doctorAUserId;
let doctorBUserId;
let doctorADocId;
let doctorBDocId;
let patient1Id;
let patient2Id;

describe("CareOps AI - Doctor Management Module", () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});

    // 1. Seed Admin
    const adminRes = await request(app).post("/api/v1/auth/register").send({
      name: "Admin User",
      email: "admin@hospital.com",
      password: "password123",
      role: USER_ROLES.ADMIN,
      department: "Administration",
    });
    adminToken = adminRes.body.token;

    // 2. Seed Doctor A (Dr. Rahul - Cardiology)
    const docARes = await request(app).post("/api/v1/auth/register").send({
      name: "Dr Rahul",
      email: "dr.rahul@hospital.com",
      password: "password123",
      role: USER_ROLES.DOCTOR,
      phone: "+1 (555) 749-2101",
      department: "Cardiology",
    });
    doctorAToken = docARes.body.token;
    doctorAUserId = docARes.body.user.id;

    const doctorADoc = await Doctor.create({
      userId: doctorAUserId,
      employeeId: "DOC-1001",
      name: "Dr Rahul",
      email: "dr.rahul@hospital.com",
      phone: "+1 (555) 749-2101",
      specialization: "Cardiology",
      department: "Cardiology",
      qualification: "MBBS, MD (Cardiology)",
      experience: 12,
      availability: [
        { day: "Monday", start: "09:00", end: "17:00", slots: ["10:30 AM", "02:00 PM"] },
      ],
      assignedPatients: [],
      status: "ACTIVE",
    });
    doctorADocId = doctorADoc._id.toString();

    // 3. Seed Doctor B (Dr. Miriam Vance - Endocrinology)
    const docBRes = await request(app).post("/api/v1/auth/register").send({
      name: "Dr Miriam Vance",
      email: "vance.doctor@hospital.com",
      password: "password123",
      role: USER_ROLES.DOCTOR,
      phone: "+1 (555) 892-1200",
      department: "Endocrinology",
    });
    doctorBToken = docBRes.body.token;
    doctorBUserId = docBRes.body.user.id;

    const doctorBDoc = await Doctor.create({
      userId: doctorBUserId,
      employeeId: "DOC-1002",
      name: "Dr Miriam Vance",
      email: "vance.doctor@hospital.com",
      phone: "+1 (555) 892-1200",
      specialization: "Endocrinology",
      department: "Endocrinology",
      qualification: "MD, Endocrinology",
      experience: 9,
      availability: [
        { day: "Tuesday", start: "10:00", end: "16:00", slots: ["11:00 AM", "03:00 PM"] },
      ],
      assignedPatients: [],
      status: "ACTIVE",
    });
    doctorBDocId = doctorBDoc._id.toString();

    // 4. Seed Receptionist
    const recRes = await request(app).post("/api/v1/auth/register").send({
      name: "Clara Oswald",
      email: "clara.reception@hospital.com",
      password: "password123",
      role: USER_ROLES.RECEPTIONIST,
      department: "Central Intake",
    });
    receptionistToken = recRes.body.token;

    // 5. Seed Department Manager (Cardiology)
    const mgrRes = await request(app).post("/api/v1/auth/register").send({
      name: "Cardio Manager",
      email: "cardio.manager@hospital.com",
      password: "password123",
      role: USER_ROLES.DEPARTMENT_MANAGER,
      department: "Cardiology",
    });
    managerCardioToken = mgrRes.body.token;

    // 6. Seed Patient 1
    const pat1 = await Patient.create({
      name: "Rahul Sharma",
      email: "rahul.patient@test.com",
      phone: "9876543210",
      dateOfBirth: "1984-06-12",
      gender: "Male",
      bloodGroup: "O+",
      medicalSummary: "Post-op wound redness",
      department: "Cardiology",
      mrn: "MRN-884920",
      status: "ACTIVE",
    });
    patient1Id = pat1._id.toString();

    // 7. Seed Patient 2
    const pat2 = await Patient.create({
      name: "Elena Morales",
      email: "elena.patient@test.com",
      phone: "9876543222",
      dateOfBirth: "1992-09-18",
      gender: "Female",
      bloodGroup: "A+",
      medicalSummary: "Type 1 diabetes insulin review",
      department: "Endocrinology",
      mrn: "MRN-672194",
      status: "ACTIVE",
    });
    patient2Id = pat2._id.toString();

    // Seed Patient User Token
    const patRes = await request(app).post("/api/v1/auth/register").send({
      name: "Rahul Sharma",
      email: "rahul.patient@test.com",
      password: "password123",
      role: USER_ROLES.PATIENT,
      phone: "9876543210",
    });
    patientToken = patRes.body.token;

    // 8. Seed Insurance Employee
    const insRes = await request(app).post("/api/v1/auth/register").send({
      name: "David Claims",
      email: "david.claims@hospital.com",
      password: "password123",
      role: USER_ROLES.INSURANCE_EMPLOYEE,
      department: "Insurance",
    });
    insuranceToken = insRes.body.token;
  });

  // ==========================================
  // 1. ADMIN PERMISSIONS
  // ==========================================

  test("Admin: Create doctor profile linking existing DOCTOR User account", async () => {
    // First register a new Doctor User
    const newDocUserRes = await request(app).post("/api/v1/auth/register").send({
      name: "Dr Aris Thorne",
      email: "aris.thorne@hospital.com",
      password: "password123",
      role: USER_ROLES.DOCTOR,
      department: "General Surgery",
    });

    const newDocUserId = newDocUserRes.body.user.id;

    // Admin creates Doctor profile
    const res = await request(app)
      .post("/api/v1/doctors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userId: newDocUserId,
        specialization: "General & Bariatric Surgery",
        department: "General Surgery",
        qualification: "MD, FACS",
        experience: 15,
        employeeId: "DOC-1003",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.doctor.name, "Dr Aris Thorne");
    assert.equal(res.body.doctor.specialization, "General & Bariatric Surgery");
    assert.equal(res.body.doctor.employeeId, "DOC-1003");
    assert.equal(res.body.doctor.userId, newDocUserId);
  });

  test("Admin: Reject doctor creation if User role is not DOCTOR (400)", async () => {
    // Attempting to create doctor profile for a Receptionist user
    const recUser = await User.findOne({ email: "clara.reception@hospital.com" });

    const res = await request(app)
      .post("/api/v1/doctors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userId: recUser._id.toString(),
        specialization: "Neurology",
        department: "Neurology",
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test("Admin: Reject duplicate doctor profile for same user (409 Conflict)", async () => {
    const res = await request(app)
      .post("/api/v1/doctors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userId: doctorAUserId, // Already exists as Doctor A
        specialization: "Cardiology",
        department: "Cardiology",
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  test("Admin: View all doctors and apply search & department filters", async () => {
    // 1. View all
    const allRes = await request(app)
      .get("/api/v1/doctors")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(allRes.status, 200);
    assert.equal(allRes.body.success, true);
    assert.equal(allRes.body.doctors.length, 2);

    // 2. Filter by department
    const deptRes = await request(app)
      .get("/api/v1/doctors?department=Cardiology")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(deptRes.status, 200);
    assert.equal(deptRes.body.doctors.length, 1);
    assert.equal(deptRes.body.doctors[0].name, "Dr Rahul");

    // 3. Search query
    const searchRes = await request(app)
      .get("/api/v1/doctors?search=Vance")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(searchRes.status, 200);
    assert.equal(searchRes.body.doctors.length, 1);
    assert.equal(searchRes.body.doctors[0].name, "Dr Miriam Vance");
  });

  test("Admin: Update doctor profile (qualification, department, specialization)", async () => {
    const res = await request(app)
      .patch(`/api/v1/doctors/${doctorADocId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        qualification: "MBBS, MD, FACC, FSCAI",
        experience: 14,
        specialization: "Interventional Cardiology",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.doctor.qualification, "MBBS, MD, FACC, FSCAI");
    assert.equal(res.body.doctor.experience, 14);
    assert.equal(res.body.doctor.specialization, "Interventional Cardiology");
  });

  test("Admin: Assign patient to doctor care roster", async () => {
    const res = await request(app)
      .patch(`/api/v1/doctors/${doctorADocId}/patients`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        patientId: patient1Id,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.doctor.assignedPatients.includes(patient1Id));

    // Verify Patient document was updated with assigned doctor
    const updatedPat = await Patient.findById(patient1Id);
    assert.equal(updatedPat.assignedDoctorName, "Dr Rahul");
  });

  // ==========================================
  // 2. DOCTOR PERMISSIONS
  // ==========================================

  test("Doctor: View own profile via /api/v1/doctors/me", async () => {
    const res = await request(app)
      .get("/api/v1/doctors/me")
      .set("Authorization", `Bearer ${doctorAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.doctor.name, "Dr Rahul");
    assert.equal(res.body.doctor.specialization, "Cardiology");
  });

  test("Doctor: Update own availability schedule", async () => {
    const newSchedule = [
      { day: "Monday", start: "08:30", end: "16:30", slots: ["09:00 AM", "11:00 AM", "02:30 PM"] },
      { day: "Thursday", start: "09:00", end: "14:00", slots: ["10:00 AM", "01:00 PM"] },
    ];

    const res = await request(app)
      .patch(`/api/v1/doctors/${doctorADocId}/availability`)
      .set("Authorization", `Bearer ${doctorAToken}`)
      .send({
        availability: newSchedule,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.availability.length, 2);
    assert.equal(res.body.availability[0].day, "Monday");
  });

  test("Doctor: View assigned patients queue", async () => {
    // First assign Patient 1 to Doctor A
    await Doctor.findByIdAndUpdate(doctorADocId, {
      $push: { assignedPatients: patient1Id },
    });
    await Patient.findByIdAndUpdate(patient1Id, {
      assignedDoctorId: doctorAUserId,
      assignedDoctorName: "Dr Rahul",
    });

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorADocId}/patients`)
      .set("Authorization", `Bearer ${doctorAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.patients.length, 1);
    assert.equal(res.body.patients[0].name, "Rahul Sharma");
  });

  test("Doctor: Add clinical note to patient record", async () => {
    const res = await request(app)
      .post(`/api/v1/doctors/${doctorADocId}/notes`)
      .set("Authorization", `Bearer ${doctorAToken}`)
      .send({
        patientId: patient1Id,
        note: "Incision erythema subsided. Discontinue Amoxicillin and begin routine dressing changes.",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.note.includes("Incision erythema subsided"));

    // Verify patient medicalSummary in DB was updated
    const updatedPat = await Patient.findById(patient1Id);
    assert.ok(updatedPat.medicalSummary.includes("Incision erythema subsided"));
  });

  test("Doctor: Blocked from viewing another doctor's patient queue (403)", async () => {
    // Doctor A attempting to view Doctor B's queue
    const res = await request(app)
      .get(`/api/v1/doctors/${doctorBDocId}/patients`)
      .set("Authorization", `Bearer ${doctorAToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  test("Doctor: Blocked from modifying another doctor's profile or availability (403)", async () => {
    // Doctor A attempting to update Doctor B's profile
    const profileRes = await request(app)
      .patch(`/api/v1/doctors/${doctorBDocId}`)
      .set("Authorization", `Bearer ${doctorAToken}`)
      .send({
        qualification: "Compromised Credentials",
      });

    assert.equal(profileRes.status, 403);

    // Doctor A attempting to update Doctor B's availability
    const availRes = await request(app)
      .patch(`/api/v1/doctors/${doctorBDocId}/availability`)
      .set("Authorization", `Bearer ${doctorAToken}`)
      .send({
        availability: [],
      });

    assert.equal(availRes.status, 403);
  });

  test("Doctor: Blocked from creating doctor profiles (403)", async () => {
    const res = await request(app)
      .post("/api/v1/doctors")
      .set("Authorization", `Bearer ${doctorAToken}`)
      .send({
        userId: doctorAUserId,
        specialization: "Cardiology",
        department: "Cardiology",
      });

    assert.equal(res.status, 403);
  });

  // ==========================================
  // 3. RECEPTIONIST PERMISSIONS
  // ==========================================

  test("Receptionist: View doctors list and availability schedules", async () => {
    const res = await request(app)
      .get("/api/v1/doctors")
      .set("Authorization", `Bearer ${receptionistToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.doctors.length, 2);
    assert.ok(res.body.doctors[0].availability);
  });

  test("Receptionist: Blocked from creating or updating doctors (403)", async () => {
    const createRes = await request(app)
      .post("/api/v1/doctors")
      .set("Authorization", `Bearer ${receptionistToken}`)
      .send({
        userId: doctorAUserId,
        specialization: "Cardiology",
        department: "Cardiology",
      });
    assert.equal(createRes.status, 403);

    const updateRes = await request(app)
      .patch(`/api/v1/doctors/${doctorADocId}`)
      .set("Authorization", `Bearer ${receptionistToken}`)
      .send({
        phone: "1234567890",
      });
    assert.equal(updateRes.status, 403);
  });

  // ==========================================
  // 4. DEPARTMENT MANAGER PERMISSIONS
  // ==========================================

  test("Department Manager: Can view doctors in own department only", async () => {
    // Cardiology Manager
    const res = await request(app)
      .get("/api/v1/doctors")
      .set("Authorization", `Bearer ${managerCardioToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.doctors.length, 1);
    assert.equal(res.body.doctors[0].name, "Dr Rahul");
  });

  test("Department Manager: Blocked from viewing single doctor outside department (403)", async () => {
    // Cardiology Manager accessing Doctor B (Endocrinology)
    const res = await request(app)
      .get(`/api/v1/doctors/${doctorBDocId}`)
      .set("Authorization", `Bearer ${managerCardioToken}`);

    assert.equal(res.status, 403);
  });

  // ==========================================
  // 5. PATIENT PERMISSIONS
  // ==========================================

  test("Patient: Can view doctor directory information", async () => {
    const res = await request(app)
      .get(`/api/v1/doctors/${doctorADocId}`)
      .set("Authorization", `Bearer ${patientToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.doctor.name, "Dr Rahul");
    assert.equal(res.body.doctor.specialization, "Cardiology");
  });

  // ==========================================
  // 6. INSURANCE EMPLOYEE RESTRICTION
  // ==========================================

  test("Insurance Employee: Blocked from accessing doctor management (403)", async () => {
    const res = await request(app)
      .get("/api/v1/doctors")
      .set("Authorization", `Bearer ${insuranceToken}`);

    assert.equal(res.status, 403);
  });

  // ==========================================
  // 7. SECURITY & AUTHENTICATION
  // ==========================================

  test("Security: Request without token blocked (401 Unauthorized)", async () => {
    const res = await request(app).get("/api/v1/doctors");
    assert.equal(res.status, 401);
  });
});
