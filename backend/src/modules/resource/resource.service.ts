import { prisma } from "../../database/prisma";
import { ApiError } from "../../utils/api-error";
import { CreateResourceInput } from "./resource.schema";

type GetResourcesOptions = {
  type?: "handout" | "pastQuestion";
  limit?: number;
};

/**
 * Returns resources ordered from newest to oldest, with optional type and limit filters.
 */
export const getResources = async (options: GetResourcesOptions = {}) => {
  return prisma.resources.findMany({
    where: {
      ...(options.type ? { type: options.type } : {}),
    },
    orderBy: [{ created_at: "desc" }, { title: "asc" }],
    take: options.limit,
  });
};

/**
 * Returns one resource by id or throws when it cannot be found.
 */
export const getResourceById = async (id: string) => {
  const resource = await prisma.resources.findUnique({
    where: { id },
  });

  if (!resource) {
    throw new ApiError(404, "Resource not found");
  }

  return resource;
};

/**
 * Creates a new academic resource record.
 */
export const createResource = async (data: CreateResourceInput) => {
  return prisma.resources.create({
    data: {
      id: crypto.randomUUID(),
      code: data.code.trim().toUpperCase(),
      title: data.title.trim(),
      level: data.level,
      faculty: data.faculty?.trim() || null,
      type: data.type,
      file_url: data.file_url,
      description: data.description?.trim() || null,
    },
  });
};
