import { Router } from "express";
import { inventoryController } from "../controllers/inventoryController";

const router = Router();

router.post("/assets", inventoryController.createAsset);
router.get("/assets", inventoryController.getAssets);
router.post("/transactions", inventoryController.recordTransaction);
router.get("/transactions", inventoryController.getTransactions);

export default router;
