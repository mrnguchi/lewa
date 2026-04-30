import { Request, Response } from "express";
import {
  createNewsPosterSignatureSchema,
  createResourceFileSignatureSchema,
} from "./upload.schema";
import {
  createNewsPosterUploadSignature,
  createResourceFileUploadSignature,
} from "./upload.service";

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
