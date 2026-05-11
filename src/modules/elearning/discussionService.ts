import { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../utils/errors";

type Actor = { userId: string; role: string };

type DiscussionInput = {
  courseId: string;
  title: string;
  content: string;
};

type DiscussionReplyInput = {
  content: string;
};

export class DiscussionService {
  constructor(private prisma: PrismaClient) {}

  private resolveAuthorType(role: string): "STUDENT" | "TEACHER" {
    return role === 'STUDENT' ? 'STUDENT' : 'TEACHER';
  }

  async createDiscussion(tenantId: string, actor: Actor, data: DiscussionInput) {
    return this.prisma.discussion.create({
      data: {
        ...data,
        tenantId,
        authorId: actor.userId,
        authorType: this.resolveAuthorType(actor.role),
      },
    });
  }

  async getDiscussions(tenantId: string, courseId: string) {
    return this.prisma.discussion.findMany({
      where: { tenantId, courseId },
      include: { replies: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });
  }

  async addReply(tenantId: string, discussionId: string, actor: Actor, data: DiscussionReplyInput) {
    await this.ensureDiscussion(tenantId, discussionId);

    return this.prisma.discussionReply.create({
      data: {
        ...data,
        discussionId,
        authorId: actor.userId,
        authorType: this.resolveAuthorType(actor.role),
      },
    });
  }

  async pinDiscussion(tenantId: string, id: string, isPinned: boolean) {
    await this.ensureDiscussion(tenantId, id);

    return this.prisma.discussion.update({
      where: { id },
      data: { isPinned },
    });
  }

  private async ensureDiscussion(tenantId: string, id: string) {
    const discussion = await this.prisma.discussion.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!discussion) {
      throw new NotFoundError("Discussion not found");
    }

    return discussion;
  }
}
