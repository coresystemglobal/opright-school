import { Router } from "express";
import { candidateController } from './controller';

const router = Router();

router.get("/", candidateController.list);
router.post("/", candidateController.create);
router.get("/:id", candidateController.getById);
router.put("/:id", candidateController.update);
router.post("/:id/admit", candidateController.admit);

export default router;
