import { Request, Response, NextFunction } from "express";
import { routingService, RoutingService } from "./routing.service";
import { EvaluateRoutingDTO } from "./routing.validation";

export class RoutingController {
  private service: RoutingService;

  constructor(service: RoutingService = routingService) {
    this.service = service;
  }

  evaluate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payload = req.body as EvaluateRoutingDTO;
      const result = this.service.evaluate(payload);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const routingController = new RoutingController();
