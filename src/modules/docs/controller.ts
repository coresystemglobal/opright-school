import { NextFunction, Request, Response } from "express";
import { DocsService } from "./service";

const service = new DocsService();

export const docsController = {
  async index(_req: Request, res: Response, next: NextFunction) {
    try {
      const html = await service.getIndexPage();
      res.type("html").send(html);
    } catch (error) {
      next(error);
    }
  },

  async getOpenApiJson(_req: Request, res: Response, next: NextFunction) {
    try {
      const contents = await service.getOpenApiJson();
      res.type("application/json").send(contents);
    } catch (error) {
      next(error);
    }
  },

  async getPostmanCollection(_req: Request, res: Response, next: NextFunction) {
    try {
      const contents = await service.getPostmanCollection();
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="school-saas.postman_collection.json"'
      );
      res.type("application/json").send(contents);
    } catch (error) {
      next(error);
    }
  },
};
