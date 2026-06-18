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
import { auditMiddleware } from "./middleware/audit";
import auditRoutes from "./modules/audit/routes";
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
import notificationRoutes from "./modules/notifications/routes";
import settingsRoutes from "./modules/settings/routes";
import onboardingRoutes from "./modules/onboarding/routes";
import parentRoutes from "./modules/parent/routes";
import paymentRoutes from "./modules/payments/routes";
import { paymentController } from "./modules/payments/controller";
import queueRoutes from "./modules/queue/routes";
import roleRoutes from "./modules/roles/routes";
import sportsRoutes from "./modules/sports/routes";
import studentRoutes from "./modules/students/routes";
import studentSelfRoutes from "./modules/student-self/routes";
import subjectRoutes from "./modules/subjects/routes";
import teacherRoutes from "./modules/teachers/routes";
import termRoutes from "./modules/terms/routes";
import timetableRoutes from "./modules/timetables/routes";
import transportRoutes from "./modules/transport/routes";
import uploadRoutes from "./modules/upload/routes";
import platformRoutes from "./modules/platform/routes";
import { platformController } from "./modules/platform/controller";
import feesRoutes from "./modules/fees/routes";
import aiRoutes from "./modules/ai/routes";
import websiteDomainRoutes from "./modules/school-website/domain.routes";
import { CacheService } from "./utils/cache";
import { buildCorsOptions } from "./utils/cors";

const app = express();
app.use(helmet());
app.use(cors(buildCorsOptions()));
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
app.use("/queue", queueRoutes);
app.post("/payments/webhook", express.raw({ type: 'application/json' }), paymentController.paystackWebhook);
// MASTER login — no tenant header required; platform-level auth
app.post("/master/login", platformController.login);
app.use(tenantMiddleware);

app.use("/auth", authRoutes);
app.use("/roles", roleRoutes);
app.use("/audit-logs", authMiddleware, requireRole("ADMIN"), auditRoutes);

// Platform (MASTER-only) — uses its own masterAuthMiddleware, no tenant required
app.use("/platform", platformRoutes);

// Auth + audit for all routes below
app.use(authMiddleware, auditMiddleware);

app.use("/students", requireRole("ADMIN", "TEACHER"), studentRoutes);
app.use("/teachers", requireRole("ADMIN", "TEACHER"), teacherRoutes);
app.use("/classes", requireRole("ADMIN", "TEACHER"), classRoutes);
app.use("/attendance", requireRole("ADMIN", "TEACHER"), attendanceRoutes);
app.use("/notices", noticeRoutes);
app.use("/notifications", notificationRoutes);
app.use("/settings", settingsRoutes);
app.use("/payments", requireRole("ADMIN"), paymentRoutes);
app.use("/academic-years", academicYearRoutes);
app.use("/terms", termRoutes);
app.use("/subjects", subjectRoutes);
app.use("/timetables", timetableRoutes);
app.use("/attendances", requireRole("ADMIN", "TEACHER"), attendancesRoutes);
app.use("/gradebook", gradebookRoutes);
app.use("/library", libraryRoutes);
app.use("/transport", requireRole("ADMIN", "STAFF"), transportRoutes);
app.use("/inventory", requireRole("ADMIN", "STAFF"), inventoryRoutes);
app.use("/events", requireRole("ADMIN", "TEACHER"), eventRoutes);
app.use("/disciplinary", requireRole("ADMIN", "PRINCIPAL", "TEACHER"), disciplinaryRoutes);
app.use("/health", requireRole("ADMIN", "STAFF"), healthRoutes);
app.use("/hostel", requireRole("ADMIN", "STAFF"), hostelRoutes);
app.use("/sports", requireRole("ADMIN", "TEACHER"), sportsRoutes);
app.use("/upload", uploadRoutes);
app.use("/parent", requireRole("PARENT"), parentRoutes);
app.use("/parents", requireRole("ADMIN"), parentRoutes);
app.use("/student/me", requireRole("STUDENT"), studentSelfRoutes);
app.use("/candidates", requireRole("ADMIN"), candidateRoutes);
app.use("/courses", requireRole("ADMIN", "TEACHER"), courseRoutes);
app.use("/elearning", elearningRoutes);
app.use("/billing", requireRole("ADMIN"), billingRoutes);
app.use("/fees", requireRole("ADMIN"), feesRoutes);
app.use("/api/admin/website/domain", requireRole("ADMIN"), websiteDomainRoutes);
app.use("/ai", requireRole("ADMIN", "TEACHER", "PARENT"), aiRoutes);

app.use(errorHandler);

export default app;
