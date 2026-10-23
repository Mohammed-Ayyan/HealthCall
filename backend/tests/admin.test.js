const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../app");
const User = require("../models/User");
const Patient = require("../models/Patient");
const Task = require("../models/Task");
const InsuranceClaim = require("../models/InsuranceClaim");
const Department = require("../models/Department");
const SystemRule = require("../models/SystemRule");
const { USER_ROLES } = require("../config/roles");

let mongoServer;
let adminToken, doctorToken, receptionistToken, patientToken, managerToken;
let managerUser;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Patient.deleteMany({});
  await Task.deleteMany({});
  await InsuranceClaim.deleteMany({});
  await Department.deleteMany({});
  await SystemRule.deleteMany({});

  // 1. Admin
  const adminRes = await request(app).post("/api/v1/auth/register").send({
    name: "Dr. Evelyn Vance",
    email: "admin@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.ADMIN,
    department: "Executive Administration",
  });
  adminToken = adminRes.body.token;

  // 2. Department Manager
  const mgrRes = await request(app).post("/api/v1/auth/register").send({
    name: "Dr. Eleanor Vance",
    email: "eleanor.mgr@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.DEPARTMENT_MANAGER,
    department: "Cardiology",
  });
  managerToken = mgrRes.body.token;
  managerUser = mgrRes.body.user;

  // 3. Doctor
  const docRes = await request(app).post("/api/v1/auth/register").send({
    name: "Dr. Rahul",
    email: "dr.rahul@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.DOCTOR,
    department: "Cardiology",
  });
  doctorToken = docRes.body.token;

  // 4. Receptionist
  const recRes = await request(app).post("/api/v1/auth/register").send({
    name: "Clara Oswald",
    email: "clara.rec@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.RECEPTIONIST,
    department: "Reception",
  });
  receptionistToken = recRes.body.token;

  // 5. Patient
  const patRes = await request(app).post("/api/v1/auth/register").send({
    name: "Rahul Sharma",
    email: "rahul.pat@email.com",
    password: "Password123!",
    role: USER_ROLES.PATIENT,
  });
  patientToken = patRes.body.token;

  // Seed sample patient
  const patient = await Patient.create({
    mrn: "MRN-123456",
    name: "Rahul Sharma",
    phone: "+91-9876543210",
    email: "rahul.pat@email.com",
    gender: "Male",
    dateOfBirth: "1990-05-15",
    insuranceProvider: "Star Health",
    policyNumber: "STAR-12345",
  });

  // Seed sample task
  await Task.create({
    patientId: patient._id,
    type: "FOLLOW_UP",
    priority: "HIGH",
    department: "CLINICAL",
    title: "Review post-op ECG",
    description: "Review post-operative ECG report and rhythm stability",
    status: "CREATED",
  });

  // Seed sample claim
  await InsuranceClaim.create({
    claimNumber: "CLM-TEST-001",
    patientId: patient._id,
    insuranceProvider: "Star Health",
    policyNumber: "STAR-12345",
    claimAmount: 1500,
    claimReason: "Cardiology Consultation & Diagnostic Echo",
    status: "SUBMITTED",
    submittedBy: managerUser.id,
  });
});

describe("CareOps AI — Admin Operations & Governance Module", () => {
  test("ADMIN: Create a new department and persist in MongoDB (201 Created)", async () => {
    const res = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Cardiology & Vascular Center",
        description: "Advanced cardiac care, coronary intervention, and tele-monitoring.",
        managerId: managerUser.id,
        status: "ACTIVE",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, "Cardiology & Vascular Center");
    assert.equal(res.body.data.status, "ACTIVE");
    assert.equal(res.body.data.leadName, "Dr. Eleanor Vance");

    // Verify in database
    const saved = await Department.findOne({ name: "Cardiology & Vascular Center" });
    assert.ok(saved);
  });

  test("ADMIN: Update department details and manager assignment (200 OK)", async () => {
    const dept = await Department.create({
      name: "Orthopedics Division",
      description: "Joint replacement and musculoskeletal trauma recovery.",
      status: "ACTIVE",
    });

    const res = await request(app)
      .patch(`/api/v1/departments/${dept._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        description: "Specialized joint reconstruction, sports medicine, and rehab.",
        managerId: managerUser.id,
        status: "ACTIVE",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.description, "Specialized joint reconstruction, sports medicine, and rehab.");
    assert.equal(res.body.data.leadName, "Dr. Eleanor Vance");
  });

  test("ADMIN: Hospital Overview API returns real MongoDB metrics (200 OK)", async () => {
    const res = await request(app)
      .get("/api/v1/admin/overview")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const ov = res.body.data;

    // Check prompt required fields
    assert.ok(typeof ov.totalUsers === "number");
    assert.ok(typeof ov.totalPatients === "number");
    assert.ok(typeof ov.activeDoctors === "number");
    assert.ok(typeof ov.pendingTasks === "number");
    assert.ok(typeof ov.insuranceClaims === "object");

    // Check specific real data counts
    assert.equal(ov.totalPatients, 1);
    assert.equal(ov.activeDoctors, 1);
    assert.equal(ov.pendingTasks, 1);
    assert.equal(ov.insuranceClaims.total, 1);
    assert.equal(ov.insuranceClaims.submitted, 1);
    assert.equal(ov.administratorName, "Dr. Evelyn Vance");
    assert.equal(ov.facilityName, "Metro Health Living System");
  });

  test("NON-ADMIN: Blocked from creating departments (403 Forbidden)", async () => {
    // Doctor
    const docRes = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ name: "Doctor Attempt Dept" });
    assert.equal(docRes.status, 403);

    // Receptionist
    const recRes = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${receptionistToken}`)
      .send({ name: "Reception Attempt Dept" });
    assert.equal(recRes.status, 403);

    // Patient
    const patRes = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({ name: "Patient Attempt Dept" });
    assert.equal(patRes.status, 403);
  });

  test("NON-ADMIN: Blocked from updating or deleting departments (403 Forbidden)", async () => {
    const dept = await Department.create({
      name: "Emergency Medicine",
      description: "Critical care triage",
      status: "ACTIVE",
    });

    const updateRes = await request(app)
      .patch(`/api/v1/departments/${dept._id}`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ status: "INACTIVE" });
    assert.equal(updateRes.status, 403);

    const deleteRes = await request(app)
      .delete(`/api/v1/departments/${dept._id}`)
      .set("Authorization", `Bearer ${doctorToken}`);
    assert.equal(deleteRes.status, 403);
  });

  test("NON-ADMIN: Blocked from accessing Admin Overview API (403 Forbidden)", async () => {
    const docRes = await request(app)
      .get("/api/v1/admin/overview")
      .set("Authorization", `Bearer ${doctorToken}`);
    assert.equal(docRes.status, 403);

    const patRes = await request(app)
      .get("/api/v1/admin/overview")
      .set("Authorization", `Bearer ${patientToken}`);
    assert.equal(patRes.status, 403);
  });

  test("ADMIN: Delete department (200 OK)", async () => {
    const dept = await Department.create({
      name: "Temporary Test Ward",
      description: "Temporary holding unit",
      status: "INACTIVE",
    });

    const res = await request(app)
      .delete(`/api/v1/departments/${dept._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const exists = await Department.findById(dept._id);
    assert.equal(exists, null);
  });

  test("ADMIN: View RBAC roles and permissions governance", async () => {
    const rolesRes = await request(app)
      .get("/api/v1/admin/roles")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(rolesRes.status, 200);
    assert.ok(rolesRes.body.data.length >= 5);

    const permsRes = await request(app)
      .get("/api/v1/admin/permissions")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(permsRes.status, 200);
    assert.ok(permsRes.body.data.length > 0);
  });

  test("ADMIN: Manage access & system rules", async () => {
    const rulesRes = await request(app)
      .get("/api/v1/admin/rules")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(rulesRes.status, 200);
    assert.ok(rulesRes.body.data.length >= 3);

    const firstRule = rulesRes.body.data[0];

    const patchRes = await request(app)
      .patch(`/api/v1/admin/rules/${firstRule.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ enabled: false, value: "Updated Custom Rule Value" });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.enabled, false);
    assert.equal(patchRes.body.data.value, "Updated Custom Rule Value");
  });

  test("VALIDATION: Reject department with duplicate name or missing required fields", async () => {
    const invalidRes = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    assert.equal(invalidRes.status, 400);

    await Department.create({ name: "Neurology Clinic" });
    const duplicateRes = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Neurology Clinic" });
    assert.equal(duplicateRes.status, 409);
  });

  test("SECURITY: Unauthenticated requests blocked with 401 Unauthorized", async () => {
    const res1 = await request(app).get("/api/v1/admin/overview");
    assert.equal(res1.status, 401);

    const res2 = await request(app).post("/api/v1/departments").send({ name: "No Auth Dept" });
    assert.equal(res2.status, 401);
  });
});
