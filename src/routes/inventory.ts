import { Router } from 'express';
import { InventoryService } from '../services/inventoryService';

const router = Router();

router.post('/assets', async (req, res) => {
  try {
    const asset = await InventoryService.createAsset(req.tenantId!, req.body);
    res.json(asset);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/assets', async (req, res) => {
  try {
    const assets = await InventoryService.getAssets(req.tenantId!, req.query.category as string);
    res.json(assets);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/transactions', async (req, res) => {
  try {
    const transaction = await InventoryService.recordTransaction(req.tenantId!, req.body);
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const transactions = await InventoryService.getTransactions(req.tenantId!, req.query.assetId as string);
    res.json(transactions);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
