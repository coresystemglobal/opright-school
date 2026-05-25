import { Router } from "express";
import { aiController } from "./controller";

const router = Router();

router.get("/students/:studentId/insights", aiController.getStudentInsights);

export default router;
