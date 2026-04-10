import { AssetTransactionType } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { InventoryService } from "../services/inventoryService";

const service = new InventoryService(prisma);

const createAssetSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  quantity: z.coerce.number().int().positive().optional(),
  supplier: z.string().min(1).optional(),
  purchaseDate: z.coerce.date().optional(),
  cost: z.coerce.number().nonnegative().optional(),
  location: z.string().min(1).optional(),
});

const recordTransactionSchema = z.object({
  assetId: z.string().uuid(),
  type: z.nativeEnum(AssetTransactionType),
  quantity: z.coerce.number().int().positive(),
  remarks: z.string().min(1).optional(),
  date: z.coerce.date().optional(),
});

export const inventoryController = {
  async createAsset(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = createAssetSchema.parse(req.body);
      const asset = await service.createAsset(req.tenantId, data);
      res.status(201).json(asset);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getAssets(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const category =
        typeof req.query.category === "string" ? req.query.category : undefined;
      const assets = await service.getAssets(req.tenantId, category);
      res.json(assets);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async recordTransaction(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = recordTransactionSchema.parse(req.body);
      const transaction = await service.recordTransaction(req.tenantId, data);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getTransactions(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const assetId = typeof req.query.assetId === "string" ? req.query.assetId : undefined;
      const transactions = await service.getTransactions(req.tenantId, assetId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
