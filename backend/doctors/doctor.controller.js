/**
 * CareOps AI - Doctor Management Controller Layer
 * 
 * HTTP request handlers for /api/v1/doctors endpoints.
 */

const doctorService = require("./doctor.service");
const {
  validateCreateDoctor,
  validateUpdateDoctor,
  validateAvailabilityUpdate,
  validateAssignPatient,
  validateAddNote,
} = require("./doctor.validation");

/**
 * POST /api/v1/doctors
 * Creates a new doctor profile linked to an existing User.
 * Authorized: ADMIN ONLY
 */
async function createDoctor(req, res, next) {
  try {
    const validation = validateCreateDoctor(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const doctor = await doctorService.createDoctorProfile({
      payload: req.body,
      creatorUser: req.user,
    });

    return res.status(201).json({
      success: true,
      message: "Doctor profile created successfully",
      doctor,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * GET /api/v1/doctors
 * Retrieves all doctors matching filters (specialization, department, status, search).
 * Authorized: ADMIN, RECEPTIONIST, DEPARTMENT_MANAGER, PATIENT
 */
async function getDoctors(req, res, next) {
  try {
    const { specialization, department, status, search } = req.query;

    const doctors = await doctorService.listDoctors({
      requester: req.user,
      specialization,
      department,
      status,
      search,
    });

    return res.status(200).json({
      success: true,
      doctors,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * GET /api/v1/doctors/me
 * Retrieves authenticated doctor's own profile.
 * Authorized: DOCTOR
 */
async function getMyDoctorProfile(req, res, next) {
  try {
    const doctor = await doctorService.getMyDoctorProfile({
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * GET /api/v1/doctors/:id
 * Retrieves a single doctor's details.
 * Authorized: ADMIN, RECEPTIONIST, DEPARTMENT_MANAGER, DOCTOR, PATIENT
 */
async function getDoctor(req, res, next) {
  try {
    const doctor = await doctorService.getDoctorById({
      doctorId: req.params.id,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * PATCH /api/v1/doctors/:id
 * Updates doctor profile fields.
 * Authorized: ADMIN, DOCTOR (own)
 */
async function updateDoctor(req, res, next) {
  try {
    const validation = validateUpdateDoctor(req.body, req.user.role);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const doctor = await doctorService.updateDoctor({
      doctorId: req.params.id,
      payload: req.body,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Doctor profile updated successfully",
      doctor,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * PATCH /api/v1/doctors/:id/patients
 * Assigns a patient to a doctor's care roster.
 * Authorized: ADMIN, DOCTOR
 */
async function assignPatient(req, res, next) {
  try {
    const validation = validateAssignPatient(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const doctor = await doctorService.assignPatientToDoctor({
      doctorId: req.params.id,
      patientId: req.body.patientId,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Patient assigned successfully",
      doctor,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * GET /api/v1/doctors/:id/patients
 * Retrieves patient queue assigned to a doctor.
 * Authorized: DOCTOR (own), ADMIN
 */
async function getDoctorPatients(req, res, next) {
  try {
    const patients = await doctorService.getDoctorPatientQueue({
      doctorId: req.params.id,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      patients,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * PATCH /api/v1/doctors/:id/availability
 * Updates consultation schedule availability slots.
 * Authorized: DOCTOR (own), ADMIN
 */
async function updateAvailability(req, res, next) {
  try {
    const validation = validateAvailabilityUpdate(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const availability = await doctorService.updateDoctorAvailability({
      doctorId: req.params.id,
      availability: req.body.availability,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      availability,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * POST /api/v1/doctors/:id/notes
 * Adds a clinical note for a patient.
 * Authorized: DOCTOR, ADMIN
 */
async function addClinicalNote(req, res, next) {
  try {
    const validation = validateAddNote(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const result = await doctorService.addClinicalNote({
      doctorId: req.params.id,
      patientId: req.body.patientId,
      note: req.body.note,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Clinical note added successfully",
      note: result.note,
      patient: result.patient,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

module.exports = {
  createDoctor,
  getDoctors,
  getMyDoctorProfile,
  getDoctor,
  updateDoctor,
  assignPatient,
  getDoctorPatients,
  updateAvailability,
  addClinicalNote,
};
