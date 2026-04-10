import { Router } from "express";
import { attendanceController } from './controller';

const router = Router();

router.post("/", attendanceController.markAttendance);
router.get("/student/:studentId", attendanceController.getStudentAttendance);

export default router;
