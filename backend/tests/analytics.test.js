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
const { USER_ROLES } = require("../config/roles");

let mongoServer;
let adminToken, managerToken, doctorToken, receptionistToken, patientToken;
let patientDoc;

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
    department: "Surgical Recovery",
  });
  managerToken = mgrRes.body.token;

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

  // 5. Patient User
  const patRes = await request(app).post("/api/v1/auth/register").send({
    name: "Rahul Sharma",
    email: "rahul.pat@email.com",
    password: "Password123!",
    role: USER_ROLES.PATIENT,
  });
  patientToken = patRes.body.token;

  // Seed sample patients
  patientDoc = await Patient.create({
    mrn: "MRN-1001",
    name: "Rahul Sharma",
    phone: "+91-9876543210",
    email: "rahul.pat@email.com",
    gender: "Male",
    department: "Cardiology",
    dateOfBirth: "1990-05-15",
  });

  await Patient.create({
    mrn: "MRN-1002",
    name: "Ananya Patel",
    phone: "+91-9876543211",
    email: "ananya.pat@email.com",
    gender: "Female",
    department: "Surgical Recovery",
    dateOfBirth: "1988-08-20",
  });

  // Seed sample tasks: 2 pending, 1 completed
  await Task.create({
    patientId: patientDoc._id,
    type: "FOLLOW_UP",
    priority: "HIGH",
    department: "CLINICAL",
    title: "Post-op Wound Inspection",
    description: "Inspect surgical incision healing and suture stability",
    status: "CREATED",
  });

  await Task.create({
    patientId: patientDoc._id,
    type: "PRESCRIPTION_REFILL",
    priority: "MEDIUM",
    department: "RECEPTION",
    title: "Medication Refill Authorization",
    description: "Coordinate cardiology refill with local pharmacy",
    status: "IN_PROGRESS",
  });

  await Task.create({
    patientId: patientDoc._id,
    type: "DOCUMENT_REQUEST",
    priority: "LOW",
    department: "INSURANCE",
    title: "Carrier Prior-Auth Upload",
    description: "Transmit diagnostic imaging reports to carrier",
    status: "COMPLETED",
  });

  // Seed sample claims: 1 pending, 1 approved
  await InsuranceClaim.create({
    claimNumber: "CLM-ANALYTICS-01",
    patientId: patientDoc._id,
    insuranceProvider: "Star Health",
    policyNumber: "STAR-9921",
    claimAmount: 1450,
    claimReason: "Cardiology consultation",
    status: "SUBMITTED",
    submittedBy: adminRes.body.user.id,
  });

  await InsuranceClaim.create({
    claimNumber: "CLM-ANALYTICS-02",
    patientId: patientDoc._id,
    insuranceProvider: "BlueCross",
    policyNumber: "BCBS-4411",
    claimAmount: 3200,
    claimReason: "Surgical recovery",
    status: "APPROVED",
    submittedBy: adminRes.body.user.id,
  });
});

describe("CareOps AI — Healthcare Operations Analytics Module", () => {
  test("Overview API: Returns accurate aggregated operational metrics matching database", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    // Calculations check
    assert.equal(data.totalPatients, 2);
    assert.equal(data.totalUsers, 5); // 5 registered users
    assert.equal(data.activeDoctors, 1); // 1 doctor
    assert.equal(data.pendingTasks, 2); // 2 created/in_progress tasks
    assert.equal(data.completedTasks, 1); // 1 completed task
    assert.equal(data.claimsPending, 1); // 1 submitted claim
  });

  test("Task Analytics: Correct completion rate, pending tasks, and department workload", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/tasks")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    assert.equal(data.totalTasks, 3);
    assert.equal(data.pendingTasks, 2);
    assert.equal(data.completedTasks, 1);

    // Completion rate = 1 / 3 * 100 = 33.3%
    assert.equal(data.completionRate, 33.3);

    // Department workload array exists and captures task divisions
    assert.ok(Array.isArray(data.departmentWorkload));
    const clinicalDept = data.departmentWorkload.find((d) => d.department === "CLINICAL");
    assert.ok(clinicalDept);
    assert.equal(clinicalDept.totalTasks, 1);
    assert.equal(clinicalDept.pendingTasks, 1);
  });

  test("Patient Analytics: Correct patient count and department distribution", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/patients")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    assert.equal(data.patientCount, 2);
    assert.ok(Array.isArray(data.departmentDistribution));
    assert.equal(data.departmentDistribution.length, 2);

    // 1 in Cardiology (50%), 1 in Surgical Recovery (50%)
    const cardio = data.departmentDistribution.find((d) => d.department === "Cardiology");
    assert.ok(cardio);
    assert.equal(cardio.count, 1);
    assert.equal(cardio.percentage, 50);
  });

  test("User Analytics: Correct users by role and active/inactive counts", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/users")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    assert.equal(data.totalUsers, 5);
    assert.equal(data.activeUsers, 5);
    assert.equal(data.inactiveUsers, 0);

    assert.equal(data.usersByRole[USER_ROLES.ADMIN], 1);
    assert.equal(data.usersByRole[USER_ROLES.DEPARTMENT_MANAGER], 1);
    assert.equal(data.usersByRole[USER_ROLES.DOCTOR], 1);
    assert.equal(data.usersByRole[USER_ROLES.RECEPTIONIST], 1);
    assert.equal(data.usersByRole[USER_ROLES.PATIENT], 1);
  });

  test("Dynamic Updates: Creating new patient immediately updates patient analytics", async () => {
    // Initial count: 2
    let res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(res.body.data.totalPatients, 2);

    // Create 3rd patient
    await Patient.create({
      mrn: "MRN-1003",
      name: "Vikram Malhotra",
      phone: "+91-9876543212",
      email: "vikram@email.com",
      gender: "Male",
      department: "Cardiology",
      dateOfBirth: "1975-11-12",
    });

    // Re-check overview: should be 3
    res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(res.body.data.totalPatients, 3);
  });

  test("Dynamic Updates: Creating and completing tasks immediately updates task analytics", async () => {
    // Initial tasks: 2 pending, 1 completed, 3 total
    let res = await request(app)
      .get("/api/v1/analytics/tasks")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(res.body.data.pendingTasks, 2);
    assert.equal(res.body.data.completedTasks, 1);
    assert.equal(res.body.data.completionRate, 33.3);

    // Create new completed task
    await Task.create({
      patientId: patientDoc._id,
      type: "CLINICAL_REVIEW",
      priority: "HIGH",
      department: "CLINICAL",
      title: "Diagnostic Lab Analysis",
      description: "Verify cardiac biomarker levels post-procedure",
      status: "COMPLETED",
    });

    // Re-check: 2 pending, 2 completed, 4 total -> 50%
    res = await request(app)
      .get("/api/v1/analytics/tasks")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(res.body.data.pendingTasks, 2);
    assert.equal(res.body.data.completedTasks, 2);
    assert.equal(res.body.data.completionRate, 50);
  });

  test("DEPARTMENT_MANAGER: Permitted to access operational analytics", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Authorization", `Bearer ${managerToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test("SECURITY: Unauthorized roles blocked from analytics (403 Forbidden)", async () => {
    // Doctor
    const docRes = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Authorization", `Bearer ${doctorToken}`);
    assert.equal(docRes.status, 403);

    // Receptionist
    const recRes = await request(app)
      .get("/api/v1/analytics/tasks")
      .set("Authorization", `Bearer ${receptionistToken}`);
    assert.equal(recRes.status, 403);

    // Patient
    const patRes = await request(app)
      .get("/api/v1/analytics/patients")
      .set("Authorization", `Bearer ${patientToken}`);
    assert.equal(patRes.status, 403);
  });

  test("SECURITY: Unauthenticated requests blocked with 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/analytics/overview");
    assert.equal(res.status, 401);
  });
});
