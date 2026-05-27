import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";
import { prisma } from "../database/prisma";

export const authenticateStudent = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new ApiError(401, "Authentication required");
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    throw new ApiError(401, "Invalid authentication token");
  }

  try {

    const decoded = jwt.verify(token, env.jwtSecret) as any;

    // attach student info to request
    (req as any).student = decoded;

    next();

  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }
};

export const authenticateAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new ApiError(401, "Authentication required");
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    throw new ApiError(401, "Invalid authentication token");
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as any;

    if (decoded.tokenType !== "admin" || !decoded.adminId) {
      throw new ApiError(401, "Invalid admin authentication token");
    }

    const admin = await prisma.admins.findUnique({
      where: {
        id: decoded.adminId,
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone_number: true,
        faculty: true,
        department: true,
        admin_role: true,
        is_active: true,
        last_login_at: true,
      },
    });

    if (!admin || !admin.is_active) {
      throw new ApiError(403, "Admin account is inactive or unavailable");
    }

    (req as any).admin = decoded;
    (req as any).currentAdmin = admin;

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(401, "Invalid or expired admin token");
  }
};

export const requireAdminRole =
  (...allowedRoles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const admin = (req as any).currentAdmin;

    if (!admin) {
      throw new ApiError(401, "Authentication required");
    }

    if (!allowedRoles.includes(admin.admin_role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }

    next();
  };

export const requireRole =
  (...allowedRoles: string[]) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    const authStudent = (req as any).student;

    if (!authStudent?.studentId) {
      throw new ApiError(401, "Authentication required");
    }

    const student = await prisma.students.findUnique({
      where: { id: authStudent.studentId },
      select: {
        id: true,
        role: true,
        is_active: true,
      },
    });

    if (!student || !student.is_active) {
      throw new ApiError(403, "Access denied");
    }

    if (!allowedRoles.includes(student.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }

    (req as any).currentStudent = student;

    next();
  };

export const requirePresident = requireRole("president");
