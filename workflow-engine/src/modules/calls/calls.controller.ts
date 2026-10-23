import { Request, Response, NextFunction } from "express";
import { CallService, callService as defaultService } from "./calls.service";
import {
  CreateCallDTO,
  UpdateCallDTO,
  ListCallsQueryDTO,
} from "./calls.validation";

export class CallController {
  private service: CallService;

  constructor(service: CallService = defaultService) {
    this.service = service;
  }

  createCall = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payload = req.body as CreateCallDTO;
      const call = await this.service.createCall(payload);
      res.status(201).json({
        success: true,
        message: "Call record created successfully",
        data: call,
      });
    } catch (error) {
      next(error);
    }
  };

  getCallById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const call = await this.service.getCallById(id);
      res.status(200).json({
        success: true,
        data: call,
      });
    } catch (error) {
      next(error);
    }
  };

  listCalls = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = req.query as unknown as ListCallsQueryDTO;
      const result = await this.service.listCalls(query);
      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  updateCall = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const payload = req.body as UpdateCallDTO;
      const call = await this.service.updateCall(id, payload);
      res.status(200).json({
        success: true,
        message: "Call record updated successfully",
        data: call,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteCall = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const deletedCall = await this.service.deleteCall(id);
      res.status(200).json({
        success: true,
        message: "Call record and associated dependencies deleted successfully",
        data: { id: deletedCall.id },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const callController = new CallController();
