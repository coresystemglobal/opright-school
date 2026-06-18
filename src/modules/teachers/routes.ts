import { Router } from "express";
import multer from "multer";
import { teacherController } from './controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Self-service routes (teacher accesses their own profile)
router.get("/me", teacherController.getMe);
router.patch("/me", teacherController.updateMe);

// CSV bulk operations
router.post("/upload-csv", upload.single("file"), teacherController.uploadCsv);
router.get("/csv-template", teacherController.downloadCsvTemplate);

// Teacher CRUD (admin)
router.get("/", teacherController.list);
router.post("/", teacherController.create);
router.get("/:id", teacherController.getById);
router.put("/:id", teacherController.update);
router.delete("/:id", teacherController.delete);

// Teacher profile relations
router.get("/:id/profile", teacherController.getProfile);
router.get("/:id/subjects", teacherController.getSubjects);
router.get("/:id/timetable", teacherController.getTimetable);
router.get("/:id/students", teacherController.getStudents);
router.get("/:id/courses", teacherController.getCourses);

export default router;
