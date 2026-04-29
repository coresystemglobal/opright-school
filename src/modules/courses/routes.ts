import { Router } from "express";
import { courseController } from "./controller";

const router = Router();

router.post("/", courseController.createCourse);
router.get("/", courseController.getCourses);
router.get("/:id", courseController.getCourse);
router.put("/:id", courseController.updateCourse);
router.delete("/:id", courseController.deleteCourse);
router.post("/:id/modules", courseController.createModule);
router.put("/:id/modules/reorder", courseController.reorderModules);
router.put("/:id/modules/:moduleId", courseController.updateModule);
router.delete("/:id/modules/:moduleId", courseController.deleteModule);
router.post("/:id/modules/:moduleId/lessons", courseController.createLesson);
router.put("/:id/modules/:moduleId/lessons/reorder", courseController.reorderRecordedLessons);
router.put("/:id/modules/:moduleId/lessons/:lessonId", courseController.updateLesson);
router.delete("/:id/modules/:moduleId/lessons/:lessonId", courseController.deleteRecordedLesson);
router.post("/:id/enroll", courseController.enrollStudent);
router.get("/enrollments/:studentId", courseController.getEnrollments);
router.post("/progress", courseController.updateProgress);

export default router;
