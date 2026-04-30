import { Router } from "express";
import { requireRole } from "../../middleware/auth";
import { noticesController } from "./controller";

const router = Router();

router.get("/", noticesController.list);
router.post("/", requireRole("ADMIN", "PRINCIPAL", "TEACHER"), noticesController.create);
router.put("/:id", requireRole("ADMIN", "PRINCIPAL", "TEACHER"), noticesController.update);
router.delete("/:id", requireRole("ADMIN", "PRINCIPAL", "TEACHER"), noticesController.remove);

export default router;
