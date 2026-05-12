import { Router } from "express";
import { authorize } from "../../middleware/authorize";
import { feesController } from "./controller";

const router = Router();

// ─── Bank helpers ─────────────────────────────────────────────────────────────
router.get("/banks", authorize("fees", "read"), feesController.listBanks);
router.get("/verify-account", authorize("fees", "read"), feesController.verifyAccount);

// ─── School payment account ───────────────────────────────────────────────────
router.post("/account", authorize("fees", "create"), feesController.setupAccount);
router.get("/account", authorize("fees", "read"), feesController.getAccount);
router.post("/account/change-request", authorize("fees", "update"), feesController.requestAccountChange);
router.get("/account/change-requests", authorize("fees", "read"), feesController.getChangeRequests);

// ─── Fee templates ────────────────────────────────────────────────────────────
router.post("/templates", authorize("fees", "create"), feesController.createTemplate);
router.get("/templates", authorize("fees", "read"), feesController.listTemplates);
router.get("/templates/:id", authorize("fees", "read"), feesController.getTemplate);
router.patch("/templates/:id", authorize("fees", "update"), feesController.updateTemplate);
router.delete("/templates/:id", authorize("fees", "delete"), feesController.deactivateTemplate);
router.post("/templates/:id/assign", authorize("fees", "create"), feesController.assignTemplate);

// ─── Fee assignments ──────────────────────────────────────────────────────────
router.get("/assignments", authorize("fees", "read"), feesController.listAssignments);
router.post("/assignments/:id/waive", authorize("fees", "update"), feesController.waiveAssignment);
router.get("/students/:studentId/summary", authorize("fees", "read"), feesController.getStudentFeeSummary);

export default router;
