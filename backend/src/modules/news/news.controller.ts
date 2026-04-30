import { Request, Response } from "express";
import * as newsService from "./news.service";
import { createNewsSchema, getNewsQuerySchema } from "./news.schema";

/**
 * Returns the latest published news articles for the mobile app.
 */
export const getNews = async (_req: Request, res: Response) => {
  const query = getNewsQuerySchema.parse(_req.query);
  const newsItems = await newsService.getNews(query.limit);

  res.status(200).json({
    success: true,
    data: newsItems,
  });
};

/**
 * Returns a single published news article by id.
 */
export const getNewsById = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const newsItem = await newsService.getNewsById(id);

  res.status(200).json({
    success: true,
    data: newsItem,
  });
};

/**
 * Creates a new news article for president users.
 */
export const createNews = async (req: Request, res: Response) => {
  const payload = createNewsSchema.parse(req.body);
  const newsItem = await newsService.createNews(payload, {
    authorStudentId: (req as any).currentStudent?.id as string | undefined,
  });

  res.status(201).json({
    success: true,
    message: "News published successfully",
    data: newsItem,
  });
};
