import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const isProd = process.env.NODE_ENV === "production";

  let statusCode = 500;
  let message = "Internal server error";

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    message = err.message;
  }

  const response: Record<string, any> = {
    success: false,
    message,
  };

  // Only include stack in development
  if (!isProd && err instanceof Error) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};