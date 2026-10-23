/**
 * CareOps AI - Appointment Service Layer
 * 
 * Implements business logic for booking consultations, doctor assignments,
 * appointment list scoping, rescheduling, and cancellations.
 */

const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const User = require("../models/User");
const { USER_ROLES } = require("../config/roles");

/**
 * Creates and persists a new appointment record in MongoDB.
 * 
 * @param {object} params
 * @returns {Promise<object>}
 */
async function createAppointment({ payload, requester }) {
  const {
    doctorId,
    doctorName,
    doctorSpecialty,
    date,
    time,
    location = "Pavilion 3 (Metro Health)",
    type = "In-Person Consultation",
    instructions = "Please arrive 15 minutes before scheduled slot.",
    notes = "",
  } = payload;

  if (!doctorName && !doctorId) {
    const error = new Error("Doctor selection is required");
    error.statusCode = 400;
    throw error;
  }

  if (!date || !time) {
    const error = new Error("Preferred appointment date and time are required");
    error.statusCode = 400;
    throw error;
  }

  // 1. Resolve Doctor
  let doctorDoc = null;
  if (doctorId) {
    doctorDoc = await Doctor.findById(doctorId);
  }
  if (!doctorDoc && doctorName) {
    doctorDoc = await Doctor.findOne({
      $or: [
        { name: doctorName.trim() },
        { name: new RegExp(doctorName.trim(), "i") },
      ],
    });
  }

  const resolvedDoctorName = doctorDoc ? doctorDoc.name : doctorName.trim();
  const resolvedDoctorSpecialty = doctorDoc
    ? doctorDoc.specialization || doctorDoc.department
    : doctorSpecialty || "General Medicine";

  // 2. Resolve Patient info based on requester
  let patientName = payload.patientName || requester.name;
  let patientEmail = payload.patientEmail || requester.email;
  let patientPhone = payload.patientPhone || requester.phone || "";
  let patientUserId = requester.id;
  let patientId = payload.patientId || null;
  let mrn = payload.mrn || "";

  // Attempt lookup in Patient collection
  const patientProfile = await Patient.findOne({
    $or: [
      { userId: requester.id },
      { email: requester.email.toLowerCase() },
      ...(mrn ? [{ mrn }] : []),
    ],
  });

  if (patientProfile) {
    patientId = patientProfile._id;
    patientName = patientProfile.name || patientName;
    patientEmail = patientProfile.email || patientEmail;
    patientPhone = patientProfile.phone || patientPhone;
    mrn = patientProfile.mrn || mrn;

    // Associate patient with doctor roster if doctor profile exists
    if (doctorDoc && !doctorDoc.assignedPatients.includes(patientProfile._id.toString())) {
      doctorDoc.assignedPatients.push(patientProfile._id.toString());
      await doctorDoc.save();
    }
  }

  // 3. Create Appointment Document
  const newAppointment = new Appointment({
    patientId,
    patientUserId,
    patientName: patientName.trim(),
    patientEmail: (patientEmail || "").toLowerCase().trim(),
    patientPhone: patientPhone.trim(),
    mrn: mrn || `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
    doctorId: doctorDoc ? doctorDoc._id : null,
    doctorName: resolvedDoctorName,
    doctorSpecialty: resolvedDoctorSpecialty,
    date: date.trim(),
    time: time.trim(),
    location: location.trim(),
    type: type.trim(),
    status: payload.status || "confirmed",
    instructions: instructions.trim(),
    notes: notes ? notes.trim() : "",
  });

  await newAppointment.save();

  return newAppointment.toJSON();
}

/**
 * Retrieves appointments with role-scoped boundaries.
 * 
 * @param {object} params
 * @returns {Promise<Array<object>>}
 */
async function listAppointments({ requester, doctorName, date, status }) {
  const query = {};

  if (requester.role === USER_ROLES.PATIENT) {
    query.$or = [
      { patientUserId: requester.id },
      { patientEmail: requester.email.toLowerCase() },
    ];
  } else if (requester.role === USER_ROLES.DOCTOR) {
    query.$or = [
      { doctorName: requester.name },
      { doctorName: new RegExp(requester.name, "i") },
    ];
  }

  if (doctorName && doctorName.trim()) {
    query.doctorName = new RegExp(doctorName.trim(), "i");
  }

  if (date && date.trim()) {
    query.date = date.trim();
  }

  if (status && status.trim()) {
    query.status = status.trim().toLowerCase();
  }

  const appointments = await Appointment.find(query).sort({ createdAt: -1 });

  return appointments.map((a) => a.toJSON());
}

/**
 * Updates an appointment (rescheduling, status change, notes).
 * 
 * @param {object} params
 * @returns {Promise<object>}
 */
async function updateAppointment({ id, updates, requester }) {
  if (!id) {
    const error = new Error("Appointment ID is required");
    error.statusCode = 400;
    throw error;
  }

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    const error = new Error("Appointment not found");
    error.statusCode = 404;
    throw error;
  }

  // Patient can only modify their own appointments
  if (requester.role === USER_ROLES.PATIENT) {
    const isOwn =
      (appointment.patientUserId && appointment.patientUserId.toString() === requester.id) ||
      (appointment.patientEmail && appointment.patientEmail.toLowerCase() === requester.email.toLowerCase());

    if (!isOwn) {
      const error = new Error("You do not have permission to modify this appointment");
      error.statusCode = 403;
      throw error;
    }

    if (updates.date) appointment.date = updates.date.trim();
    if (updates.time) appointment.time = updates.time.trim();
    if (updates.status && ["rescheduled", "cancelled"].includes(updates.status)) {
      appointment.status = updates.status;
    }
  } else {
    // Doctors, Receptionists, Admins can update any fields
    if (updates.date) appointment.date = updates.date.trim();
    if (updates.time) appointment.time = updates.time.trim();
    if (updates.status) appointment.status = updates.status;
    if (updates.location) appointment.location = updates.location.trim();
    if (updates.notes) appointment.notes = updates.notes.trim();
  }

  await appointment.save();

  return appointment.toJSON();
}

/**
 * Cancels or removes an appointment.
 * 
 * @param {object} params
 * @returns {Promise<boolean>}
 */
async function deleteAppointment({ id, requester }) {
  if (!id) {
    const error = new Error("Appointment ID is required");
    error.statusCode = 400;
    throw error;
  }

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    const error = new Error("Appointment not found");
    error.statusCode = 404;
    throw error;
  }

  if (requester.role === USER_ROLES.PATIENT) {
    const isOwn =
      (appointment.patientUserId && appointment.patientUserId.toString() === requester.id) ||
      (appointment.patientEmail && appointment.patientEmail.toLowerCase() === requester.email.toLowerCase());

    if (!isOwn) {
      const error = new Error("You do not have permission to delete this appointment");
      error.statusCode = 403;
      throw error;
    }
  }

  appointment.status = "cancelled";
  await appointment.save();

  return true;
}

module.exports = {
  createAppointment,
  listAppointments,
  updateAppointment,
  deleteAppointment,
};
