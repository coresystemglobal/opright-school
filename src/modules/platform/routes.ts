import { Router } from "express";
import { requireRole } from "../../middleware/auth";
import { platformController } from "./controller";

const router = Router();

router.use(requireRole("MASTER"));

router.get("/tenants", platformController.listTenants);
router.get("/tenants/:id", platformController.getTenant);
router.get("/stats", platformController.stats);

export default router;
