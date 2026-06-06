import jwt, { JwtPayload } from "jsonwebtoken";

import { env } from "../../config/env";
import { ApiError } from "../../utils/api-error";

export type CampayWebhookPayload = Record<string, unknown>;

const CALLBACK_FIELDS = [
  "status",
  "reference",
  "amount",
  "currency",
  "operator",
  "code",
  "operator_reference",
  "endpoint",
  "external_reference",
  "external_user",
  "phone_number",
  "description",
  "reason",
] as const;

const REQUIRED_CALLBACK_FIELDS = [
  "status",
  "reference",
  "external_reference",
] as const;

const invalidSignature = () =>
  new ApiError(401, "Invalid Campay webhook signature");

const readScalar = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return readScalar(value[0]);
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return undefined;
};

// I verify CamPay's JWT before allowing the callback to update any payment record.
export const verifyCampayWebhook = (
  rawPayload: unknown
): CampayWebhookPayload => {
  if (!env.campayWebhookKey) {
    throw new ApiError(500, "Campay webhook key is not configured");
  }

  if (!rawPayload || typeof rawPayload !== "object") {
    throw invalidSignature();
  }

  const payload = rawPayload as CampayWebhookPayload;
  const signature = readScalar(payload.signature);

  if (!signature) {
    throw invalidSignature();
  }

  let decoded: string | JwtPayload;

  try {
    // CamPay signs this token with the private webhook key using HMAC SHA-256.
    decoded = jwt.verify(signature, env.campayWebhookKey, {
      algorithms: ["HS256"],
    });
  } catch {
    throw invalidSignature();
  }

  if (typeof decoded === "string") {
    throw invalidSignature();
  }

  if (readScalar(decoded.source)?.toLowerCase() !== "campay") {
    throw invalidSignature();
  }

  // The callback still needs the references used for our provider status check.
  for (const field of REQUIRED_CALLBACK_FIELDS) {
    if (!readScalar(payload[field])) {
      throw invalidSignature();
    }
  }

  const verifiedPayload: CampayWebhookPayload = {};

  // I only pass known CamPay fields into the payment service.
  for (const field of CALLBACK_FIELDS) {
    const callbackValue = readScalar(payload[field]);

    if (callbackValue !== undefined) {
      verifiedPayload[field] = callbackValue;
    }
  }

  return verifiedPayload;
};
