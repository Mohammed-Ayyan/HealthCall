/**
 * CareOps AI - Authentication & RBAC Test Suite
 * 
 * Tests the 9 mandatory authentication and role-based access control scenarios:
 * 1. Register patient
 * 2. Register doctor
 * 3. Login patient
 * 4. Login doctor
 * 5. Invalid password
 * 6. Duplicate email
 * 7. Missing fields
 * 8. Protected route without token
 * 9. Protected route with wrong role
 */

const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../app");
const User = require("../models/User");
const { USER_ROLES } = require("../config/roles");

let mongoServer;

describe("CareOps AI - Authentication & RBAC Engine", () => {
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
  });

  // Test 1: Register patient
  test("1. Register patient successfully", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Rahul Sharma",
        email: "rahul@test.com",
        password: "password123",
        role: "PATIENT",
        department: "",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "User created successfully");
    assert.ok(res.body.user);
    assert.equal(res.body.user.name, "Rahul Sharma");
    assert.equal(res.body.user.email, "rahul@test.com");
    assert.equal(res.body.user.role, USER_ROLES.PATIENT);
    assert.equal(res.body.user.password, undefined); // Password never returned
  });

  // Test 2: Register doctor
  test("2. Register doctor successfully", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Dr. Aris Thorne",
        email: "doctor@test.com",
        password: "securePassword123",
        role: "DOCTOR",
        department: "Cardiology",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.user);
    assert.equal(res.body.user.name, "Dr. Aris Thorne");
    assert.equal(res.body.user.email, "doctor@test.com");
    assert.equal(res.body.user.role, USER_ROLES.DOCTOR);
    assert.equal(res.body.user.department, "Cardiology");
    assert.equal(res.body.user.password, undefined);
  });

  // Test 3: Login patient
  test("3. Login patient with valid credentials", async () => {
    // First register
    await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Rahul Sharma",
        email: "rahul@test.com",
        password: "password123",
        role: "PATIENT",
      });

    // Then login
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "rahul@test.com",
        password: "password123",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.ok(res.body.user);
    assert.equal(res.body.user.name, "Rahul Sharma");
    assert.equal(res.body.user.role, USER_ROLES.PATIENT);
    assert.equal(res.body.user.password, undefined);
  });

  // Test 4: Login doctor
  test("4. Login doctor with valid credentials", async () => {
    // First register
    await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Dr. Aris Thorne",
        email: "doctor@test.com",
        password: "password123",
        role: "DOCTOR",
        department: "Cardiology",
      });

    // Then login
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "doctor@test.com",
        password: "password123",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.ok(res.body.user);
    assert.equal(res.body.user.role, USER_ROLES.DOCTOR);
    assert.equal(res.body.user.department, "Cardiology");
  });

  // Test 5: Invalid password
  test("5. Reject login with invalid password", async () => {
    // First register
    await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Rahul Sharma",
        email: "rahul@test.com",
        password: "correctPassword123",
        role: "PATIENT",
      });

    // Attempt login with wrong password
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "rahul@test.com",
        password: "wrongPassword!",
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Invalid email or password");
    assert.equal(res.body.token, undefined);
  });

  // Test 6: Duplicate email
  test("6. Reject registration with duplicate email", async () => {
    // Register once
    await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Initial User",
        email: "duplicate@test.com",
        password: "password123",
        role: "PATIENT",
      });

    // Register again with same email
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Second User",
        email: "duplicate@test.com",
        password: "differentPassword123",
        role: "DOCTOR",
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already exists/i);
  });

  // Test 7: Missing fields
  test("7. Reject registration with missing required fields", async () => {
    // Missing password
    const res1 = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "No Password User",
        email: "nopass@test.com",
        role: "PATIENT",
      });

    assert.equal(res1.status, 400);
    assert.equal(res1.body.success, false);

    // Missing email
    const res2 = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "No Email User",
        password: "password123",
        role: "PATIENT",
      });

    assert.equal(res2.status, 400);
    assert.equal(res2.body.success, false);

    // Invalid role
    const res3 = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Bad Role User",
        email: "badrole@test.com",
        password: "password123",
        role: "SUPER_GOD_ROLE",
      });

    assert.equal(res3.status, 400);
    assert.equal(res3.body.success, false);
    assert.match(res3.body.message, /invalid role/i);
  });

  // Test 8: Protected route without token
  test("8. Block access to protected route when token is missing", async () => {
    const res = await request(app).get("/api/v1/auth/me");

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Authentication required");
  });

  // Test 9: Protected route with wrong role
  test("9. Block access to role-protected route when role does not match", async () => {
    // 1. Register a Patient
    const regRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Patient User",
        email: "patient.guard@test.com",
        password: "password123",
        role: "PATIENT",
      });

    const patientToken = regRes.body.token;

    // 2. Patient tries to access /doctor-only route
    const doctorOnlyRes = await request(app)
      .get("/api/v1/auth/doctor-only")
      .set("Authorization", `Bearer ${patientToken}`);

    assert.equal(doctorOnlyRes.status, 403);
    assert.equal(doctorOnlyRes.body.success, false);
    assert.equal(doctorOnlyRes.body.message, "You do not have permission");

    // 3. Register a Doctor and verify access IS granted
    const docRegRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Dr. Granted",
        email: "doc.granted@test.com",
        password: "password123",
        role: "DOCTOR",
      });

    const doctorToken = docRegRes.body.token;

    const doctorAccessRes = await request(app)
      .get("/api/v1/auth/doctor-only")
      .set("Authorization", `Bearer ${doctorToken}`);

    assert.equal(doctorAccessRes.status, 200);
    assert.equal(doctorAccessRes.body.success, true);
    assert.equal(doctorAccessRes.body.message, "Access granted to Clinical Doctor workspace");
  });

  // Additional Test: Current user /me and Logout
  test("10. Verify /me endpoint and /logout endpoint", async () => {
    const regRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Dr. Evelyn Reed",
        email: "admin.reed@test.com",
        password: "password123",
        role: "ADMIN",
        department: "Administration",
      });

    const token = regRes.body.token;

    // Call /me
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.success, true);
    assert.equal(meRes.body.name, "Dr. Evelyn Reed");
    assert.equal(meRes.body.role, USER_ROLES.ADMIN);

    // Call /logout
    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);
    assert.equal(logoutRes.body.message, "Logged out successfully");
  });
});
