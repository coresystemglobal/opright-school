import { Router } from "express";
import { inventoryController } from './controller';

const router = Router();

router.post("/assets", inventoryController.createAsset);
router.get("/assets", inventoryController.getAssets);
router.post("/transactions", inventoryController.recordTransaction);
router.get("/transactions", inventoryController.getTransactions);

export default router;
