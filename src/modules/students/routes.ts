import { Router } from "express";
import { studentController } from './controller';

const router = Router();

router.get("/", studentController.list);
router.post("/", studentController.create);
router.get("/:id", studentController.getById);
router.put("/:id", studentController.update);
router.delete("/:id", studentController.delete);

export default router;
