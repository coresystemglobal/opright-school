import { Router } from "express";
import { gradesController } from "./controller";

const router = Router();

router.post("/exams", gradesController.redirectExams);
router.post("/", gradesController.redirectGrades);
router.get("/student/:studentId", gradesController.redirectStudentGrades);

export default router;
