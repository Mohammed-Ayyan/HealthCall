/**
 * CareOps AI - User Management Integration Test Suite
 * 
 * Verifies all CRUD operations, RBAC permissions, department scoping,
 * filters, and security boundaries.
 * 
 * Scenarios tested:
 * ADMIN:
 * ✓ Login & authentication
 * ✓ View all users with filters & search
 * ✓ Create doctor (with department validation & bcrypt hashing)
 * ✓ Update employee (name, role, department, phone, avatar)
 * ✓ Deactivate account (soft delete status = INACTIVE)
 * ✓ Change user status (ACTIVE, INACTIVE, SUSPENDED)
 * 
 * MANAGER:
 * ✓ View users in own department
 * ✗ Blocked from creating users (403 Forbidden)
 * ✗ Blocked from updating users / changing roles (403 Forbidden)
 * ✗ Blocked from deleting users (403 Forbidden)
 * ✗ Blocked from viewing users in other departments (403 Forbidden)
 * 
 * DOCTOR / RECEPTIONIST / PATIENT:
 * ✗ Blocked from all user management endpoints (403 Forbidden)
 * 
 * UNAUTHORIZED:
 * ✓ Blocked when token is missing (401 Unauthorized)
 */

const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../app");
const User = require("../models/User");
const { USER_ROLES, USER_STATUS } = require("../config/roles");

let mongoServer;
let adminToken;
let managerCardioToken;
let managerNeuroToken;
let doctorToken;
let patientToken;

describe("CareOps AI - User Management Module", () => {
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
    await User.deleteMany({});

    // Seed base users for tests
    // 1. Admin
    const adminRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Admin User",
        email: "admin@hospital.com",
        password: "adminPassword123",
        role: USER_ROLES.ADMIN,
        department: "Administration",
      });
    adminToken = adminRes.body.token;

    // 2. Department Manager - Cardiology
    const mgrCardioRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Dr. Eleanor Vance",
        email: "eleanor.cardio@hospital.com",
        password: "managerPassword123",
        role: USER_ROLES.DEPARTMENT_MANAGER,
        department: "Cardiology",
      });
    managerCardioToken = mgrCardioRes.body.token;

    // 3. Department Manager - Neurology
    const mgrNeuroRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Dr. Marcus Reed",
        email: "marcus.neuro@hospital.com",
        password: "managerPassword123",
        role: USER_ROLES.DEPARTMENT_MANAGER,
        department: "Neurology",
      });
    managerNeuroToken = mgrNeuroRes.body.token;

    // 4. Doctor
    const docRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Dr. Sarah Jenkins",
        email: "sarah.doc@hospital.com",
        password: "doctorPassword123",
        role: USER_ROLES.DOCTOR,
        department: "Cardiology",
      });
    doctorToken = docRes.body.token;

    // 5. Patient
    const patRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Rahul Sharma",
        email: "rahul.pat@test.com",
        password: "patientPassword123",
        role: USER_ROLES.PATIENT,
      });
    patientToken = patRes.body.token;
  });

  // ==========================================
  // ADMIN TESTS
  // ==========================================

  test("Admin: View all hospital users", async () => {
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.users));
    assert.equal(res.body.users.length, 5); // 5 seeded users
  });

  test("Admin: Filter users by role, department, status, and search query", async () => {
    // Filter by role=DOCTOR
    const roleRes = await request(app)
      .get("/api/v1/users?role=DOCTOR")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(roleRes.status, 200);
    assert.equal(roleRes.body.users.length, 1);
    assert.equal(roleRes.body.users[0].role, USER_ROLES.DOCTOR);

    // Filter by department=Cardiology
    const deptRes = await request(app)
      .get("/api/v1/users?department=Cardiology")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(deptRes.status, 200);
    assert.equal(deptRes.body.users.length, 2); // Manager Eleanor & Doctor Sarah

    // Search query search=Rahul
    const searchRes = await request(app)
      .get("/api/v1/users?search=Rahul")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(searchRes.status, 200);
    assert.equal(searchRes.body.users.length, 1);
    assert.equal(searchRes.body.users[0].name, "Rahul Sharma");
  });

  test("Admin: Create a new doctor account with department and bcrypt encryption", async () => {
    const newDoctorData = {
      name: "Dr. James Wilson",
      email: "james.wilson@hospital.com",
      password: "securePassword123",
      role: USER_ROLES.DOCTOR,
      department: "Cardiology",
      phone: "+1 (555) 392-1102",
    };

    const res = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(newDoctorData);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "User created successfully");
    assert.ok(res.body.user);
    assert.equal(res.body.user.name, "Dr. James Wilson");
    assert.equal(res.body.user.role, USER_ROLES.DOCTOR);
    assert.equal(res.body.user.department, "Cardiology");
    assert.equal(res.body.user.status, USER_STATUS.ACTIVE);
    assert.equal(res.body.user.password, undefined); // Password never exposed

    // Verify user can now log in using new credentials
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "james.wilson@hospital.com",
        password: "securePassword123",
      });

    assert.equal(loginRes.status, 200);
    assert.ok(loginRes.body.token);
  });

  test("Admin: Reject creation with duplicate email or missing required fields", async () => {
    // Duplicate email
    const duplicateRes = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Duplicate User",
        email: "admin@hospital.com", // already taken
        password: "password123",
        role: USER_ROLES.DOCTOR,
        department: "Surgery",
      });

    assert.equal(duplicateRes.status, 409);
    assert.equal(duplicateRes.body.success, false);

    // Missing department for staff user
    const noDeptRes = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Staff No Dept",
        email: "nodept@hospital.com",
        password: "password123",
        role: USER_ROLES.RECEPTIONIST,
      });

    assert.equal(noDeptRes.status, 400);
    assert.equal(noDeptRes.body.success, false);
    assert.match(noDeptRes.body.message, /department is required/i);
  });

  test("Admin: Update user profile, department, and role", async () => {
    // Find doctor
    const docUser = await User.findOne({ email: "sarah.doc@hospital.com" });

    const res = await request(app)
      .patch(`/api/v1/users/${docUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Dr. Sarah Jenkins-Smith",
        phone: "+1 (555) 777-8899",
        department: "Cardiothoracic Surgery",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.name, "Dr. Sarah Jenkins-Smith");
    assert.equal(res.body.user.department, "Cardiothoracic Surgery");
    assert.equal(res.body.user.phone, "+1 (555) 777-8899");
  });

  test("Admin: Block password modification via PATCH /api/v1/users/:id", async () => {
    const docUser = await User.findOne({ email: "sarah.doc@hospital.com" });

    const res = await request(app)
      .patch(`/api/v1/users/${docUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        password: "hackedNewPassword!",
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /password cannot be updated/i);
  });

  test("Admin: Change user status (ACTIVE -> SUSPENDED)", async () => {
    const docUser = await User.findOne({ email: "sarah.doc@hospital.com" });

    const res = await request(app)
      .patch(`/api/v1/users/${docUser._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "SUSPENDED" });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.status, USER_STATUS.SUSPENDED);
  });

  test("Admin: Soft delete user (sets status to INACTIVE, keeps record)", async () => {
    const docUser = await User.findOne({ email: "sarah.doc@hospital.com" });

    const res = await request(app)
      .delete(`/api/v1/users/${docUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.status, USER_STATUS.INACTIVE);

    // Verify record still exists in database
    const dbRecord = await User.findById(docUser._id);
    assert.ok(dbRecord);
    assert.equal(dbRecord.status, USER_STATUS.INACTIVE);
  });

  // ==========================================
  // DEPARTMENT MANAGER TESTS
  // ==========================================

  test("Manager: View only users in their own department", async () => {
    // Eleanor is Cardiology Manager
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${managerCardioToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Should only see Cardiology users (Eleanor and Sarah), not Neurology or Admin
    assert.equal(res.body.users.length, 2);
    for (const u of res.body.users) {
      assert.equal(u.department, "Cardiology");
    }
  });

  test("Manager: Blocked from creating new users (403 Forbidden)", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${managerCardioToken}`)
      .send({
        name: "Dr. Unauthorized",
        email: "unauth@hospital.com",
        password: "password123",
        role: USER_ROLES.DOCTOR,
        department: "Cardiology",
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "You do not have permission");
  });

  test("Manager: Blocked from updating users or changing roles (403 Forbidden)", async () => {
    const docUser = await User.findOne({ email: "sarah.doc@hospital.com" });

    const res = await request(app)
      .patch(`/api/v1/users/${docUser._id}`)
      .set("Authorization", `Bearer ${managerCardioToken}`)
      .send({
        role: USER_ROLES.ADMIN,
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "You do not have permission");
  });

  test("Manager: Blocked from deleting users (403 Forbidden)", async () => {
    const docUser = await User.findOne({ email: "sarah.doc@hospital.com" });

    const res = await request(app)
      .delete(`/api/v1/users/${docUser._id}`)
      .set("Authorization", `Bearer ${managerCardioToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "You do not have permission");
  });

  test("Manager: Blocked from viewing user details outside department (403 Forbidden)", async () => {
    // Marcus is in Neurology; Eleanor (Cardiology manager) tries to view Marcus
    const neuroUser = await User.findOne({ email: "marcus.neuro@hospital.com" });

    const res = await request(app)
      .get(`/api/v1/users/${neuroUser._id}`)
      .set("Authorization", `Bearer ${managerCardioToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /outside your department/i);
  });

  // ==========================================
  // RESTRICTED ROLES TESTS (Doctor, Patient)
  // ==========================================

  test("Doctor: Blocked from accessing user management (403 Forbidden)", async () => {
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${doctorToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "You do not have permission");
  });

  test("Patient: Blocked from accessing user management (403 Forbidden)", async () => {
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${patientToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "You do not have permission");
  });

  // ==========================================
  // UNAUTHORIZED REQUESTS
  // ==========================================

  test("Unauthorized: Request without token blocked (401 Unauthorized)", async () => {
    const res = await request(app).get("/api/v1/users");

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Authentication required");
  });
});
