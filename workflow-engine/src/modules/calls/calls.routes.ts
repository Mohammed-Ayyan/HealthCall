import { Router } from "express";
import { callController } from "./calls.controller";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createCallSchema,
  updateCallSchema,
  listCallsQuerySchema,
  callIdParamSchema,
} from "./calls.validation";

const router = Router();

// POST /api/v1/calls - Create a new call record
router.post(
  "/",
  validateRequest({ body: createCallSchema }),
  callController.createCall
);

// GET /api/v1/calls - List calls with pagination and filtering
router.get(
  "/",
  validateRequest({ query: listCallsQuerySchema }),
  callController.listCalls
);

// GET /api/v1/calls/:id - Get a single call by UUID with linked tasks
router.get(
  "/:id",
  validateRequest({ params: callIdParamSchema }),
  callController.getCallById
);

// PATCH /api/v1/calls/:id - Update call metadata by UUID
router.patch(
  "/:id",
  validateRequest({ params: callIdParamSchema, body: updateCallSchema }),
  callController.updateCall
);

// DELETE /api/v1/calls/:id - Delete call by UUID (cascades linked tasks)
router.delete(
  "/:id",
  validateRequest({ params: callIdParamSchema }),
  callController.deleteCall
);

export { router as callRouter };
export default router;
