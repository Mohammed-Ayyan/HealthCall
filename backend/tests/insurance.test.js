const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../app");
const User = require("../models/User");
const Patient = require("../models/Patient");
const InsuranceClaim = require("../models/InsuranceClaim");
const { USER_ROLES } = require("../config/roles");

let mongoServer;
let adminToken, insuranceToken, doctorToken, receptionistToken, patientToken, otherPatientToken;
let patientDoc, otherPatientDoc;

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

  // 2. Insurance Employee
  const insRes = await request(app).post("/api/v1/auth/register").send({
    name: "Marcus Vance",
    email: "marcus.ins@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.INSURANCE_EMPLOYEE,
    department: "Insurance & Pre-Auth",
  });
  insuranceToken = insRes.body.token;

  // 3. Doctor
  const docRes = await request(app).post("/api/v1/auth/register").send({
    name: "Dr. Ayyan Khan",
    email: "dr.ayyan@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.DOCTOR,
    department: "Cardiology",
  });
  doctorToken = docRes.body.token;

  // 4. Receptionist
  const recRes = await request(app).post("/api/v1/auth/register").send({
    name: "Clara Oswald",
    email: "clara.o@metrohealth.eco",
    password: "Password123!",
    role: USER_ROLES.RECEPTIONIST,
    department: "Reception",
  });
  receptionistToken = recRes.body.token;

  // 5. Patient 1 (Rahul Sharma)
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
    mrn: "MRN-INS-001",
    name: "Rahul Sharma",
    email: "rahul.sharma@email.com",
    phone: "+15553498812",
    insuranceProvider: "BlueCross BlueShield",
    insuranceStatus: "Active & Verified",
    department: "General",
  });

  // 6. Patient 2 (Elena Morales)
  const pat2Res = await request(app).post("/api/v1/auth/register").send({
    name: "Elena Morales",
    email: "elena.m@email.com",
    password: "Password123!",
    role: USER_ROLES.PATIENT,
    department: "General",
  });
  otherPatientToken = pat2Res.body.token;
  const pat2User = await User.findOne({ email: "elena.m@email.com" });
  otherPatientDoc = await Patient.create({
    userId: pat2User._id,
    mrn: "MRN-INS-002",
    name: "Elena Morales",
    email: "elena.m@email.com",
    phone: "+15558832109",
    insuranceProvider: "Aetna Health",
    insuranceStatus: "Active & Verified",
    department: "General",
  });
});

describe("CareOps AI — Insurance Management Module", () => {
  // Test 1: Admin creates claim
  test("ADMIN: Create insurance claim and persist in MongoDB", async () => {
    const res = await request(app)
      .post("/api/v1/insurance/claims")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        patientId: patientDoc._id.toString(),
        insuranceProvider: "BlueCross BlueShield",
        policyNumber: "BCBS-9021-8849",
        claimAmount: 4200.5,
        claimReason: "Post-operative surgical appendectomy coverage and monitoring",
        claimType: "POST_OP_COVERAGE",
        priority: "HIGH",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.claim.insuranceProvider, "BlueCross BlueShield");
    assert.equal(res.body.claim.claimAmount, 4200.5);
    assert.equal(res.body.claim.status, "SUBMITTED");
    assert.ok(res.body.claim.claimNumber.startsWith("CLM-"));

    const dbClaim = await InsuranceClaim.findById(res.body.claim.id);
    assert.ok(dbClaim);
    assert.equal(dbClaim.policyNumber, "BCBS-9021-8849");
  });

  // Test 2: Insurance employee views claims
  test("INSURANCE_EMPLOYEE: View universal claims ledger with filtering", async () => {
    // Seed 2 claims
    await InsuranceClaim.create({
      patientId: patientDoc._id,
      insuranceProvider: "BlueCross BlueShield",
      policyNumber: "BCBS-111",
      claimAmount: 1500,
      claimReason: "CT Scan Pelvis",
      status: "SUBMITTED",
      submittedBy: (await User.findOne({ email: "admin@metrohealth.eco" }))._id,
    });

    await InsuranceClaim.create({
      patientId: otherPatientDoc._id,
      insuranceProvider: "Aetna Health",
      policyNumber: "AET-222",
      claimAmount: 2800,
      claimReason: "Cardiac catheterization",
      status: "APPROVED",
      submittedBy: (await User.findOne({ email: "admin@metrohealth.eco" }))._id,
    });

    const res = await request(app)
      .get("/api/v1/insurance/claims")
      .set("Authorization", `Bearer ${insuranceToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 2);

    // Filter by status
    const filterRes = await request(app)
      .get("/api/v1/insurance/claims?status=APPROVED")
      .set("Authorization", `Bearer ${insuranceToken}`);

    assert.equal(filterRes.status, 200);
    assert.equal(filterRes.body.count, 1);
    assert.equal(filterRes.body.claims[0].insuranceProvider, "Aetna Health");
  });

  // Test 3: Insurance employee updates status
  test("INSURANCE_EMPLOYEE: Update claim status along state machine (SUBMITTED -> UNDER_REVIEW -> APPROVED)", async () => {
    const claim = await InsuranceClaim.create({
      patientId: patientDoc._id,
      insuranceProvider: "BlueCross BlueShield",
      policyNumber: "BCBS-111",
      claimAmount: 3000,
      claimReason: "Pre-auth MRI knee",
      status: "SUBMITTED",
      submittedBy: (await User.findOne({ email: "admin@metrohealth.eco" }))._id,
    });

    // 1. Move to UNDER_REVIEW
    const step1 = await request(app)
      .patch(`/api/v1/insurance/claims/${claim._id}/status`)
      .set("Authorization", `Bearer ${insuranceToken}`)
      .send({ status: "UNDER_REVIEW", reviewNotes: "Carrier audit initiated" });

    assert.equal(step1.status, 200);
    assert.equal(step1.body.claim.status, "UNDER_REVIEW");
    assert.equal(step1.body.claim.reviewNotes, "Carrier audit initiated");

    // 2. Move to APPROVED
    const step2 = await request(app)
      .patch(`/api/v1/insurance/claims/${claim._id}/status`)
      .set("Authorization", `Bearer ${insuranceToken}`)
      .send({ status: "APPROVED", reviewNotes: "Full coverage verified by BlueCross" });

    assert.equal(step2.status, 200);
    assert.equal(step2.body.claim.status, "APPROVED");

    // Verify patient insuranceStatus updated to Active & Verified
    const updatedPat = await Patient.findById(patientDoc._id);
    assert.equal(updatedPat.insuranceStatus, "Active & Verified");
  });

  // Test 4: Patient views own insurance
  test("PATIENT: View own insurance summary and personal claims", async () => {
    // Seed 1 claim for Rahul Sharma
    await InsuranceClaim.create({
      patientId: patientDoc._id,
      insuranceProvider: "BlueCross BlueShield",
      policyNumber: "BCBS-9021-8849",
      claimAmount: 1800,
      claimReason: "Physical therapy recovery",
      status: "SUBMITTED",
      submittedBy: (await User.findOne({ email: "admin@metrohealth.eco" }))._id,
    });

    // Seed 1 claim for Elena Morales (should not be in Rahul's list)
    await InsuranceClaim.create({
      patientId: otherPatientDoc._id,
      insuranceProvider: "Aetna Health",
      policyNumber: "AET-777",
      claimAmount: 5000,
      claimReason: "Cardiac catheterization",
      status: "APPROVED",
      submittedBy: (await User.findOne({ email: "admin@metrohealth.eco" }))._id,
    });

    // Patient views own claims via GET /api/v1/insurance/claims
    const claimsRes = await request(app)
      .get("/api/v1/insurance/claims")
      .set("Authorization", `Bearer ${patientToken}`);

    assert.equal(claimsRes.status, 200);
    assert.equal(claimsRes.body.count, 1);
    assert.equal(claimsRes.body.claims[0].claimReason, "Physical therapy recovery");

    // Patient views own patient insurance via GET /api/v1/insurance/patient/:id
    const patRes = await request(app)
      .get(`/api/v1/insurance/patient/${patientDoc._id}`)
      .set("Authorization", `Bearer ${patientToken}`);

    assert.equal(patRes.status, 200);
    assert.equal(patRes.body.patient.name, "Rahul Sharma");
    assert.equal(patRes.body.summary.totalClaims, 1);
    assert.equal(patRes.body.summary.pendingClaims, 1);
    assert.equal(patRes.body.summary.totalClaimedAmount, 1800);
  });

  // Test 5: Patient cannot view others
  test("PATIENT: Blocked from viewing other patient's insurance (403)", async () => {
    // Rahul attempts to query Elena Morales's insurance profile
    const res = await request(app)
      .get(`/api/v1/insurance/patient/${otherPatientDoc._id}`)
      .set("Authorization", `Bearer ${patientToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);

    // Seed claim for Elena
    const elenaClaim = await InsuranceClaim.create({
      patientId: otherPatientDoc._id,
      insuranceProvider: "Aetna Health",
      policyNumber: "AET-777",
      claimAmount: 5000,
      claimReason: "Cardiac catheterization",
      status: "APPROVED",
      submittedBy: (await User.findOne({ email: "admin@metrohealth.eco" }))._id,
    });

    // Rahul attempts to view Elena's specific claim
    const singleRes = await request(app)
      .get(`/api/v1/insurance/claims/${elenaClaim._id}`)
      .set("Authorization", `Bearer ${patientToken}`);

    assert.equal(singleRes.status, 403);
    assert.equal(singleRes.body.success, false);
  });

  // Test 6: Patient cannot create claim or modify status
  test("PATIENT: Blocked from creating claims or modifying claim status (403)", async () => {
    // Attempt claim creation
    const createRes = await request(app)
      .post("/api/v1/insurance/claims")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        patientId: patientDoc._id.toString(),
        insuranceProvider: "BlueCross BlueShield",
        policyNumber: "BCBS-9021-8849",
        claimAmount: 1000,
        claimReason: "Unauthorized direct submission",
      });

    assert.equal(createRes.status, 403);

    // Seed claim
    const claim = await InsuranceClaim.create({
      patientId: patientDoc._id,
      insuranceProvider: "BlueCross BlueShield",
      policyNumber: "BCBS-9021-8849",
      claimAmount: 1000,
      claimReason: "Checkup",
      status: "SUBMITTED",
      submittedBy: (await User.findOne({ email: "admin@metrohealth.eco" }))._id,
    });

    // Attempt status update
    const patchRes = await request(app)
      .patch(`/api/v1/insurance/claims/${claim._id}/status`)
      .set("Authorization", `Bearer ${patientToken}`)
      .send({ status: "APPROVED" });

    assert.equal(patchRes.status, 403);
  });

  // Test 7: Doctor has correct access (view only, cannot update status)
  test("DOCTOR: Can view claims and patient insurance, but blocked from updating status (403)", async () => {
    const claim = await InsuranceClaim.create({
      patientId: patientDoc._id,
      insuranceProvider: "BlueCross BlueShield",
      policyNumber: "BCBS-9021-8849",
      claimAmount: 3200,
      claimReason: "Echocardiogram coverage",
      status: "SUBMITTED",
      submittedBy: (await User.findOne({ email: "admin@metrohealth.eco" }))._id,
    });

    // Doctor can view claims
    const viewRes = await request(app)
      .get("/api/v1/insurance/claims")
      .set("Authorization", `Bearer ${doctorToken}`);
    assert.equal(viewRes.status, 200);
    assert.equal(viewRes.body.count, 1);

    // Doctor can view patient insurance
    const patRes = await request(app)
      .get(`/api/v1/insurance/patient/${patientDoc._id}`)
      .set("Authorization", `Bearer ${doctorToken}`);
    assert.equal(patRes.status, 200);
    assert.equal(patRes.body.patient.name, "Rahul Sharma");

    // Doctor is blocked from approving/updating claim status
    const updateRes = await request(app)
      .patch(`/api/v1/insurance/claims/${claim._id}/status`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ status: "APPROVED" });
    assert.equal(updateRes.status, 403);
  });

  // Test 8: Receptionist has correct access (view only, cannot update status)
  test("RECEPTIONIST: Can view claims and patient insurance, but blocked from updating status (403)", async () => {
    const claim = await InsuranceClaim.create({
      patientId: patientDoc._id,
      insuranceProvider: "BlueCross BlueShield",
      policyNumber: "BCBS-9021-8849",
      claimAmount: 1200,
      claimReason: "Outpatient consult",
      status: "SUBMITTED",
      submittedBy: (await User.findOne({ email: "admin@metrohealth.eco" }))._id,
    });

    // Receptionist can view patient insurance for intake
    const patRes = await request(app)
      .get(`/api/v1/insurance/patient/${patientDoc._id}`)
      .set("Authorization", `Bearer ${receptionistToken}`);
    assert.equal(patRes.status, 200);

    // Receptionist blocked from updating status
    const updateRes = await request(app)
      .patch(`/api/v1/insurance/claims/${claim._id}/status`)
      .set("Authorization", `Bearer ${receptionistToken}`)
      .send({ status: "APPROVED" });
    assert.equal(updateRes.status, 403);
  });

  // Test 9: State machine transitions validation
  test("VALIDATION: Prevent illegal status transitions (e.g. SUBMITTED -> COMPLETED)", async () => {
    const claim = await InsuranceClaim.create({
      patientId: patientDoc._id,
      insuranceProvider: "BlueCross BlueShield",
      policyNumber: "BCBS-9021-8849",
      claimAmount: 2000,
      claimReason: "Wound care",
      status: "SUBMITTED",
      submittedBy: (await User.findOne({ email: "admin@metrohealth.eco" }))._id,
    });

    const res = await request(app)
      .patch(`/api/v1/insurance/claims/${claim._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "COMPLETED" });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Invalid status transition/);
  });

  // Test 10: Validation on required fields
  test("VALIDATION: Reject missing required fields or negative amount (400)", async () => {
    const res = await request(app)
      .post("/api/v1/insurance/claims")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        patientId: patientDoc._id.toString(),
        insuranceProvider: "Aetna",
        // missing policyNumber
        claimAmount: -50, // invalid negative amount
        claimReason: "No", // too short
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  // Test 11: Security: unauthenticated requests blocked
  test("SECURITY: Unauthenticated requests blocked with 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/insurance/claims");
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });
});
