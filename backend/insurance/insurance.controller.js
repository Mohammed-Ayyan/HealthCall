/**
 * CareOps AI - Insurance Controller Layer
 * 
 * Express request handlers for insurance claims, prior-authorization,
 * and patient eligibility verification.
 */

const insuranceService = require("./insurance.service");

/**
 * POST /api/v1/insurance/claims
 * Submits a new claim for adjudication.
 */
async function createClaim(req, res, next) {
  try {
    const claim = await insuranceService.createClaim({
      payload: req.body,
      requester: req.user,
    });

    res.status(201).json({
      success: true,
      message: "Insurance claim submitted successfully",
      claim,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/insurance/claims
 * Retrieves list of insurance claims scoped by role.
 */
async function getClaims(req, res, next) {
  try {
    const claims = await insuranceService.listClaims({
      requester: req.user,
      filters: req.query,
    });

    res.status(200).json({
      success: true,
      count: claims.length,
      claims,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/insurance/claims/:id
 * Retrieves a single insurance claim by ID.
 */
async function getClaim(req, res, next) {
  try {
    const claim = await insuranceService.getClaimById({
      id: req.params.id,
      requester: req.user,
    });

    res.status(200).json({
      success: true,
      claim,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/insurance/claims/:id/status
 * Updates claim adjudication status (Admin & Insurance Employee only).
 */
async function updateClaimStatus(req, res, next) {
  try {
    const claim = await insuranceService.updateClaimStatus({
      id: req.params.id,
      payload: req.body,
      requester: req.user,
    });

    res.status(200).json({
      success: true,
      message: `Claim status updated to ${claim.status}`,
      claim,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/insurance/patient/:id
 * Retrieves patient insurance profile, policy, and claims summary.
 */
async function getPatientInsurance(req, res, next) {
  try {
    const data = await insuranceService.getPatientInsurance({
      patientId: req.params.id,
      requester: req.user,
    });

    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createClaim,
  getClaims,
  getClaim,
  updateClaimStatus,
  getPatientInsurance,
};
