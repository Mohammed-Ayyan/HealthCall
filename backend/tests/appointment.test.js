const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../app");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const { USER_ROLES } = require("../config/roles");

let mongoServer;
let patientToken;
let doctorToken;

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
  await Appointment.deleteMany({});

  // 1. Create Patient
  const patientRes = await request(app)
    .post("/api/v1/auth/register")
    .send({
      name: "Rahul Sharma",
      email: "rahul.sharma@email.com",
      password: "Password123!",
      role: USER_ROLES.PATIENT,
      phone: "+15553498812",
      department: "Patient Access",
    });
  patientToken = patientRes.body.token;

  // 2. Create Doctor
  const docRes = await request(app)
    .post("/api/v1/auth/register")
    .send({
      name: "Dr. Ayyan Khan",
      email: "dr.ayyan@metrohealth.eco",
      password: "Password123!",
      role: USER_ROLES.DOCTOR,
      phone: "+15557492100",
      department: "Cardiology",
    });
  doctorToken = docRes.body.token;
});

describe("CareOps AI - Appointments Management Integration", () => {
  test("Patient: Book a real appointment and persist in MongoDB", async () => {
    const res = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        doctorName: "Dr. Ayyan Khan",
        doctorSpecialty: "Cardiology",
        date: "2026-10-20",
        time: "10:30 AM",
        location: "Pavilion 3, Suite 410",
        type: "Cardiology Follow-Up",
        instructions: "Please arrive 15 minutes early.",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.appointment.patientName, "Rahul Sharma");
    assert.equal(res.body.appointment.doctorName, "Dr. Ayyan Khan");

    // Verify in DB
    const inDb = await Appointment.findById(res.body.appointment.id);
    assert.ok(inDb);
    assert.equal(inDb.doctorName, "Dr. Ayyan Khan");
  });

  test("Patient: View list of booked appointments", async () => {
    await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        doctorName: "Dr. Ayyan Khan",
        doctorSpecialty: "Cardiology",
        date: "2026-10-20",
        time: "10:30 AM",
      });

    const res = await request(app)
      .get("/api/v1/appointments")
      .set("Authorization", `Bearer ${patientToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.appointments.length, 1);
    assert.equal(res.body.appointments[0].doctorName, "Dr. Ayyan Khan");
  });

  test("Doctor: View appointments assigned to doctor", async () => {
    await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        doctorName: "Dr. Ayyan Khan",
        doctorSpecialty: "Cardiology",
        date: "2026-10-20",
        time: "10:30 AM",
      });

    const res = await request(app)
      .get("/api/v1/appointments")
      .set("Authorization", `Bearer ${doctorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.appointments.length, 1);
    assert.equal(res.body.appointments[0].patientName, "Rahul Sharma");
  });

  test("Patient: Update/reschedule appointment", async () => {
    const createRes = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        doctorName: "Dr. Ayyan Khan",
        doctorSpecialty: "Cardiology",
        date: "2026-10-20",
        time: "10:30 AM",
      });

    const aptId = createRes.body.appointment.id;

    const res = await request(app)
      .patch(`/api/v1/appointments/${aptId}`)
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        date: "2026-10-22",
        time: "02:30 PM",
        status: "rescheduled",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.appointment.date, "2026-10-22");
    assert.equal(res.body.appointment.time, "02:30 PM");
    assert.equal(res.body.appointment.status, "rescheduled");
  });

  test("Patient: Cancel appointment", async () => {
    const createRes = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        doctorName: "Dr. Ayyan Khan",
        doctorSpecialty: "Cardiology",
        date: "2026-10-20",
        time: "10:30 AM",
      });

    const aptId = createRes.body.appointment.id;

    const res = await request(app)
      .delete(`/api/v1/appointments/${aptId}`)
      .set("Authorization", `Bearer ${patientToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const check = await Appointment.findById(aptId);
    assert.equal(check.status, "cancelled");
  });
});
