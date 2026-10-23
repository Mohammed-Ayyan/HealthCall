import { Router } from "express";
import { taskController } from "./tasks.controller";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createTaskSchema,
  updateTaskStatusSchema,
  assignTaskSchema,
  changePrioritySchema,
  createTaskNoteSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  escalateTaskSchema,
  listEscalatedTasksQuerySchema,
} from "./tasks.validation";

const router = Router();

// POST /api/v1/tasks - Create task linked to a call and department
router.post(
  "/",
  validateRequest({ body: createTaskSchema }),
  taskController.createTask
);

// GET /api/v1/tasks - Query tasks with pagination and filters
router.get(
  "/",
  validateRequest({ query: listTasksQuerySchema }),
  taskController.listTasks
);

// GET /api/v1/tasks/escalated - Query escalated tasks (mounted before /:id)
router.get(
  "/escalated",
  validateRequest({ query: listEscalatedTasksQuerySchema }),
  taskController.listEscalatedTasks
);

// GET /api/v1/tasks/:id - Retrieve single task details
router.get(
  "/:id",
  validateRequest({ params: taskIdParamSchema }),
  taskController.getTaskById
);

// GET /api/v1/tasks/:id/timeline - Retrieve full chronological task audit timeline
router.get(
  "/:id/timeline",
  validateRequest({ params: taskIdParamSchema }),
  taskController.getTaskTimeline
);

// POST /api/v1/tasks/:id/escalate - Manually trigger task escalation
router.post(
  "/:id/escalate",
  validateRequest({
    params: taskIdParamSchema,
    body: escalateTaskSchema,
  }),
  taskController.escalateTask
);

// PATCH /api/v1/tasks/:id/status - Update task status with state machine governance
router.patch(
  "/:id/status",
  validateRequest({
    params: taskIdParamSchema,
    body: updateTaskStatusSchema,
  }),
  taskController.updateTaskStatus
);

// PATCH /api/v1/tasks/:id/assign - Assign or transfer task (employee, department, autoAssign)
router.patch(
  "/:id/assign",
  validateRequest({
    params: taskIdParamSchema,
    body: assignTaskSchema,
  }),
  taskController.assignTask
);

// PATCH /api/v1/tasks/:id/priority - Update task priority (LOW, MEDIUM, HIGH, URGENT)
router.patch(
  "/:id/priority",
  validateRequest({
    params: taskIdParamSchema,
    body: changePrioritySchema,
  }),
  taskController.changePriority
);

// POST /api/v1/tasks/:id/notes - Add operational note to task
router.post(
  "/:id/notes",
  validateRequest({
    params: taskIdParamSchema,
    body: createTaskNoteSchema,
  }),
  taskController.addNote
);

// GET /api/v1/tasks/:id/notes - Retrieve chronological task notes
router.get(
  "/:id/notes",
  validateRequest({ params: taskIdParamSchema }),
  taskController.listNotes
);

export { router as taskRouter };
export default router;
