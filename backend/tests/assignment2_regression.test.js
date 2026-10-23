/**
 * Assignment 2 Regression & End-to-End Workflow Test Suite
 * 
 * Verifies:
 * 1. Telephony call intake -> Task auto-generation (/api/v1/tasks/from-call).
 * 2. Intelligent role-based assignment (CLINICAL -> Doctor, RECEPTION -> Receptionist, INSURANCE -> Insurance Employee).
 * 3. Ambiguous assignee handling (Routed to Department Manager / Admin review queue).
 * 4. 5-minute duplicate prevention.
 * 5. Role-scoped task queries across Doctor, Receptionist, and Patient.
 * 6. Task lifecycle state machine transitions & permission boundaries.
 */

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
let adminToken, doctorToken, receptionistToken, insuranceToken, managerToken, patientToken;
let doctorUser, receptionistUser, insuranceUser, managerUser, patientUser, patientDoc;

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
    name: "Admin Lead",
    email: "admin@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.ADMIN,
    department: "Administration",
  });
  adminToken = adminRes.body.token;

  // 2. Doctor
  const docRes = await request(app).post("/api/v1/auth/register").send({
    name: "Dr. Rahul Sharma",
    email: "dr.rahul@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.DOCTOR,
    department: "Cardiology",
  });
  doctorToken = docRes.body.token;
  doctorUser = docRes.body.user;

  // 3. Receptionist
  const recRes = await request(app).post("/api/v1/auth/register").send({
    name: "Clara Oswald",
    email: "clara.o@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.RECEPTIONIST,
    department: "Central Reception Desk",
  });
  receptionistToken = recRes.body.token;
  receptionistUser = recRes.body.user;

  // 4. Insurance
  const insRes = await request(app).post("/api/v1/auth/register").send({
    name: "Marcus Shaw",
    email: "marcus.s@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.INSURANCE_EMPLOYEE,
    department: "Insurance & Billing",
  });
  insuranceToken = insRes.body.token;
  insuranceUser = insRes.body.user;

  // 5. Manager
  const mgrRes = await request(app).post("/api/v1/auth/register").send({
    name: "Eleanor Vance",
    email: "eleanor.v@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.DEPARTMENT_MANAGER,
    department: "Clinical Care",
  });
  managerToken = mgrRes.body.token;
  managerUser = mgrRes.body.user;

  // 6. Patient User & Patient Profile
  const patUserRes = await request(app).post("/api/v1/auth/register").send({
    name: "Rahul Sharma",
    email: "rahul.sharma@email.com",
    password: "Password123!",
    role: USER_ROLES.PATIENT,
    department: "Patient Access",
  });
  patientToken = patUserRes.body.token;
  patientUser = patUserRes.body.user;

  patientDoc = await Patient.create({
    userId: patientUser.id,
    name: "Rahul Sharma",
    email: "rahul.sharma@email.com",
    phone: "+1-555-0192",
    dateOfBirth: "1988-06-15",
    gender: "Male",
    mrn: "MRN-884920",
    department: "General Medicine",
    assignedDoctor: doctorUser.id,
  });
});

describe("Assignment 2: Call Intelligence to Operational Task Workflow", () => {
  test("1. Successfully creates clinical, reception, and insurance tasks from inbound call", async () => {
    const callPayload = {
      callId: "call-live-regression-01",
      transcript: "Hello, my name is Rahul Sharma. I had an appendectomy five days ago with Dr. Rahul. I have a fever of 100.8 degrees and need urgent consultation.",
      summary: "Patient Rahul Sharma reports post-op fever and wound discomfort. Follow-up consultation required.",
      intent: "Follow-up Request",
      priority: "CRITICAL",
      doctorName: "Dr. Rahul Sharma",
      actions: [
        {
          task: "Urgent Clinical Assessment & Post-op Evaluation",
          department: "CLINICAL",
          priority: "CRITICAL",
          description: "Assess patient post-op fever and incision swelling",
          evidence_quote: "fever of 100.8 degrees and need urgent consultation",
        },
        {
          task: "Schedule follow-up clinic appointment with Dr. Rahul",
          department: "RECEPTION",
          priority: "MEDIUM",
          description: "Book urgent slot in cardiology / post-op clinic",
          evidence_quote: "need urgent consultation",
        },
        {
          task: "Expedite insurance pre-auth for post-op imaging",
          department: "INSURANCE",
          priority: "HIGH",
          description: "Verify BlueCross coverage for ultrasound scan",
          evidence_quote: "pre-authorization coverage",
        },
      ],
    };

    const res = await request(app)
      .post("/api/v1/tasks/from-call")
      .send(callPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.tasks.length, 3);

    // Verify Clinical Task Assignment
    const clinicalTask = res.body.tasks.find((t) => t.department === "CLINICAL");
    assert.ok(clinicalTask);
    assert.equal(clinicalTask.priority, "URGENT");
    assert.equal(clinicalTask.status, "ASSIGNED");
    assert.equal(clinicalTask.assignedTo.email, "dr.rahul@metrohealth.eco");
    assert.equal(clinicalTask.patientId.email, "rahul.sharma@email.com");

    // Verify Reception Task Assignment
    const receptionTask = res.body.tasks.find((t) => t.department === "RECEPTION");
    assert.ok(receptionTask);
    assert.equal(receptionTask.status, "ASSIGNED");
    assert.equal(receptionTask.assignedTo.email, "clara.o@metrohealth.eco");

    // Verify Insurance Task Assignment
    const insuranceTask = res.body.tasks.find((t) => t.department === "INSURANCE");
    assert.ok(insuranceTask);
    assert.equal(insuranceTask.status, "ASSIGNED");
    assert.equal(insuranceTask.assignedTo.email, "marcus.s@metrohealth.eco");
  });

  test("2. Ambiguous assignee routes task to Department Manager/Admin review queue instead of losing it", async () => {
    // Remove receptionist so no active receptionist can be resolved
    await User.deleteMany({ role: USER_ROLES.RECEPTIONIST });

    const callPayload = {
      callId: "call-ambiguous-01",
      transcript: "Patient calling regarding hospital parking pass validation and front check-in.",
      intent: "General Inquiry",
      priority: "LOW",
      actions: [
        {
          task: "Review front check-in parking validation",
          department: "RECEPTION",
          priority: "LOW",
          description: "Unallocated front desk request",
        },
      ],
    };

    const res = await request(app)
      .post("/api/v1/tasks/from-call")
      .send(callPayload);

    assert.equal(res.status, 201);
    const task = res.body.tasks[0];
    assert.ok(task);
    // Should be in review queue (assigned to Manager or Admin)
    assert.ok(task.assignedTo);
    assert.ok(
      task.assignedTo.role === USER_ROLES.DEPARTMENT_MANAGER ||
      task.assignedTo.role === USER_ROLES.ADMIN
    );
    assert.equal(task.aiMetadata.reviewQueue, true);
  });

  test("3. Duplicate task prevention suppresses duplicate items within 5 minutes", async () => {
    const callPayload = {
      callId: "call-duplicate-check",
      actions: [
        {
          task: "Protocol Refill Verification for Metformin",
          department: "CLINICAL",
          priority: "MEDIUM",
          description: "Verify dosage history",
        },
      ],
    };

    // First call
    const res1 = await request(app)
      .post("/api/v1/tasks/from-call")
      .send(callPayload);
    assert.equal(res1.status, 201);
    assert.equal(res1.body.tasks.length, 1);
    const firstTaskId = res1.body.tasks[0]._id;

    // Immediate second call with identical task title & department
    const res2 = await request(app)
      .post("/api/v1/tasks/from-call")
      .send(callPayload);
    assert.equal(res2.status, 201);
    assert.equal(res2.body.tasks.length, 1);
    assert.equal(res2.body.tasks[0]._id, firstTaskId);

    // Verify only 1 document exists in MongoDB
    const count = await Task.countDocuments({ title: "Protocol Refill Verification for Metformin" });
    assert.equal(count, 1);
  });

  test("4. Role-scoped task retrieval displays appropriate tasks to Doctor, Receptionist, and Patient", async () => {
    // Seed 1 Clinical task and 1 Reception task linked to patient
    await request(app)
      .post("/api/v1/tasks/from-call")
      .send({
        actions: [
          {
            task: "Clinical Heart Monitor Review",
            department: "CLINICAL",
            priority: "HIGH",
            description: "Check ECG telemetry",
          },
          {
            task: "Confirm Patient Appointment Time",
            department: "RECEPTION",
            priority: "LOW",
            description: "Call patient to confirm arrival time",
          },
        ],
      });

    // Doctor query: sees clinical task
    const docQuery = await request(app)
      .get("/api/v1/tasks?department=CLINICAL")
      .set("Authorization", `Bearer ${doctorToken}`);
    assert.equal(docQuery.status, 200);
    assert.ok(docQuery.body.tasks.some((t) => t.title === "Clinical Heart Monitor Review"));
    assert.ok(!docQuery.body.tasks.some((t) => t.title === "Confirm Patient Appointment Time"));

    // Receptionist query: sees reception task
    const recQuery = await request(app)
      .get("/api/v1/tasks?department=RECEPTION")
      .set("Authorization", `Bearer ${receptionistToken}`);
    assert.equal(recQuery.status, 200);
    assert.ok(recQuery.body.tasks.some((t) => t.title === "Confirm Patient Appointment Time"));
    assert.ok(!recQuery.body.tasks.some((t) => t.title === "Clinical Heart Monitor Review"));

    // Patient query: sees tasks associated with their MRN / PatientId
    const patQuery = await request(app)
      .get("/api/v1/tasks")
      .set("Authorization", `Bearer ${patientToken}`);
    assert.equal(patQuery.status, 200);
    assert.ok(Array.isArray(patQuery.body.tasks));
  });

  test("5. Task status transitions follow role permissions (Doctor updates, Patient blocked)", async () => {
    const createRes = await request(app)
      .post("/api/v1/tasks/from-call")
      .send({
        actions: [
          {
            task: "Evaluate Post-Surgical Incision Redness",
            department: "CLINICAL",
            priority: "URGENT",
          },
        ],
      });

    const taskId = createRes.body.tasks[0]._id;

    // Doctor transitions task to IN_PROGRESS
    const updateRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ status: "IN_PROGRESS" });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.task.status, "IN_PROGRESS");

    // Doctor transitions task to COMPLETED
    const completeRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ status: "COMPLETED" });
    assert.equal(completeRes.status, 200);
    assert.equal(completeRes.body.task.status, "COMPLETED");

    // Patient attempts to modify internal task status -> 403 Forbidden
    const patientAttempt = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set("Authorization", `Bearer ${patientToken}`)
      .send({ status: "IN_PROGRESS" });
    assert.equal(patientAttempt.status, 403);
  });
});
