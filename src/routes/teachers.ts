import { Router } from "express";
import { teacherController } from "../controllers/teacherController";

const router = Router();

router.get("/", teacherController.list);
router.post("/", teacherController.create);
router.get("/:id", teacherController.getById);
router.put("/:id", teacherController.update);
router.delete("/:id", teacherController.delete);

export default router;
