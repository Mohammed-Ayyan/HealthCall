/**
 * CareOps AI - Patient Management Service Layer
 * 
 * Implements business logic for patient registration, linked User provisioning,
 * RBAC query scoping, patient privacy guards, and soft deactivation.
 */

const Patient = require("../models/Patient");
const User = require("../models/User");
const { USER_ROLES } = require("../config/roles");

/**
 * Registers a new patient.
 * Automatically links or creates the corresponding User account with role 'PATIENT'.
 * Prevents duplicate patient profiles.
 * 
 * @param {object} params
 * @returns {Promise<object>}
 */
async function createPatient({ payload, creatorUser }) {
  const {
    name,
    email,
    phone,
    dateOfBirth = "",
    gender = "",
    address = "",
    bloodGroup = "",
    emergencyContact = "",
    medicalSummary = "",
    department = "",
    assignedDoctorId = null,
    assignedDoctorName = "",
    insuranceProvider = "BlueCross Premier PPO",
    insuranceStatus = "Active & Verified",
    password,
  } = payload;

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();

  // 1. Check for existing patient profile
  const existingPatient = await Patient.findOne({
    $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
  });

  if (existingPatient) {
    const error = new Error("Patient profile already exists with this email or phone number");
    error.statusCode = 409;
    throw error;
  }

  // 2. Resolve or provision linked User account
  let linkedUser = await User.findOne({ email: normalizedEmail });

  if (!linkedUser) {
    // Generate secure temporary password for new patient user
    const temporaryPassword = password || `CareOps@${Math.floor(100000 + Math.random() * 900000)}`;

    linkedUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      role: USER_ROLES.PATIENT,
      password: temporaryPassword,
      department: department || "",
      status: "ACTIVE",
    });

    await linkedUser.save();
  }

  // 3. Create Patient Profile
  const patient = new Patient({
    userId: linkedUser._id,
    name: name.trim(),
    email: normalizedEmail,
    phone: normalizedPhone,
    dateOfBirth,
    gender,
    address,
    bloodGroup,
    emergencyContact,
    medicalSummary,
    department,
    assignedDoctorId: assignedDoctorId || null,
    assignedDoctorName: assignedDoctorName || "",
    insuranceProvider,
    insuranceStatus,
    status: "ACTIVE",
  });

  await patient.save();

  return patient.toJSON();
}

/**
 * Retrieves hospital patients with role-based scoping and filtering.
 * - DOCTOR: Only view assigned patients.
 * - DEPARTMENT_MANAGER: Only view patients in their department.
 * - PATIENT: Blocked from universal listing (403).
 * - ADMIN, RECEPTIONIST, INSURANCE_EMPLOYEE: Full directory visibility.
 * 
 * @param {object} params
 * @returns {Promise<Array<object>>}
 */
async function listPatients({
  requester,
  search,
  gender,
  bloodGroup,
  status,
  department,
  startDate,
  endDate,
}) {
  // 1. Patient role is blocked from listing all patients
  if (requester.role === USER_ROLES.PATIENT) {
    const error = new Error("Patients are not authorized to view the patient directory");
    error.statusCode = 403;
    throw error;
  }

  const query = {};

  // 2. Doctor scoping: only view assigned patients
  if (requester.role === USER_ROLES.DOCTOR) {
    query.$or = [
      { assignedDoctorId: requester.id },
      { assignedDoctorName: requester.name },
      { assignedDoctorName: new RegExp(requester.name, "i") },
    ];
  }

  // 3. Department Manager scoping: only view department-connected patients
  if (requester.role === USER_ROLES.DEPARTMENT_MANAGER) {
    if (requester.department) {
      query.department = new RegExp(`^${requester.department.trim()}$`, "i");
    }
  } else if (department && department.trim()) {
    query.department = new RegExp(`^${department.trim()}$`, "i");
  }

  // 4. Gender filter
  if (gender && gender.trim()) {
    query.gender = new RegExp(`^${gender.trim()}$`, "i");
  }

  // 5. Blood Group filter
  if (bloodGroup && bloodGroup.trim()) {
    query.bloodGroup = bloodGroup.trim().toUpperCase();
  }

  // 6. Status filter
  if (status && status.trim()) {
    query.status = status.trim().toUpperCase();
  }

  // 7. Date range filter (createdAt or dateOfBirth)
  if (startDate || endDate) {
    const dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);
    query.createdAt = dateQuery;
  }

  // 8. Search query (supports name, phone, email, and MRN)
  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term, "i");

    const searchConditions = [
      { name: regex },
      { phone: regex },
      { email: regex },
      { mrn: regex },
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchConditions }];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  const patients = await Patient.find(query).sort({ createdAt: -1 });

  return patients.map((p) => p.toJSON());
}

/**
 * Retrieves a single patient by ID with privacy protection and role checks.
 * - PATIENT: Can only view their own record.
 * - DOCTOR: Can only view assigned patients.
 * - DEPARTMENT_MANAGER: Can only view patients in their department.
 * - ADMIN, RECEPTIONIST, INSURANCE_EMPLOYEE: Permitted.
 * 
 * @param {object} params
 * @returns {Promise<object>}
 */
async function getPatientById({ patientId, requester }) {
  if (!patientId) {
    const error = new Error("Patient ID is required");
    error.statusCode = 400;
    throw error;
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  // Check role-based access & patient privacy
  if (requester.role === USER_ROLES.PATIENT) {
    const isOwn =
      (patient.userId && patient.userId.toString() === requester.id) ||
      patient.email.toLowerCase() === requester.email.toLowerCase();

    if (!isOwn) {
      const error = new Error("You do not have permission to access another patient's medical record");
      error.statusCode = 403;
      throw error;
    }
  } else if (requester.role === USER_ROLES.DOCTOR) {
    let hasAppointment = false;
    try {
      const Appointment = require("../models/Appointment");
      if (requester.name) {
        hasAppointment = await Appointment.exists({
          $or: [
            { doctorName: new RegExp(requester.name, "i"), patientId: patient._id },
            { doctorName: new RegExp(requester.name, "i"), patientName: new RegExp(patient.name, "i") },
          ],
        });
      }
    } catch {
      // ignore
    }

    const isAssigned =
      hasAppointment ||
      (patient.assignedDoctorId && patient.assignedDoctorId.toString() === requester.id) ||
      (patient.assignedDoctorName &&
        requester.name &&
        patient.assignedDoctorName.toLowerCase().includes(requester.name.toLowerCase()));

    if (!isAssigned) {
      const error = new Error("You do not have permission to view unassigned patient records");
      error.statusCode = 403;
      throw error;
    }
  } else if (requester.role === USER_ROLES.DEPARTMENT_MANAGER) {
    const managerDept = (requester.department || "").toLowerCase().trim();
    const patientDept = (patient.department || "").toLowerCase().trim();

    if (!managerDept || managerDept !== patientDept) {
      const error = new Error("Patient record is outside your department operations");
      error.statusCode = 403;
      throw error;
    }
  }

  return patient.toJSON();
}

/**
 * Retrieves the authenticated patient's own profile.
 * @param {object} params
 * @returns {Promise<object>}
 */
async function getMyProfile({ requester }) {
  let patient = await Patient.findOne({
    $or: [
      { userId: requester.id },
      { email: requester.email.toLowerCase() },
    ],
  });

  // If user has PATIENT role but profile was not created yet, provision initial profile
  if (!patient && requester.role === USER_ROLES.PATIENT) {
    patient = new Patient({
      userId: requester.id,
      name: requester.name,
      email: requester.email.toLowerCase(),
      phone: requester.phone && requester.phone.trim() ? requester.phone.trim() : "+1 (555) 000-0000",
      department: requester.department || "General Medicine",
      status: "ACTIVE",
    });
    await patient.save();
  }

  if (!patient) {
    const error = new Error("Patient profile not found for the authenticated user");
    error.statusCode = 404;
    throw error;
  }

  return patient.toJSON();
}

/**
 * Updates patient information with role-based field restrictions.
 * - PATIENT: Can update phone, address, emergencyContact, dateOfBirth, gender, bloodGroup.
 * - RECEPTIONIST: Can update demographics, contact, insurance. Cannot edit medicalSummary or status.
 * - DOCTOR: Can update medicalSummary for assigned patients.
 * - ADMIN: Full update authority.
 * 
 * @param {object} params
 * @returns {Promise<object>}
 */
async function updatePatient({ patientId, payload, requester }) {
  if (!patientId) {
    const error = new Error("Patient ID is required");
    error.statusCode = 400;
    throw error;
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  // 1. Role Authorization Checks
  if (requester.role === USER_ROLES.PATIENT) {
    const isOwn =
      (patient.userId && patient.userId.toString() === requester.id) ||
      patient.email.toLowerCase() === requester.email.toLowerCase();

    if (!isOwn) {
      const error = new Error("You do not have permission to update another patient's profile");
      error.statusCode = 403;
      throw error;
    }

    if (payload.medicalSummary !== undefined || payload.status !== undefined || payload.assignedDoctorId !== undefined) {
      const error = new Error("Patients cannot modify medical summary, status, or clinician assignments");
      error.statusCode = 403;
      throw error;
    }
  } else if (requester.role === USER_ROLES.DOCTOR) {
    const isAssigned =
      (patient.assignedDoctorId && patient.assignedDoctorId.toString() === requester.id) ||
      (patient.assignedDoctorName &&
        requester.name &&
        patient.assignedDoctorName.toLowerCase().includes(requester.name.toLowerCase()));

    if (!isAssigned) {
      const error = new Error("Doctors can only update assigned patient records");
      error.statusCode = 403;
      throw error;
    }
  } else if (requester.role === USER_ROLES.RECEPTIONIST) {
    if (payload.medicalSummary !== undefined || payload.status !== undefined) {
      const error = new Error("Receptionists cannot modify medical summaries or deactivate patient accounts");
      error.statusCode = 403;
      throw error;
    }
  } else if (requester.role !== USER_ROLES.ADMIN) {
    const error = new Error("You do not have permission to update patient records");
    error.statusCode = 403;
    throw error;
  }

  // 2. Apply Permitted Updates
  const allowedFields = [
    "name",
    "phone",
    "address",
    "emergencyContact",
    "dateOfBirth",
    "gender",
    "bloodGroup",
    "insuranceProvider",
    "insuranceStatus",
  ];

  if (requester.role === USER_ROLES.DOCTOR || requester.role === USER_ROLES.ADMIN) {
    allowedFields.push("medicalSummary");
  }

  if (requester.role === USER_ROLES.ADMIN) {
    allowedFields.push("status", "department", "assignedDoctorId", "assignedDoctorName");
  }

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      patient[field] = payload[field];
    }
  }

  // Sync basic phone/name updates to linked User account if applicable
  if (patient.userId && (payload.name || payload.phone)) {
    const userUpdates = {};
    if (payload.name) userUpdates.name = payload.name;
    if (payload.phone) userUpdates.phone = payload.phone;
    await User.findByIdAndUpdate(patient.userId, userUpdates);
  }

  await patient.save();

  return patient.toJSON();
}

/**
 * Soft deletes a patient by setting status = 'INACTIVE'.
 * Preserves historical clinical records.
 * Only ADMIN is authorized.
 * 
 * @param {object} params
 * @returns {Promise<object>}
 */
async function deletePatient({ patientId, requester }) {
  if (requester.role !== USER_ROLES.ADMIN) {
    const error = new Error("Only administrators are authorized to deactivate patient records");
    error.statusCode = 403;
    throw error;
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  patient.status = "INACTIVE";
  await patient.save();

  return patient.toJSON();
}

module.exports = {
  createPatient,
  listPatients,
  getPatientById,
  getMyProfile,
  updatePatient,
  deletePatient,
};
