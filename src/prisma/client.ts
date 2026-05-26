import { PrismaClient } from "@prisma/client";
import { appMetrics, logger, attachPrismaObservability } from "../observability";

const prisma = new PrismaClient();

attachPrismaObservability(
  prisma,
  logger.child({ module: 'prisma' }),
  appMetrics.dbQueryDuration,
  appMetrics.dbQueryErrors,
);

export default prisma;
