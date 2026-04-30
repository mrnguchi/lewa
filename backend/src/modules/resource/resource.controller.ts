import { Request, Response } from "express";
import * as resourceService from "./resource.service";
import { createResourceSchema, getResourcesQuerySchema } from "./resource.schema";

/**
 * Returns the resource catalogue for the mobile app.
 */
export const getResources = async (req: Request, res: Response) => {
  const query = getResourcesQuerySchema.parse(req.query);
  const resources = await resourceService.getResources(query);

  res.status(200).json({
    success: true,
    data: resources,
  });
};

/**
 * Returns a single resource document by id.
 */
export const getResourceById = async (req: Request, res: Response) => {
  const resource = await resourceService.getResourceById(req.params.id as string);

  res.status(200).json({
    success: true,
    data: resource,
  });
};

/**
 * Creates a new resource entry for authenticated users.
 */
export const createResource = async (req: Request, res: Response) => {
  const payload = createResourceSchema.parse(req.body);
  const resource = await resourceService.createResource(payload);

  res.status(201).json({
    success: true,
    message: "Resource created successfully",
    data: resource,
  });
};
