import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

interface RequestValidators {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validateRequest(validators: RequestValidators) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (validators.params) {
        const parsedParams = await validators.params.parseAsync(req.params);
        try {
          req.params = parsedParams;
        } catch {
          Object.defineProperty(req, "params", {
            value: parsedParams,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        }
      }
      if (validators.query) {
        const parsedQuery = await validators.query.parseAsync(req.query);
        try {
          req.query = parsedQuery;
        } catch {
          Object.defineProperty(req, "query", {
            value: parsedQuery,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        }
      }
      if (validators.body) {
        req.body = await validators.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(error);
      }
    }
  };
}
