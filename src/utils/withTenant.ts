import { PrismaClient, Prisma } from "@prisma/client";
import prisma from "../prisma/client";

/**
 * Models that have a tenantId column and must be tenant-scoped.
 * If a model is NOT in this set, withTenant passes it through unmodified.
 */
const TENANT_SCOPED_MODELS = new Set([
  "user", "role", "student", "teacher", "class", "enrollment",
  "attendance", "fee", "payment", "academicYear", "term", "subject",
  "timetable", "assignment", "grade", "examination", "examResult",
  "book", "bookTransaction", "eBook", "readingProgress",
  "bus", "busRoute", "busAssignment", "asset", "assetTransaction",
  "event", "eventParticipant", "disciplinaryRecord",
  "healthRecord", "medicalIncident", "vaccination",
  "hostelRoom", "hostelAssignment", "mealPlan", "visitorLog",
  "activity", "activityEnrollment", "competition",
  "course", "courseModule", "lesson", "courseEnrollment", "lessonProgress",
  "quiz", "quizAttempt", "submission", "liveClass", "liveClassAttendance",
  "discussion", "discussionReply", "certificate",
  "notice", "candidate", "parent", "idSequence",
  "subscription", "schoolWebsite",
]);

function isTenantScoped(model: string | undefined): boolean {
  if (!model) return false;
  return TENANT_SCOPED_MODELS.has(model);
}

function injectTenantWhere(args: any, tenantId: string) {
  if (!args) args = {};
  if (!args.where) args.where = {};
  args.where.tenantId = tenantId;
  return args;
}

function injectTenantData(args: any, tenantId: string) {
  if (!args) args = {};
  if (!args.data) args.data = {};
  if (Array.isArray(args.data)) {
    args.data = args.data.map((d: any) => ({ ...d, tenantId }));
  } else {
    args.data.tenantId = tenantId;
  }
  return args;
}

/**
 * Execute a callback with automatic tenant scoping on every Prisma query.
 *
 * - findMany / findFirst / findUnique / count / aggregate / groupBy → injects tenantId into where
 * - create / createMany → injects tenantId into data
 * - update / updateMany / delete / deleteMany / upsert → injects tenantId into where
 *
 * This replaces the previous RLS-based approach with application-level enforcement
 * that works with any Postgres provider (including serverless/pooled connections).
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  const extended = prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (isTenantScoped(model)) injectTenantWhere(args, tenantId);
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (isTenantScoped(model)) injectTenantWhere(args, tenantId);
          return query(args);
        },
        async findUnique({ model, args, query }) {
          // findUnique uses unique fields — we can't inject tenantId into the where
          // but we post-filter to ensure the result belongs to the tenant
          const result = await query(args);
          if (result && isTenantScoped(model) && (result as any).tenantId !== tenantId) {
            return null;
          }
          return result;
        },
        async count({ model, args, query }) {
          if (isTenantScoped(model)) injectTenantWhere(args, tenantId);
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (isTenantScoped(model)) injectTenantWhere(args, tenantId);
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (isTenantScoped(model)) injectTenantWhere(args, tenantId);
          return query(args);
        },
        async create({ model, args, query }) {
          if (isTenantScoped(model)) injectTenantData(args, tenantId);
          return query(args);
        },
        async createMany({ model, args, query }) {
          if (isTenantScoped(model)) injectTenantData(args, tenantId);
          return query(args);
        },
        async update({ model, args, query }) {
          if (isTenantScoped(model)) injectTenantWhere(args, tenantId);
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (isTenantScoped(model)) injectTenantWhere(args, tenantId);
          return query(args);
        },
        async upsert({ model, args, query }) {
          if (isTenantScoped(model)) {
            injectTenantWhere(args, tenantId);
            if (args.create) (args.create as any).tenantId = tenantId;
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          if (isTenantScoped(model)) injectTenantWhere(args, tenantId);
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (isTenantScoped(model)) injectTenantWhere(args, tenantId);
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;

  return fn(extended);
}
