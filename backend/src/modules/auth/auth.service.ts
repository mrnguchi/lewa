import { prisma } from "../../database/prisma";
import bcrypt from "bcrypt";
import { ApiError } from "../../utils/api-error";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";

interface RegisterInput {
  full_name: string;
  matricule: string;
  phone_number: string;
  password: string;
  faculty: string;
  department: string;
  level: number;
}

/**
 * Register student
 */
export const registerStudent = async (data: RegisterInput) => {

  const {
    full_name,
    matricule,
    phone_number,
    password,
    faculty,
    department,
    level,
  } = data;

  // Check if student already exists
  const existingStudent = await prisma.students.findFirst({
    where: {
      OR: [
        { matricule },
        { phone_number }
      ],
    },
  });

  if (existingStudent) {
    throw new ApiError(400, "Student already exists");
  }

  // Hash password
  // Use 6 rounds in development for faster hashing, 10 in production
  const saltRounds = env.nodeEnv === 'production' ? 10 : 6;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const student = await prisma.students.create({
    data: {
      id: crypto.randomUUID(),
      full_name,
      matricule,
      phone_number,
      password_hash: hashedPassword,
      faculty,
      department,
      level,
    },
  });

  // Generate JWT token for auto-login after registration
  const token = jwt.sign(
    {
      studentId: student.id,
      matricule: student.matricule
    },
    env.jwtSecret,
    { expiresIn: "7d" }
  );

  return {
    success: true,
    message: "Student registered successfully",
    token,
    data: {
      id: student.id,
      full_name: student.full_name,
      matricule: student.matricule,
      phone_number: student.phone_number,
      faculty: student.faculty,
      department: student.department,
      level: student.level,
      profile_image_url: student.profile_image_url,
      notifications_enabled: student.notifications_enabled,
      is_active: student.is_active,
      fee_status: student.fee_status,
      subscribed: student.subscribed,
      role: student.role,
    },
  };
};


/**
 * Login student
 */

interface LoginInput {
  matricule: string;
  password: string;
}

export const loginStudent = async (data: LoginInput) => {

  const { matricule, password } = data;

  const student = await prisma.students.findUnique({
    where: { matricule },
  });

  if (!student) {
    throw new ApiError(401, "Invalid matricule or password");
  }

  const passwordMatches = await bcrypt.compare(password, student.password_hash);

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid matricule or password");
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      studentId: student.id,
      matricule: student.matricule
    },
    env.jwtSecret,
    { expiresIn: "7d" }
  );

  return {
    success: true,
    message: "Login successful",
    token,
    data: {
      id: student.id,
      full_name: student.full_name,
      matricule: student.matricule,
      phone_number: student.phone_number,
      faculty: student.faculty,
      department: student.department,
      level: student.level,
      profile_image_url: student.profile_image_url,
      notifications_enabled: student.notifications_enabled,
      is_active: student.is_active,
      fee_status: student.fee_status,
      subscribed: student.subscribed,
      role: student.role,
    },
  };
};
