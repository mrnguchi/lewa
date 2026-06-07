import { Request, Response } from "express";
import {
  createNewsPosterSignatureSchema,
  createResourceFileSignatureSchema,
} from "./upload.schema";
import {
  createNewsPosterUploadSignature,
  createProfileImageUploadSignature,
  createResourceFileUploadSignature,
} from "./upload.service";
import { ApiError } from "../../utils/api-error";

/**
 * Returns a signed Cloudinary payload for news poster uploads.
 */
export const getNewsPosterUploadSignature = async (req: Request, res: Response) => {
  const payload = createNewsPosterSignatureSchema.parse(req.body);
  const signaturePayload = createNewsPosterUploadSignature(payload);

  res.status(200).json({
    success: true,
    data: signaturePayload,
  });
};

/**
 * Returns a signed profile-image upload scoped to the logged-in student.
 */
export const getProfileImageUploadSignature = async (req: Request, res: Response) => {
  const studentId = (req as any).student?.studentId as string | undefined;

  if (!studentId) {
    throw new ApiError(401, "Authentication required");
  }

  const signaturePayload = createProfileImageUploadSignature(studentId);

  res.status(200).json({
    success: true,
    data: signaturePayload,
  });
};

/**
 * Returns a signed Cloudinary payload for resource PDF uploads.
 */
export const getResourceFileUploadSignature = async (req: Request, res: Response) => {
  const payload = createResourceFileSignatureSchema.parse(req.body);
  const signaturePayload = createResourceFileUploadSignature(payload);

  res.status(200).json({
    success: true,
    data: signaturePayload,
  });
};
