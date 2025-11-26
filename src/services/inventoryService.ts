import prisma from '../prisma/client';

export const InventoryService = {
  async createAsset(tenantId: string, data: any) {
    return prisma.asset.create({ data: { ...data, tenantId } });
  },

  async getAssets(tenantId: string, category?: string) {
    return prisma.asset.findMany({
      where: { tenantId, ...(category && { category }) },
      include: { transactions: { orderBy: { date: 'desc' }, take: 5 } }
    });
  },

  async recordTransaction(tenantId: string, data: any) {
    const asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
    if (!asset) throw new Error('Asset not found');

    const newQty = data.type === 'PURCHASE' ? asset.quantity + data.quantity :
                   data.type === 'DISPOSAL' ? asset.quantity - data.quantity : asset.quantity;

    const [transaction] = await prisma.$transaction([
      prisma.assetTransaction.create({ data: { ...data, tenantId } }),
      prisma.asset.update({ where: { id: data.assetId }, data: { quantity: newQty } })
    ]);
    return transaction;
  },

  async getTransactions(tenantId: string, assetId?: string) {
    return prisma.assetTransaction.findMany({
      where: { tenantId, ...(assetId && { assetId }) },
      include: { asset: true },
      orderBy: { date: 'desc' }
    });
  }
};
