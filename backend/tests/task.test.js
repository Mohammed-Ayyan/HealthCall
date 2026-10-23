const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../app");
const User = require("../models/User");
const Patient = require("../models/Patient");
const Task = require("../models/Task");
const { USER_ROLES } = require("../config/roles");

let mongoServer;
let adminToken, doctorToken, receptionistToken, managerToken, patientToken, otherPatientToken;
let patientDoc, otherPatientDoc, doctorUser, receptionistUser;

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

  // 1. Admin
  const adminRes = await request(app).post("/api/v1/auth/register").send({
    name: "Dr. Evelyn Vance",
    email: "admin@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.ADMIN,
    department: "Executive Administration",
  });
  adminToken = adminRes.body.token;

  // 2. Doctor
  const docRes = await request(app).post("/api/v1/auth/register").send({
    name: "Dr. Ayyan Khan",
    email: "dr.ayyan@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.DOCTOR,
    department: "Cardiology",
  });
  doctorToken = docRes.body.token;
  doctorUser = await User.findOne({ email: "dr.ayyan@metrohealth.eco" });

  // 3. Receptionist
  const recRes = await request(app).post("/api/v1/auth/register").send({
    name: "Clara Oswald",
    email: "clara.o@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.RECEPTIONIST,
    department: "Reception",
  });
  receptionistToken = recRes.body.token;
  receptionistUser = await User.findOne({ email: "clara.o@metrohealth.eco" });

  // 4. Department Manager
  const mgrRes = await request(app).post("/api/v1/auth/register").send({
    name: "Dr. Eleanor Vance",
    email: "eleanor.v@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.DEPARTMENT_MANAGER,
    department: "Clinical",
  });
  managerToken = mgrRes.body.token;

  // 5. Patient 1
  const pat1Res = await request(app).post("/api/v1/auth/register").send({
    name: "Rahul Sharma",
    email: "rahul.sharma@email.com",
    password: "Password123!",
    role: USER_ROLES.PATIENT,
    department: "General",
  });
  patientToken = pat1Res.body.token;
  const pat1User = await User.findOne({ email: "rahul.sharma@email.com" });
  patientDoc = await Patient.create({
    userId: pat1User._id,
    mrn: "MRN-TASK-001",
    name: "Rahul Sharma",
    email: "rahul.sharma@email.com",
    phone: "+15553498812",
    department: "General",
  });

  // 6. Patient 2
  const pat2Res = await request(app).post("/api/v1/auth/register").send({
    name: "Abrar Ahmed",
    email: "abrar@email.com",
    password: "Password123!",
    role: USER_ROLES.PATIENT,
    department: "General",
  });
  otherPatientToken = pat2Res.body.token;
  const pat2User = await User.findOne({ email: "abrar@email.com" });
  otherPatientDoc = await Patient.create({
    userId: pat2User._id,
    mrn: "MRN-TASK-002",
    name: "Abrar Ahmed",
    email: "abrar@email.com",
    phone: "+15557762190",
    department: "General",
  });
});

describe("CareOps AI - Healthcare Workflow & Task Management Engine", () => {
  // ADMIN WORKFLOWS
  test("ADMIN: Create operational task and persist in MongoDB", async () => {
    const res = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Schedule post-operative cardiac consult",
        description: "Patient reported mild chest tightness; triage for priority review",
        department: "CLINICAL",
        priority: "HIGH",
        patientId: patientDoc._id.toString(),
        assignedTo: doctorUser._id.toString(),
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.task.title, "Schedule post-operative cardiac consult");
    assert.equal(res.body.task.department, "CLINICAL");
    assert.equal(res.body.task.priority, "HIGH");
    assert.equal(res.body.task.status, "ASSIGNED");
    assert.equal(res.body.task.assignedTo.name, "Dr. Ayyan Khan");
    assert.equal(res.body.task.patientId.name, "Rahul Sharma");

    // Verify in database
    const dbTask = await Task.findById(res.body.task.id);
    assert.ok(dbTask);
    assert.equal(dbTask.status, "ASSIGNED");
  });

  test("ADMIN: Assign task to staff employee", async () => {
    // Create unassigned task
    const createRes = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Coordinate medical record transport",
        description: "Send physical chart to Pavilion 3 archive",
        department: "RECEPTION",
        priority: "LOW",
      });

    assert.equal(createRes.status, 201);
    const taskId = createRes.body.task.id;
    assert.equal(createRes.body.task.status, "CREATED");

    // Assign to Receptionist
    const assignRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        assignedTo: receptionistUser._id.toString(),
      });

    assert.equal(assignRes.status, 200);
    assert.equal(assignRes.body.success, true);
    assert.equal(assignRes.body.task.status, "ASSIGNED");
    assert.equal(assignRes.body.task.assignedTo.name, "Clara Oswald");
  });

  test("ADMIN: View all tasks across all hospital departments", async () => {
    await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Clinical Task", description: "Doc duty", department: "CLINICAL" });

    await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Reception Task", description: "Front duty", department: "RECEPTION" });

    const res = await request(app)
      .get("/api/v1/tasks")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.tasks.length, 2);
  });

  // DOCTOR WORKFLOWS
  test("DOCTOR: View clinical and assigned tasks", async () => {
    // 1 Clinical task
    await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Check post-op incision", description: "Wound care", department: "CLINICAL" });

    // 1 Insurance task
    await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Verify claim authorization", description: "RCM check", department: "INSURANCE" });

    const res = await request(app)
      .get("/api/v1/tasks")
      .set("Authorization", `Bearer ${doctorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.tasks.length, 1);
    assert.equal(res.body.tasks[0].title, "Check post-op incision");
  });

  test("DOCTOR: Update clinical task status along allowed state machine", async () => {
    const createRes = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Review blood lab results",
        description: "Verify potassium levels before discharge",
        department: "CLINICAL",
        assignedTo: doctorUser._id.toString(),
      });

    const taskId = createRes.body.task.id;
    assert.equal(createRes.body.task.status, "ASSIGNED");

    // Transition: ASSIGNED -> IN_PROGRESS
    const inProgRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ status: "IN_PROGRESS" });

    assert.equal(inProgRes.status, 200);
    assert.equal(inProgRes.body.task.status, "IN_PROGRESS");

    // Transition: IN_PROGRESS -> COMPLETED
    const compRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ status: "COMPLETED" });

    assert.equal(compRes.status, 200);
    assert.equal(compRes.body.task.status, "COMPLETED");
  });

  // RECEPTIONIST WORKFLOWS
  test("RECEPTIONIST: Create appointment-related task and update status", async () => {
    const createRes = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${receptionistToken}`)
      .send({
        title: "Contact patient for rescheduled consultation slot",
        description: "Provide alternative dates for Dr. Rahul clinic",
        department: "RECEPTION",
        priority: "MEDIUM",
        patientId: patientDoc._id.toString(),
      });

    assert.equal(createRes.status, 201);
    const taskId = createRes.body.task.id;

    // Transition CREATED -> IN_PROGRESS
    const updateRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set("Authorization", `Bearer ${receptionistToken}`)
      .send({ status: "IN_PROGRESS" });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.task.status, "IN_PROGRESS");
  });

  test("RECEPTIONIST: Blocked from creating tasks in unauthorized departments", async () => {
    const res = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${receptionistToken}`)
      .send({
        title: "Submit prior-auth dossier",
        description: "Unauthorized division",
        department: "INSURANCE",
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // DEPARTMENT MANAGER WORKFLOWS
  test("DEPARTMENT_MANAGER: View department tasks and assign staff", async () => {
    // Clinical task (matches manager's Clinical department)
    const taskRes = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Bedside post-op check",
        description: "Clinical evaluation",
        department: "CLINICAL",
      });

    const taskId = taskRes.body.task.id;

    // Manager can view department tasks
    const listRes = await request(app)
      .get("/api/v1/tasks")
      .set("Authorization", `Bearer ${managerToken}`);

    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.tasks.length, 1);

    // Manager can assign task to clinician
    const assignRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/assign`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ assignedTo: doctorUser._id.toString() });

    assert.equal(assignRes.status, 200);
    assert.equal(assignRes.body.task.assignedTo.name, "Dr. Ayyan Khan");
  });

  // PATIENT WORKFLOWS & SECURITY
  test("PATIENT: View own task status but blocked from viewing other patients", async () => {
    // Task 1 for Patient 1
    const p1TaskRes = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Cardiology follow-up booking",
        description: "Personal consultation",
        department: "RECEPTION",
        patientId: patientDoc._id.toString(),
      });

    // Task 2 for Patient 2
    const p2TaskRes = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Orthopedic follow-up booking",
        description: "Personal consultation",
        department: "RECEPTION",
        patientId: otherPatientDoc._id.toString(),
      });

    // Patient 1 lists tasks: should only see Task 1
    const listRes = await request(app)
      .get("/api/v1/tasks")
      .set("Authorization", `Bearer ${patientToken}`);

    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.tasks.length, 1);
    assert.equal(listRes.body.tasks[0].id, p1TaskRes.body.task.id);

    // Patient 1 directly requesting Patient 2's task: 403 Forbidden
    const singleRes = await request(app)
      .get(`/api/v1/tasks/${p2TaskRes.body.task.id}`)
      .set("Authorization", `Bearer ${patientToken}`);

    assert.equal(singleRes.status, 403);
  });

  test("PATIENT: Blocked from creating internal operational tasks", async () => {
    const res = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        title: "Unauthorized internal task",
        description: "Patient trying to create hospital task",
        department: "RECEPTION",
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // STATE MACHINE & ERROR HANDLING
  test("VALIDATION: Prevent illegal status transitions (e.g. CREATED -> COMPLETED)", async () => {
    const createRes = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Medication audit",
        description: "Review antibiotic regime",
        department: "CLINICAL",
      });

    const taskId = createRes.body.task.id;

    // Illegal skip from CREATED directly to COMPLETED
    const badRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "COMPLETED" });

    assert.equal(badRes.status, 400);
    assert.match(badRes.body.message, /Invalid status transition/i);
  });

  test("SECURITY: Unauthenticated request blocked with 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/tasks");
    assert.equal(res.status, 401);
  });
});
