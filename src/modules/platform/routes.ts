import { Router } from "express";
import { masterAuthMiddleware } from "../../middleware/auth";
import { platformController } from "./controller";

const router = Router();

// All /platform/* routes require MASTER JWT (no tenant header needed)
router.use(masterAuthMiddleware);

router.get("/tenants", platformController.listTenants);
router.patch("/tenants/:tenantId", platformController.updateTenant);

router.get("/bank-account-requests", platformController.listBankAccountRequests);
router.post("/bank-account-requests/:id/review", platformController.reviewBankAccountRequest);

export default router;
