import crypto from "crypto";
import { env } from "../../config/env";
import {
  CreateNewsPosterSignatureInput,
  CreateResourceFileSignatureInput,
} from "./upload.schema";

const sanitizeFilename = (filename?: string) => {
  if (!filename) {
    return "news-poster";
  }

  const nameWithoutExtension = filename.replace(/\.[^/.]+$/, "");
  const sanitized = nameWithoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return sanitized || "news-poster";
};

const signCloudinaryParams = (params: Record<string, string | number>) => {
  const signatureBase = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${signatureBase}${env.cloudinaryApiSecret}`)
    .digest("hex");
};

export const createNewsPosterUploadSignature = (input: CreateNewsPosterSignatureInput) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const filename = sanitizeFilename(input.filename);
  const publicId = `${filename}-${Date.now()}`;

  const paramsToSign = {
    public_id: publicId,
    timestamp,
    upload_preset: env.cloudinaryUploadPreset,
  };

  const signature = signCloudinaryParams(paramsToSign);

  return {
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    uploadPreset: env.cloudinaryUploadPreset,
    timestamp,
    signature,
    publicId,
    resourceType: "image" as const,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/upload`,
  };
};

/**
 * Builds a signed Cloudinary upload payload for raw PDF resource files.
 */
export const createResourceFileUploadSignature = (input: CreateResourceFileSignatureInput) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const filename = sanitizeFilename(input.filename).replace(/-pdf$/, "");
  const publicId = `${filename}-${Date.now()}`;

  const paramsToSign = {
    public_id: publicId,
    timestamp,
    upload_preset: env.cloudinaryUploadPreset,
  };

  const signature = signCloudinaryParams(paramsToSign);

  return {
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    uploadPreset: env.cloudinaryUploadPreset,
    timestamp,
    signature,
    publicId,
    resourceType: "raw" as const,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/raw/upload`,
  };
};
