import { Request, Response } from "express";
import { GradesService } from "./service";

const service = new GradesService();

export const gradesController = {
  redirectExams(_req: Request, res: Response) {
    res.status(301).json(service.getExamRedirect());
  },

  redirectGrades(_req: Request, res: Response) {
    res.status(301).json(service.getGradeRedirect());
  },

  redirectStudentGrades(_req: Request, res: Response) {
    res.status(301).json(service.getStudentGradesRedirect());
  },
};
