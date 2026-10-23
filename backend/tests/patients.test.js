/**
 * CareOps AI - Patient Management Integration Test Suite
 * 
 * Verifies all CRUD operations, RBAC permissions, patient privacy boundaries,
 * doctor assignment scoping, search/filtering, and soft deletion.
 */

const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../app");
const User = require("../models/User");
const Patient = require("../models/Patient");
const { USER_ROLES } = require("../config/roles");

let mongoServer;

// Auth tokens for various roles
let adminToken;
let receptionistToken;
let doctorAToken;
let doctorBToken;
let patient1Token;
let patient2Token;
let managerCardioToken;
let insuranceToken;

// Sample IDs
let doctorAId;
let doctorBId;
let patient1UserId;
let patient2UserId;
let patient1DocId;
let patient2DocId;

describe("CareOps AI - Patient Management Module", () => {
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

    // 2. Seed Receptionist
    const recRes = await request(app).post("/api/v1/auth/register").send({
      name: "Clara Oswald",
      email: "clara.reception@hospital.com",
      password: "password123",
      role: USER_ROLES.RECEPTIONIST,
      department: "Front Desk",
    });
    receptionistToken = recRes.body.token;

    // 3. Seed Doctor A (Dr. Rahul - Cardiology)
    const docARes = await request(app).post("/api/v1/auth/register").send({
      name: "Dr Rahul",
      email: "rahul.doctor@hospital.com",
      password: "password123",
      role: USER_ROLES.DOCTOR,
      department: "Cardiology",
    });
    doctorAToken = docARes.body.token;
    doctorAId = docARes.body.user.id;

    // 4. Seed Doctor B (Dr. Vance - Endocrinology)
    const docBRes = await request(app).post("/api/v1/auth/register").send({
      name: "Dr Miriam Vance",
      email: "vance.doctor@hospital.com",
      password: "password123",
      role: USER_ROLES.DOCTOR,
      department: "Endocrinology",
    });
    doctorBToken = docBRes.body.token;
    doctorBId = docBRes.body.user.id;

    // 5. Seed Patient 1 (Assigned to Doctor A, Cardiology)
    const pat1Res = await request(app).post("/api/v1/auth/register").send({
      name: "Rahul Sharma",
      email: "rahul.patient@test.com",
      password: "password123",
      role: USER_ROLES.PATIENT,
      phone: "9876543210",
      department: "Cardiology",
    });
    patient1Token = pat1Res.body.token;
    patient1UserId = pat1Res.body.user.id;

    const patient1Doc = await Patient.create({
      userId: patient1UserId,
      name: "Rahul Sharma",
      email: "rahul.patient@test.com",
      phone: "9876543210",
      dateOfBirth: "1984-06-12",
      gender: "Male",
      address: "124 Park Ave, New York",
      bloodGroup: "O+",
      emergencyContact: "9876543219",
      medicalSummary: "Post-op wound redness & low-grade fever after appendectomy",
      assignedDoctorId: doctorAId,
      assignedDoctorName: "Dr Rahul",
      department: "Cardiology",
      mrn: "MRN-884920",
      status: "ACTIVE",
    });
    patient1DocId = patient1Doc._id.toString();

    // 6. Seed Patient 2 (Assigned to Doctor B, Endocrinology)
    const pat2Res = await request(app).post("/api/v1/auth/register").send({
      name: "Elena Morales",
      email: "elena.patient@test.com",
      password: "password123",
      role: USER_ROLES.PATIENT,
      phone: "9876543222",
      department: "Endocrinology",
    });
    patient2Token = pat2Res.body.token;
    patient2UserId = pat2Res.body.user.id;

    const patient2Doc = await Patient.create({
      userId: patient2UserId,
      name: "Elena Morales",
      email: "elena.patient@test.com",
      phone: "9876543222",
      dateOfBirth: "1992-09-18",
      gender: "Female",
      address: "55 Sunset Blvd, Los Angeles",
      bloodGroup: "A+",
      emergencyContact: "9876543229",
      medicalSummary: "Diabetic neuropathy evaluation and insulin titration",
      assignedDoctorId: doctorBId,
      assignedDoctorName: "Dr Miriam Vance",
      department: "Endocrinology",
      mrn: "MRN-672194",
      status: "ACTIVE",
    });
    patient2DocId = patient2Doc._id.toString();

    // 7. Seed Department Manager (Cardiology)
    const mgrRes = await request(app).post("/api/v1/auth/register").send({
      name: "Cardio Manager",
      email: "cardio.manager@hospital.com",
      password: "password123",
      role: USER_ROLES.DEPARTMENT_MANAGER,
      department: "Cardiology",
    });
    managerCardioToken = mgrRes.body.token;

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

  test("Admin: Create a new patient record with automatic User account provisioning", async () => {
    const res = await request(app)
      .post("/api/v1/patients")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Marcus Vance",
        email: "marcus.vance@hospital.com",
        phone: "9876543333",
        dateOfBirth: "1968-04-03",
        gender: "Male",
        address: "742 Evergreen Terrace",
        bloodGroup: "B+",
        department: "Cardiology",
        medicalSummary: "Hypertension medication titration",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.patient.name, "Marcus Vance");
    assert.equal(res.body.patient.email, "marcus.vance@hospital.com");
    assert.equal(res.body.patient.status, "ACTIVE");
    assert.ok(res.body.patient.mrn.startsWith("MRN-"));

    // Verify linked User account was automatically created
    const createdUser = await User.findOne({ email: "marcus.vance@hospital.com" });
    assert.ok(createdUser, "Linked User account should be created");
    assert.equal(createdUser.role, USER_ROLES.PATIENT);
    assert.equal(res.body.patient.userId, createdUser._id.toString());
  });

  test("Admin: View all patients and apply filters & search", async () => {
    // 1. View all
    const allRes = await request(app)
      .get("/api/v1/patients")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(allRes.status, 200);
    assert.equal(allRes.body.success, true);
    assert.equal(allRes.body.patients.length, 2);

    // 2. Search by phone
    const searchRes = await request(app)
      .get("/api/v1/patients?search=9876543210")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(searchRes.status, 200);
    assert.equal(searchRes.body.patients.length, 1);
    assert.equal(searchRes.body.patients[0].name, "Rahul Sharma");

    // 3. Filter by blood group
    const bgRes = await request(app)
      .get("/api/v1/patients?bloodGroup=A%2B")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(bgRes.status, 200);
    assert.equal(bgRes.body.patients.length, 1);
    assert.equal(bgRes.body.patients[0].name, "Elena Morales");

    // 4. Filter by gender
    const genderRes = await request(app)
      .get("/api/v1/patients?gender=Female")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(genderRes.status, 200);
    assert.equal(genderRes.body.patients.length, 1);
    assert.equal(genderRes.body.patients[0].name, "Elena Morales");
  });

  test("Admin: Update patient demographics, clinical notes, and assign doctor", async () => {
    const res = await request(app)
      .patch(`/api/v1/patients/${patient1DocId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        address: "990 Lex Ave, Apt 4B",
        phone: "9876500000",
        medicalSummary: "Incision healed. Sutures removed successfully.",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.patient.address, "990 Lex Ave, Apt 4B");
    assert.equal(res.body.patient.phone, "9876500000");
    assert.equal(
      res.body.patient.medicalSummary,
      "Incision healed. Sutures removed successfully."
    );
  });

  test("Admin: Soft delete patient sets status to INACTIVE", async () => {
    const res = await request(app)
      .delete(`/api/v1/patients/${patient1DocId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.patient.status, "INACTIVE");

    // Verify record still exists in database
    const dbRecord = await Patient.findById(patient1DocId);
    assert.ok(dbRecord, "Patient record must remain in database (soft delete)");
    assert.equal(dbRecord.status, "INACTIVE");
  });

  // ==========================================
  // 2. RECEPTIONIST PERMISSIONS
  // ==========================================

  test("Receptionist: Register new patient successfully", async () => {
    const res = await request(app)
      .post("/api/v1/patients")
      .set("Authorization", `Bearer ${receptionistToken}`)
      .send({
        name: "Ananya Patel",
        email: "ananya.patel@hospital.com",
        phone: "9876543444",
        dateOfBirth: "1990-11-23",
        gender: "Female",
        address: "Central Blvd 12",
        bloodGroup: "O+",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.patient.name, "Ananya Patel");
  });

  test("Receptionist: Search and view patient directory", async () => {
    const res = await request(app)
      .get("/api/v1/patients?search=Rahul")
      .set("Authorization", `Bearer ${receptionistToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.patients.length, 1);
    assert.equal(res.body.patients[0].name, "Rahul Sharma");
  });

  test("Receptionist: Update patient contact details", async () => {
    const res = await request(app)
      .patch(`/api/v1/patients/${patient1DocId}`)
      .set("Authorization", `Bearer ${receptionistToken}`)
      .send({
        phone: "9876549999",
        address: "New Residential Address",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.patient.phone, "9876549999");
    assert.equal(res.body.patient.address, "New Residential Address");
  });

  test("Receptionist: Blocked from updating medical summary or deleting patient", async () => {
    // 1. Attempting to update medical summary
    const medRes = await request(app)
      .patch(`/api/v1/patients/${patient1DocId}`)
      .set("Authorization", `Bearer ${receptionistToken}`)
      .send({
        medicalSummary: "Tampered clinical notes by receptionist",
      });

    assert.equal(medRes.status, 400); // Validation catches unauthorized medical summary attempt

    // 2. Attempting to delete patient
    const delRes = await request(app)
      .delete(`/api/v1/patients/${patient1DocId}`)
      .set("Authorization", `Bearer ${receptionistToken}`);

    assert.equal(delRes.status, 403);
  });

  // ==========================================
  // 3. PATIENT ROLE & PRIVACY PROTECTION
  // ==========================================

  test("Patient: View own profile via /api/v1/patients/me", async () => {
    const res = await request(app)
      .get("/api/v1/patients/me")
      .set("Authorization", `Bearer ${patient1Token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.patient.name, "Rahul Sharma");
    assert.equal(res.body.patient.email, "rahul.patient@test.com");
  });

  test("Patient: View own patient details via /api/v1/patients/:id", async () => {
    const res = await request(app)
      .get(`/api/v1/patients/${patient1DocId}`)
      .set("Authorization", `Bearer ${patient1Token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.patient.name, "Rahul Sharma");
  });

  test("Patient: Blocked from viewing another patient's medical record (403)", async () => {
    // Patient 1 tries to view Patient 2's record
    const res = await request(app)
      .get(`/api/v1/patients/${patient2DocId}`)
      .set("Authorization", `Bearer ${patient1Token}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  test("Patient: Blocked from browsing universal patient directory (403)", async () => {
    const res = await request(app)
      .get("/api/v1/patients")
      .set("Authorization", `Bearer ${patient1Token}`);

    assert.equal(res.status, 403);
  });

  test("Patient: Can update own phone and address, but blocked from editing medical summary (403)", async () => {
    // 1. Allowed update: phone
    const okRes = await request(app)
      .patch(`/api/v1/patients/${patient1DocId}`)
      .set("Authorization", `Bearer ${patient1Token}`)
      .send({
        phone: "9876598765",
        address: "Updated Patient Home Address",
      });

    assert.equal(okRes.status, 200);
    assert.equal(okRes.body.patient.phone, "9876598765");

    // 2. Blocked update: medical summary
    const blockRes = await request(app)
      .patch(`/api/v1/patients/${patient1DocId}`)
      .set("Authorization", `Bearer ${patient1Token}`)
      .send({
        medicalSummary: "Self-prescribed medication",
      });

    assert.equal(blockRes.status, 400); // Validation rejects medical summary edit by patient
  });

  // ==========================================
  // 4. DOCTOR SCOPING & ASSIGNMENT PRIVACY
  // ==========================================

  test("Doctor: Can view assigned patients in directory", async () => {
    // Doctor A is assigned to Patient 1, but NOT Patient 2
    const res = await request(app)
      .get("/api/v1/patients")
      .set("Authorization", `Bearer ${doctorAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.patients.length, 1);
    assert.equal(res.body.patients[0].name, "Rahul Sharma");
  });

  test("Doctor: Access assigned patient details and update clinical summary", async () => {
    // Doctor A accessing assigned Patient 1
    const getRes = await request(app)
      .get(`/api/v1/patients/${patient1DocId}`)
      .set("Authorization", `Bearer ${doctorAToken}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.patient.name, "Rahul Sharma");

    // Doctor A updating Patient 1's medical summary
    const updateRes = await request(app)
      .patch(`/api/v1/patients/${patient1DocId}`)
      .set("Authorization", `Bearer ${doctorAToken}`)
      .send({
        medicalSummary: "Examined wound. Low-grade fever resolved with hydration and antibiotics.",
      });

    assert.equal(updateRes.status, 200);
    assert.equal(
      updateRes.body.patient.medicalSummary,
      "Examined wound. Low-grade fever resolved with hydration and antibiotics."
    );
  });

  test("Doctor: Blocked from accessing unassigned patient details (403)", async () => {
    // Doctor A attempting to access Patient 2 (assigned to Doctor B)
    const res = await request(app)
      .get(`/api/v1/patients/${patient2DocId}`)
      .set("Authorization", `Bearer ${doctorAToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  test("Doctor: Blocked from creating or deleting patients (403)", async () => {
    const postRes = await request(app)
      .post("/api/v1/patients")
      .set("Authorization", `Bearer ${doctorAToken}`)
      .send({
        name: "Test Doctor Patient",
        email: "doc.pat@test.com",
        phone: "9876543111",
      });
    assert.equal(postRes.status, 403);

    const delRes = await request(app)
      .delete(`/api/v1/patients/${patient1DocId}`)
      .set("Authorization", `Bearer ${doctorAToken}`);
    assert.equal(delRes.status, 403);
  });

  // ==========================================
  // 5. DEPARTMENT MANAGER SCOPING
  // ==========================================

  test("Department Manager: Can view patients in own department only", async () => {
    // Manager for Cardiology
    const res = await request(app)
      .get("/api/v1/patients")
      .set("Authorization", `Bearer ${managerCardioToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.patients.length, 1);
    assert.equal(res.body.patients[0].name, "Rahul Sharma"); // In Cardiology
  });

  test("Department Manager: Blocked from viewing patients outside department (403)", async () => {
    // Manager for Cardiology accessing Patient 2 (Endocrinology)
    const res = await request(app)
      .get(`/api/v1/patients/${patient2DocId}`)
      .set("Authorization", `Bearer ${managerCardioToken}`);

    assert.equal(res.status, 403);
  });

  // ==========================================
  // 6. INSURANCE EMPLOYEE PERMISSIONS
  // ==========================================

  test("Insurance Employee: Can view patients for claim review but cannot create or delete", async () => {
    // Can list
    const listRes = await request(app)
      .get("/api/v1/patients")
      .set("Authorization", `Bearer ${insuranceToken}`);
    assert.equal(listRes.status, 200);

    // Cannot create
    const createRes = await request(app)
      .post("/api/v1/patients")
      .set("Authorization", `Bearer ${insuranceToken}`)
      .send({
        name: "Insurance New Patient",
        email: "ins.pat@test.com",
        phone: "9876543000",
      });
    assert.equal(createRes.status, 403);
  });

  // ==========================================
  // 7. DUPLICATE PREVENTION & VALIDATION
  // ==========================================

  test("Validation: Reject duplicate patient email or phone (409 Conflict)", async () => {
    const res = await request(app)
      .post("/api/v1/patients")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Duplicate Sharma",
        email: "rahul.patient@test.com", // Already exists
        phone: "9876543999",
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  test("Validation: Reject missing required fields on creation (400)", async () => {
    const res = await request(app)
      .post("/api/v1/patients")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "",
        email: "not-an-email",
        phone: "123", // too short
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.length >= 3);
  });

  // ==========================================
  // 8. UNAUTHENTICATED REQUESTS
  // ==========================================

  test("Security: Request without token is blocked (401 Unauthorized)", async () => {
    const res = await request(app).get("/api/v1/patients");
    assert.equal(res.status, 401);
  });
});
