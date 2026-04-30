import express from "express";
import helmet from "helmet";
import cors from "cors";
import { tenantMiddleware } from "./middleware/tenant";
import { authMiddleware, requireRole } from "./middleware/auth";
import { loggingMiddleware } from "./middleware/logging";
import { monitoringMiddleware } from "./middleware/monitoring";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import { domainRewriteMiddleware } from "./middleware/domain-rewrite";
import billingRoutes from "./modules/billing/routes";
import academicYearRoutes from "./modules/academicYears/routes";
import attendanceRoutes from "./modules/attendance/legacyRoutes";
import attendancesRoutes from "./modules/attendance/routes";
import authRoutes from "./modules/auth/routes";
import candidateRoutes from "./modules/candidates/routes";
import classRoutes from "./modules/classes/routes";
import courseRoutes from "./modules/courses/routes";
import disciplinaryRoutes from "./modules/disciplinary/routes";
import docsRoutes from "./modules/docs/routes";
import elearningRoutes from "./modules/elearning/routes";
import eventRoutes from "./modules/events/routes";
import gradebookRoutes from "./modules/gradebook/routes";
import healthRoutes from "./modules/health/routes";
import hostelRoutes from "./modules/hostel/routes";
import inventoryRoutes from "./modules/inventory/routes";
import libraryRoutes from "./modules/library/routes";
import noticeRoutes from "./modules/notices/routes";
import onboardingRoutes from "./modules/onboarding/routes";
import parentRoutes from "./modules/parent/routes";
import paymentRoutes from "./modules/payments/routes";
import queueRoutes from "./modules/queue/routes";
import roleRoutes from "./modules/roles/routes";
import sportsRoutes from "./modules/sports/routes";
import studentRoutes from "./modules/students/routes";
import subjectRoutes from "./modules/subjects/routes";
import teacherRoutes from "./modules/teachers/routes";
import termRoutes from "./modules/terms/routes";
import timetableRoutes from "./modules/timetables/routes";
import transportRoutes from "./modules/transport/routes";
import uploadRoutes from "./modules/upload/routes";
import websiteDomainRoutes from "./modules/school-website/domain.routes";
import { CacheService } from "./utils/cache";

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

const app = express();
app.use(helmet());
app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : true,
  credentials: true,
}));
app.use(express.json());
app.use(apiLimiter);
app.use(loggingMiddleware);
app.use(monitoringMiddleware);
app.use(domainRewriteMiddleware);

app.get("/health", async (_req, res) => {
  const cache = await Promise.race<string>([
    CacheService.ping().then(() => "ok").catch(() => "unavailable"),
    new Promise((resolve) => setTimeout(() => resolve("timeout"), 1500)),
  ]);
  res.json({ status: 'ok', cache });
});

app.use("/docs", docsRoutes);
app.use("/onboarding", onboardingRoutes);
app.use(tenantMiddleware);
app.use("/queue", queueRoutes); // QStash webhooks — no auth
app.use("/auth", authRoutes);
app.use("/roles", roleRoutes);
app.use("/students", authMiddleware, requireRole("ADMIN", "TEACHER"), studentRoutes);
app.use("/teachers", authMiddleware, requireRole("ADMIN"), teacherRoutes);
app.use("/classes", authMiddleware, requireRole("ADMIN", "TEACHER"), classRoutes);
app.use("/attendance", authMiddleware, requireRole("ADMIN", "TEACHER"), attendanceRoutes);
app.use("/notices", authMiddleware, noticeRoutes);
app.use("/payments", authMiddleware, requireRole("ADMIN"), paymentRoutes);
app.use("/academic-years", authMiddleware, academicYearRoutes);
app.use("/terms", authMiddleware, termRoutes);
app.use("/subjects", authMiddleware, subjectRoutes);
app.use("/timetables", authMiddleware, timetableRoutes);
app.use("/attendances", authMiddleware, attendancesRoutes);
app.use("/gradebook", authMiddleware, gradebookRoutes);
app.use("/library", authMiddleware, libraryRoutes);
app.use("/transport", authMiddleware, requireRole("ADMIN", "STAFF"), transportRoutes);
app.use("/inventory", authMiddleware, requireRole("ADMIN", "STAFF"), inventoryRoutes);
app.use("/events", authMiddleware, requireRole("ADMIN", "TEACHER"), eventRoutes);
app.use("/disciplinary", authMiddleware, requireRole("ADMIN", "PRINCIPAL", "TEACHER"), disciplinaryRoutes);
app.use("/health", authMiddleware, requireRole("ADMIN", "STAFF"), healthRoutes);
app.use("/hostel", authMiddleware, requireRole("ADMIN", "STAFF"), hostelRoutes);
app.use("/sports", authMiddleware, requireRole("ADMIN", "TEACHER"), sportsRoutes);
app.use("/upload", authMiddleware, uploadRoutes);
app.use("/parent", authMiddleware, requireRole("PARENT"), parentRoutes);
app.use("/parents", authMiddleware, requireRole("ADMIN"), parentRoutes);
app.use("/candidates", authMiddleware, requireRole("ADMIN"), candidateRoutes);
app.use("/courses", authMiddleware, requireRole("ADMIN", "TEACHER"), courseRoutes);
app.use("/elearning", authMiddleware, elearningRoutes);
app.use("/billing", authMiddleware, requireRole("ADMIN"), billingRoutes);
app.use("/api/admin/website/domain", authMiddleware, requireRole("ADMIN"), websiteDomainRoutes);

app.use(errorHandler);

export default app;
