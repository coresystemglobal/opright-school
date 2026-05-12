import { Router } from "express";
import { queueController } from "./controller";

const router = Router();

router.post("/reports", queueController.processReport);
router.post("/reports/request", queueController.requestReport);

export default router;
