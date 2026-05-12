import { Router } from "express";
import { authorize } from "../../middleware/authorize";
import { feesController } from "./controller";

const router = Router();

router.get("/banks", authorize("fees", "read"), feesController.listBanks);
router.get("/verify-account", authorize("fees", "read"), feesController.verifyAccount);

router.post("/account", authorize("fees", "create"), feesController.setupAccount);
router.get("/account", authorize("fees", "read"), feesController.getAccount);

router.post("/account/change-request", authorize("fees", "update"), feesController.requestAccountChange);
router.get("/account/change-requests", authorize("fees", "read"), feesController.getChangeRequests);

export default router;
