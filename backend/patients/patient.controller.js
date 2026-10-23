/**
 * CareOps AI - Patient Management Controller Layer
 * 
 * HTTP request handlers for /api/v1/patients endpoints.
 */

const patientService = require("./patient.service");
const { validateCreatePatient, validateUpdatePatient } = require("./patient.validation");

/**
 * POST /api/v1/patients
 * Registers a new patient.
 * Authorized: ADMIN, RECEPTIONIST
 */
async function createPatient(req, res, next) {
  try {
    const validation = validateCreatePatient(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const patient = await patientService.createPatient({
      payload: req.body,
      creatorUser: req.user,
    });

    return res.status(201).json({
      success: true,
      message: "Patient created successfully",
      patient,
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
 * GET /api/v1/patients
 * Retrieves hospital patients with search & filtering.
 * Authorized: ADMIN, DOCTOR, RECEPTIONIST, DEPARTMENT_MANAGER, INSURANCE_EMPLOYEE
 */
async function getPatients(req, res, next) {
  try {
    const { search, gender, bloodGroup, status, department, startDate, endDate } = req.query;

    const patients = await patientService.listPatients({
      requester: req.user,
      search,
      gender,
      bloodGroup,
      status,
      department,
      startDate,
      endDate,
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
 * GET /api/v1/patients/me
 * Retrieves authenticated patient's own profile.
 * Authorized: PATIENT, ADMIN
 */
async function getMyProfile(req, res, next) {
  try {
    const patient = await patientService.getMyProfile({
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      patient,
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
 * GET /api/v1/patients/:id
 * Retrieves a single patient by ID with privacy enforcement.
 * Authorized: Based on role permissions.
 */
async function getPatient(req, res, next) {
  try {
    const patient = await patientService.getPatientById({
      patientId: req.params.id,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      patient,
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
 * PATCH /api/v1/patients/:id
 * Updates patient demographics or clinical details.
 * Authorized: ADMIN, RECEPTIONIST, DOCTOR, PATIENT (restricted)
 */
async function updatePatient(req, res, next) {
  try {
    const validation = validateUpdatePatient(req.body, req.user.role);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const patient = await patientService.updatePatient({
      patientId: req.params.id,
      payload: req.body,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Patient updated successfully",
      patient,
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
 * DELETE /api/v1/patients/:id
 * Soft deletes a patient (sets status = INACTIVE).
 * Authorized: ADMIN only
 */
async function deletePatient(req, res, next) {
  try {
    const patient = await patientService.deletePatient({
      patientId: req.params.id,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Patient deactivated successfully",
      patient,
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
  createPatient,
  getPatients,
  getMyProfile,
  getPatient,
  updatePatient,
  deletePatient,
};
