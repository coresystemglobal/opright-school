import { Router } from "express";
import { noticesController } from "./controller";

const router = Router();

router.post("/", noticesController.create);
router.get("/", noticesController.list);

export default router;
