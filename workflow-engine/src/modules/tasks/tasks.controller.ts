import { Request, Response, NextFunction } from "express";
import { taskService, TaskService } from "./tasks.service";
import { escalationService } from "../escalation/escalation.service";
import { auditService } from "../audit/audit.service";
import {
  CreateTaskDTO,
  UpdateTaskStatusDTO,
  AssignTaskDTO,
  ChangePriorityDTO,
  CreateTaskNoteDTO,
  ListTasksQueryDTO,
} from "./tasks.types";

export class TaskController {
  private service: TaskService;

  constructor(service: TaskService = taskService) {
    this.service = service;
  }

  createTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payload = req.body as CreateTaskDTO;
      const task = await this.service.createTask(payload);
      res.status(201).json({
        success: true,
        message: "Task created successfully",
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  getTaskById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const task = await this.service.getTaskById(id);
      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  listTasks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = req.query as unknown as ListTasksQueryDTO;
      const result = await this.service.listTasks(query);
      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  updateTaskStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const payload = req.body as UpdateTaskStatusDTO;
      const task = await this.service.updateTaskStatus(id, payload);
      res.status(200).json({
        success: true,
        message: `Task status successfully transitioned to '${task.status}'`,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  assignTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const payload = req.body as AssignTaskDTO;
      const task = await this.service.assignTask(id, payload);
      res.status(200).json({
        success: true,
        message: "Task assignment updated successfully",
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  changePriority = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const payload = req.body as ChangePriorityDTO;
      const task = await this.service.changePriority(id, payload);
      res.status(200).json({
        success: true,
        message: `Task priority updated to '${task.priority}'`,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  addNote = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const payload = req.body as CreateTaskNoteDTO;
      const note = await this.service.addNote(id, payload);
      res.status(201).json({
        success: true,
        message: "Note added successfully",
        data: note,
      });
    } catch (error) {
      next(error);
    }
  };

  listNotes = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const notes = await this.service.listNotes(id);
      res.status(200).json({
        success: true,
        data: notes,
      });
    } catch (error) {
      next(error);
    }
  };

  escalateTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { reason, employeeId } = req.body as {
        reason: string;
        employeeId: string;
      };
      const task = await escalationService.manualEscalate(
        id,
        reason,
        employeeId
      );
      res.status(200).json({
        success: true,
        message: `Task escalation level successfully updated to '${task.escalationLevel}'`,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  listEscalatedTasks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = req.query as { escalationLevel?: string | number };
      const result = await escalationService.getEscalatedTasks(
        query.escalationLevel
      );
      res.status(200).json({
        success: true,
        data: result.data,
        grouped: result.grouped,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  getTaskTimeline = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const timeline = await auditService.getTimelineForTask(id);
      res.status(200).json({
        success: true,
        data: timeline,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const taskController = new TaskController();
