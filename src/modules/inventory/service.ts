import {
  AssetTransactionType,
  PrismaClient,
} from "@prisma/client";

type CreateAssetData = {
  name: string;
  category: string;
  quantity?: number;
  supplier?: string;
  purchaseDate?: Date;
  cost?: number;
  location?: string;
};

type RecordTransactionData = {
  assetId: string;
  type: AssetTransactionType;
  quantity: number;
  remarks?: string;
  date?: Date;
};

export class InventoryService {
  constructor(private prisma: PrismaClient) {}

  async createAsset(tenantId: string, data: CreateAssetData) {
    return this.prisma.asset.create({
      data: { ...data, tenantId },
    });
  }

  async getAssets(tenantId: string, category?: string) {
    return this.prisma.asset.findMany({
      where: { tenantId, ...(category ? { category } : {}) },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async recordTransaction(tenantId: string, data: RecordTransactionData) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: data.assetId, tenantId },
    });

    if (!asset) {
      throw new Error("Asset not found");
    }

    const newQuantity =
      data.type === AssetTransactionType.PURCHASE
        ? asset.quantity + data.quantity
        : data.type === AssetTransactionType.DISPOSAL
          ? asset.quantity - data.quantity
          : asset.quantity;

    if (newQuantity < 0) {
      throw new Error("Asset quantity cannot be negative");
    }

    const [transaction] = await this.prisma.$transaction([
      this.prisma.assetTransaction.create({
        data: { ...data, tenantId },
      }),
      this.prisma.asset.update({
        where: { id: data.assetId, tenantId },
        data: { quantity: newQuantity },
      }),
    ]);

    return transaction;
  }

  async getTransactions(tenantId: string, assetId?: string) {
    return this.prisma.assetTransaction.findMany({
      where: { tenantId, ...(assetId ? { assetId } : {}) },
      include: { asset: true },
      orderBy: { date: "desc" },
    });
  }
}
