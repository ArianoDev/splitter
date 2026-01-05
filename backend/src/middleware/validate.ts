import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";

/**
 * Validates req.body with a Zod schema and replaces it with the parsed value.
 */
export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}
