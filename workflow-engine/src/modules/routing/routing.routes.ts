import { Router } from "express";
import { routingController } from "./routing.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { evaluateRoutingSchema } from "./routing.validation";

const router = Router();

// POST /api/v1/routing/evaluate - Dry-run / test intent routing against department rules
router.post(
  "/evaluate",
  validateRequest({ body: evaluateRoutingSchema }),
  routingController.evaluate
);

export { router as routingRouter };
export default router;
