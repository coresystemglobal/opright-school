import { Router } from "express";
import { courseController } from "./controller";

const router = Router();

router.post("/", courseController.createCourse);
router.get("/", courseController.getCourses);
router.get("/:id", courseController.getCourse);
router.put("/:id", courseController.updateCourse);
router.delete("/:id", courseController.deleteCourse);
router.post("/:id/enroll", courseController.enrollStudent);
router.get("/enrollments/:studentId", courseController.getEnrollments);
router.post("/progress", courseController.updateProgress);

export default router;
