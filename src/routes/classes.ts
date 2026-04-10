import { Router } from "express";
import { classController } from "../controllers/classController";

const router = Router();

router.get("/", classController.list);
router.post("/", classController.create);
router.post("/:classId/enroll", classController.enrollStudent);
router.put("/:id", classController.update);
router.delete("/:id", classController.delete);

export default router;
