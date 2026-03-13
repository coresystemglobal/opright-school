import prisma from '../prisma/client';

export class DiscussionService {
  static async createDiscussion(tenantId: string, data: any) {
    return prisma.discussion.create({
      data: { ...data, tenantId }
    });
  }

  static async getDiscussions(tenantId: string, courseId: string) {
    return prisma.discussion.findMany({
      where: { tenantId, courseId },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }]
    });
  }

  static async addReply(discussionId: string, data: any) {
    return prisma.discussionReply.create({
      data: { ...data, discussionId }
    });
  }

  static async pinDiscussion(id: string, isPinned: boolean) {
    return prisma.discussion.update({
      where: { id },
      data: { isPinned }
    });
  }
}
