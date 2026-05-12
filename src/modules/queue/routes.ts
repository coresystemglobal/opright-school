import { Router } from "express";
import { queueController } from "./controller";

const router = Router();

router.post("/reports", queueController.processReport);
router.post("/service-denial", queueController.processServiceDenial);

export default router;
