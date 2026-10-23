/**
 * CareOps AI - Doctor Management Service Layer
 * 
 * Handles doctor profile creation, User link validation, role-scoped queries,
 * patient roster assignment, queue retrieval, availability management,
 * and clinical note recording.
 */

const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Patient = require("../models/Patient");
const { USER_ROLES } = require("../config/roles");

/**
 * Creates a doctor profile linked to an existing User with role DOCTOR.
 * Prevents duplicate doctor profiles.
 * 
 * @param {object} params
 * @returns {Promise<object>}
 */
async function createDoctorProfile({ payload, creatorUser }) {
  const {
    userId,
    specialization,
    department,
    qualification = "MBBS, MD",
    experience = 5,
    employeeId,
    availability,
  } = payload;

  // 1. Verify User exists
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("Linked User account not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Verify User has DOCTOR role
  if (user.role !== USER_ROLES.DOCTOR) {
    const error = new Error("User role must be DOCTOR to create a doctor profile");
    error.statusCode = 400;
    throw error;
  }

  // 3. Prevent duplicate doctor profiles
  const existingProfile = await Doctor.findOne({
    $or: [{ userId: user._id }, { email: user.email.toLowerCase() }],
  });

  if (existingProfile) {
    const error = new Error("Doctor profile already exists for this user account");
    error.statusCode = 409;
    throw error;
  }

  // 4. Create Doctor Profile
  const doctor = new Doctor({
    userId: user._id,
    name: user.name,
    email: user.email.toLowerCase(),
    phone: user.phone || "",
    specialization: specialization.trim(),
    department: (department || user.department || "General Surgery").trim(),
    qualification: qualification.trim(),
    experience: Number(experience) || 5,
    employeeId: employeeId ? employeeId.trim().toUpperCase() : undefined,
    availability: availability || undefined,
    assignedPatients: [],
    status: "ACTIVE",
  });

  await doctor.save();

  return doctor.toJSON();
}

/**
 * Retrieves doctors matching query filters with role-based scoping.
 * - DEPARTMENT_MANAGER: Only view doctors in manager's department.
 * - ADMIN, RECEPTIONIST, PATIENT: Universal doctor listing.
 * - INSURANCE_EMPLOYEE: Blocked (403).
 * 
 * @param {object} params
 * @returns {Promise<Array<object>>}
 */
async function listDoctors({ requester, specialization, department, status, search }) {
  // Insurance employees cannot access doctor management
  if (requester.role === USER_ROLES.INSURANCE_EMPLOYEE) {
    const error = new Error("Insurance employees are not authorized to access doctor management");
    error.statusCode = 403;
    throw error;
  }

  const query = {};

  // 1. Department Manager scoping
  if (requester.role === USER_ROLES.DEPARTMENT_MANAGER) {
    if (requester.department) {
      query.department = new RegExp(`^${requester.department.trim()}$`, "i");
    }
  } else if (department && department.trim()) {
    query.department = new RegExp(`^${department.trim()}$`, "i");
  }

  // 2. Specialization filter
  if (specialization && specialization.trim()) {
    query.specialization = new RegExp(`^${specialization.trim()}$`, "i");
  }

  // 3. Status filter
  if (status && status.trim()) {
    query.status = status.trim().toUpperCase();
  }

  // 4. Multi-field search
  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term, "i");
    query.$or = [
      { name: regex },
      { email: regex },
      { specialization: regex },
      { department: regex },
      { employeeId: regex },
    ];
  }

  const doctors = await Doctor.find(query).sort({ createdAt: -1 });

  return doctors.map((d) => d.toJSON());
}

/**
 * Retrieves single doctor details by ID.
 * @param {object} params
 * @returns {Promise<object>}
 */
async function getDoctorById({ doctorId, requester }) {
  if (requester.role === USER_ROLES.INSURANCE_EMPLOYEE) {
    const error = new Error("Insurance employees are not authorized to access doctor management");
    error.statusCode = 403;
    throw error;
  }

  if (!doctorId) {
    const error = new Error("Doctor ID is required");
    error.statusCode = 400;
    throw error;
  }

  let doctor = null;
  // Try by ObjectId, fallback to userId or employeeId
  if (doctorId.match(/^[0-9a-fA-F]{24}$/)) {
    doctor = await Doctor.findOne({
      $or: [{ _id: doctorId }, { userId: doctorId }],
    });
  } else {
    doctor = await Doctor.findOne({
      $or: [{ employeeId: doctorId.toUpperCase() }, { email: doctorId.toLowerCase() }],
    });
  }

  if (!doctor) {
    const error = new Error("Doctor profile not found");
    error.statusCode = 404;
    throw error;
  }

  // Department Manager scoping
  if (requester.role === USER_ROLES.DEPARTMENT_MANAGER) {
    const mgrDept = (requester.department || "").toLowerCase().trim();
    const docDept = (doctor.department || "").toLowerCase().trim();
    if (!mgrDept || mgrDept !== docDept) {
      const error = new Error("Doctor is outside your department operations");
      error.statusCode = 403;
      throw error;
    }
  }

  return doctor.toJSON();
}

/**
 * Retrieves the authenticated doctor's own profile.
 * @param {object} params
 * @returns {Promise<object>}
 */
async function getMyDoctorProfile({ requester }) {
  let doctor = await Doctor.findOne({
    $or: [{ userId: requester.id }, { email: requester.email.toLowerCase() }],
  });

  // If user has DOCTOR role but profile document not created yet, auto-provision
  if (!doctor && requester.role === USER_ROLES.DOCTOR) {
    doctor = new Doctor({
      userId: requester.id,
      name: requester.name,
      email: requester.email.toLowerCase(),
      phone: requester.phone || "",
      specialization: "General Medicine",
      department: requester.department || "Clinical Care",
      qualification: "MBBS, MD",
      experience: 5,
      status: "ACTIVE",
    });
    await doctor.save();
  }

  if (!doctor) {
    const error = new Error("Doctor profile not found for the authenticated user");
    error.statusCode = 404;
    throw error;
  }

  return doctor.toJSON();
}

/**
 * Updates doctor profile information.
 * - ADMIN: Update everything.
 * - DOCTOR: Update own availability, phone, qualification, basic info.
 * 
 * @param {object} params
 * @returns {Promise<object>}
 */
async function updateDoctor({ doctorId, payload, requester }) {
  if (!doctorId) {
    const error = new Error("Doctor ID is required");
    error.statusCode = 400;
    throw error;
  }

  let doctor = null;
  if (doctorId.match(/^[0-9a-fA-F]{24}$/)) {
    doctor = await Doctor.findOne({
      $or: [{ _id: doctorId }, { userId: doctorId }],
    });
  } else {
    doctor = await Doctor.findOne({ employeeId: doctorId.toUpperCase() });
  }

  if (!doctor) {
    const error = new Error("Doctor profile not found");
    error.statusCode = 404;
    throw error;
  }

  // Role authorization
  if (requester.role === USER_ROLES.DOCTOR) {
    const isOwn =
      doctor.userId.toString() === requester.id ||
      doctor.email.toLowerCase() === requester.email.toLowerCase();

    if (!isOwn) {
      const error = new Error("Doctors cannot modify another clinician's profile");
      error.statusCode = 403;
      throw error;
    }
  } else if (requester.role !== USER_ROLES.ADMIN) {
    const error = new Error("You do not have permission to update doctor profiles");
    error.statusCode = 403;
    throw error;
  }

  // Apply fields
  const allowedFields = ["phone", "qualification", "availability", "specialization", "experience"];

  if (requester.role === USER_ROLES.ADMIN) {
    allowedFields.push("department", "status", "name");
  }

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      doctor[field] = payload[field];
    }
  }

  // Sync basic phone/name updates to linked User account
  if (doctor.userId && (payload.name || payload.phone || (requester.role === USER_ROLES.ADMIN && payload.department))) {
    const userUpdates = {};
    if (payload.name) userUpdates.name = payload.name;
    if (payload.phone) userUpdates.phone = payload.phone;
    if (payload.department) userUpdates.department = payload.department;
    await User.findByIdAndUpdate(doctor.userId, userUpdates);
  }

  await doctor.save();

  return doctor.toJSON();
}

/**
 * Assigns a patient to a doctor's care roster.
 * Updates both Doctor.assignedPatients and Patient.assignedDoctorId.
 * 
 * @param {object} params
 * @returns {Promise<object>}
 */
async function assignPatientToDoctor({ doctorId, patientId, requester }) {
  if (requester.role !== USER_ROLES.ADMIN && requester.role !== USER_ROLES.DOCTOR) {
    const error = new Error("Only administrators and clinicians can assign patients to doctors");
    error.statusCode = 403;
    throw error;
  }

  let doctor = null;
  if (doctorId.match(/^[0-9a-fA-F]{24}$/)) {
    doctor = await Doctor.findOne({
      $or: [{ _id: doctorId }, { userId: doctorId }],
    });
  } else {
    doctor = await Doctor.findOne({ employeeId: doctorId.toUpperCase() });
  }

  if (!doctor) {
    const error = new Error("Doctor profile not found");
    error.statusCode = 404;
    throw error;
  }

  // Doctor can only assign to self unless admin
  if (requester.role === USER_ROLES.DOCTOR) {
    const isOwn =
      doctor.userId.toString() === requester.id ||
      doctor.email.toLowerCase() === requester.email.toLowerCase();

    if (!isOwn) {
      const error = new Error("Doctors cannot assign patients to other clinicians");
      error.statusCode = 403;
      throw error;
    }
  }

  // Verify patient exists
  const patient = await Patient.findById(patientId);
  if (!patient) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  // Prevent duplicate assignment in doctor list
  const patientIdStr = patient._id.toString();
  const alreadyAssigned = doctor.assignedPatients.some(
    (p) => p && p.toString() === patientIdStr
  );

  if (!alreadyAssigned) {
    doctor.assignedPatients.push(patient._id);
    await doctor.save();
  }

  // Update patient record
  patient.assignedDoctorId = doctor.userId || doctor._id;
  patient.assignedDoctorName = doctor.name;
  if (doctor.department) {
    patient.department = doctor.department;
  }
  await patient.save();

  return doctor.toJSON();
}

/**
 * Retrieves the patient queue assigned to a doctor.
 * 
 * @param {object} params
 * @returns {Promise<Array<object>>}
 */
async function getDoctorPatientQueue({ doctorId, requester }) {
  let doctor = null;
  if (doctorId.match(/^[0-9a-fA-F]{24}$/)) {
    doctor = await Doctor.findOne({
      $or: [{ _id: doctorId }, { userId: doctorId }],
    });
  } else {
    doctor = await Doctor.findOne({ employeeId: doctorId.toUpperCase() });
  }

  if (!doctor) {
    const error = new Error("Doctor profile not found");
    error.statusCode = 404;
    throw error;
  }

  // Scoping check
  if (requester.role === USER_ROLES.DOCTOR) {
    const isOwn =
      doctor.userId.toString() === requester.id ||
      doctor.email.toLowerCase() === requester.email.toLowerCase();

    if (!isOwn) {
      const error = new Error("Doctors cannot view another clinician's patient queue");
      error.statusCode = 403;
      throw error;
    }
  } else if (requester.role !== USER_ROLES.ADMIN) {
    const error = new Error("You do not have permission to view doctor patient queues");
    error.statusCode = 403;
    throw error;
  }

  // Query patients linked to this doctor
  const query = {
    $or: [
      { assignedDoctorId: doctor.userId },
      { assignedDoctorId: doctor._id },
      { assignedDoctorName: doctor.name },
      { _id: { $in: doctor.assignedPatients } },
    ],
    status: "ACTIVE",
  };

  const patients = await Patient.find(query).sort({ updatedAt: -1 });

  return patients.map((p) => p.toJSON());
}

/**
 * Updates a doctor's consultation availability schedule.
 * 
 * @param {object} params
 * @returns {Promise<Array<object>>}
 */
async function updateDoctorAvailability({ doctorId, availability, requester }) {
  let doctor = null;
  if (doctorId.match(/^[0-9a-fA-F]{24}$/)) {
    doctor = await Doctor.findOne({
      $or: [{ _id: doctorId }, { userId: doctorId }],
    });
  } else {
    doctor = await Doctor.findOne({ employeeId: doctorId.toUpperCase() });
  }

  if (!doctor) {
    const error = new Error("Doctor profile not found");
    error.statusCode = 404;
    throw error;
  }

  // Scoping check
  if (requester.role === USER_ROLES.DOCTOR) {
    const isOwn =
      doctor.userId.toString() === requester.id ||
      doctor.email.toLowerCase() === requester.email.toLowerCase();

    if (!isOwn) {
      const error = new Error("Doctors cannot update another clinician's availability");
      error.statusCode = 403;
      throw error;
    }
  } else if (requester.role !== USER_ROLES.ADMIN) {
    const error = new Error("You do not have permission to update doctor availability");
    error.statusCode = 403;
    throw error;
  }

  doctor.availability = availability;
  await doctor.save();

  return doctor.availability;
}

/**
 * Adds a clinical follow-up note to a patient's medical record.
 * 
 * @param {object} params
 * @returns {Promise<object>}
 */
async function addClinicalNote({ doctorId, patientId, note, requester }) {
  if (requester.role !== USER_ROLES.DOCTOR && requester.role !== USER_ROLES.ADMIN) {
    const error = new Error("Only clinicians and administrators can record clinical notes");
    error.statusCode = 403;
    throw error;
  }

  let doctor = null;
  if (doctorId.match(/^[0-9a-fA-F]{24}$/)) {
    doctor = await Doctor.findOne({
      $or: [{ _id: doctorId }, { userId: doctorId }],
    });
  } else {
    doctor = await Doctor.findOne({ employeeId: doctorId.toUpperCase() });
  }

  if (!doctor) {
    const error = new Error("Doctor profile not found");
    error.statusCode = 404;
    throw error;
  }

  // If Doctor, verify they are adding to self or assigned
  if (requester.role === USER_ROLES.DOCTOR) {
    const isOwn =
      doctor.userId.toString() === requester.id ||
      doctor.email.toLowerCase() === requester.email.toLowerCase();

    if (!isOwn) {
      const error = new Error("Clinicians can only record notes under their own clinical profile");
      error.statusCode = 403;
      throw error;
    }
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  // Append note to patient medicalSummary
  const formattedNote = `[${doctor.name} - ${new Date().toLocaleDateString()}]: ${note.trim()}`;
  patient.medicalSummary = patient.medicalSummary
    ? `${patient.medicalSummary}\n${formattedNote}`
    : formattedNote;

  // Ensure patient is on doctor roster
  const patientIdStr = patient._id.toString();
  const alreadyOnRoster = doctor.assignedPatients.some(
    (p) => p && p.toString() === patientIdStr
  );
  if (!alreadyOnRoster) {
    doctor.assignedPatients.push(patient._id);
    await doctor.save();
  }

  await patient.save();

  return {
    note: formattedNote,
    patient: patient.toJSON(),
  };
}

module.exports = {
  createDoctorProfile,
  listDoctors,
  getDoctorById,
  getMyDoctorProfile,
  updateDoctor,
  assignPatientToDoctor,
  getDoctorPatientQueue,
  updateDoctorAvailability,
  addClinicalNote,
};
