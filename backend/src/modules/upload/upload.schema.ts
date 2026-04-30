import { z } from "zod";

export const createNewsPosterSignatureSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required").max(255, "Filename is too long").optional(),
});

export const createResourceFileSignatureSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required").max(255, "Filename is too long").optional(),
});

export type CreateNewsPosterSignatureInput = z.infer<typeof createNewsPosterSignatureSchema>;
export type CreateResourceFileSignatureInput = z.infer<typeof createResourceFileSignatureSchema>;
