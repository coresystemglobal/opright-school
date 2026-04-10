import { Request, Response } from "express";
import { NoticesService } from "./service";

const service = new NoticesService();

export const noticesController = {
  create(_req: Request, res: Response) {
    res.status(501).json(service.getNotImplementedResponse());
  },

  list(_req: Request, res: Response) {
    res.status(501).json(service.getNotImplementedResponse());
  },
};
