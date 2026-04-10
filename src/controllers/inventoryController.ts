import { AssetTransactionType } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { InventoryService } from "../services/inventoryService";
import {
  optionalStringSchema,
  optionalUuidSchema,
} from "../utils/validation";

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

const assetsQuerySchema = z.object({
  category: optionalStringSchema,
});

const transactionsQuerySchema = z.object({
  assetId: optionalUuidSchema,
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

      const { category } = assetsQuerySchema.parse(req.query);
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

      const { assetId } = transactionsQuerySchema.parse(req.query);
      const transactions = await service.getTransactions(req.tenantId, assetId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
