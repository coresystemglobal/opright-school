import express from "express";
import helmet from "helmet";
import cors from "cors";
import { tenantMiddleware } from "./middleware/tenant";
import { authMiddleware, requireRole } from "./middleware/auth";
import { loggingMiddleware } from "./middleware/logging";
import { monitoringMiddleware } from "./middleware/monitoring";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import authRoutes from "./routes/auth";
import roleRoutes from "./routes/roles";
import studentRoutes from "./routes/students";
import teacherRoutes from "./routes/teachers";
import classRoutes from "./routes/classes";
import attendanceRoutes from "./routes/attendance";
import gradeRoutes from "./routes/grades";
import noticeRoutes from "./routes/notices";
import paymentRoutes from "./routes/payments";
import academicYearRoutes from "./routes/academicYears";
import termRoutes from "./routes/terms";
import subjectRoutes from "./routes/subjects";
import timetableRoutes from "./routes/timetables";
import attendancesRoutes from "./routes/attendances";
import gradebookRoutes from "./routes/gradebook";
import libraryRoutes from "./routes/library";
import transportRoutes from "./routes/transport";
import inventoryRoutes from "./routes/inventory";
import eventRoutes from "./routes/events";
import disciplinaryRoutes from "./routes/disciplinary";
import healthRoutes from "./routes/health";
import hostelRoutes from "./routes/hostel";
import sportsRoutes from "./routes/sports";
import uploadRoutes from "./routes/upload";
import parentRoutes from "./routes/parent";
import courseRoutes from "./routes/courses";
import elearningRoutes from "./routes/elearning";
import queueRoutes from "./routes/queue";
import docsRoutes from "./routes/docs";
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

app.get("/health", async (_req, res) => {
  const cache = await Promise.race<string>([
    CacheService.ping().then(() => "ok").catch(() => "unavailable"),
    new Promise((resolve) => setTimeout(() => resolve("timeout"), 1500)),
  ]);
  res.json({ status: 'ok', cache });
});

app.use("/docs", docsRoutes);
app.use(tenantMiddleware);
app.use("/queue", queueRoutes); // QStash webhooks — no auth
app.use("/auth", authRoutes);
app.use("/roles", roleRoutes);
app.use("/students", authMiddleware, requireRole("ADMIN", "TEACHER"), studentRoutes);
app.use("/teachers", authMiddleware, requireRole("ADMIN"), teacherRoutes);
app.use("/classes", authMiddleware, requireRole("ADMIN", "TEACHER"), classRoutes);
app.use("/attendance", authMiddleware, requireRole("ADMIN", "TEACHER"), attendanceRoutes);
app.use("/grades", authMiddleware, requireRole("ADMIN", "TEACHER"), gradeRoutes);
app.use("/notices", authMiddleware, noticeRoutes);
app.use("/payments", authMiddleware, requireRole("ADMIN"), paymentRoutes);
app.use("/academic-years", authMiddleware, academicYearRoutes);
app.use("/terms", authMiddleware, termRoutes);
app.use("/subjects", authMiddleware, subjectRoutes);
app.use("/timetables", authMiddleware, timetableRoutes);
app.use("/attendances", authMiddleware, attendancesRoutes);
app.use("/gradebook", authMiddleware, gradebookRoutes);
app.use("/library", authMiddleware, requireRole("ADMIN", "TEACHER", "STAFF"), libraryRoutes);
app.use("/transport", authMiddleware, requireRole("ADMIN", "STAFF"), transportRoutes);
app.use("/inventory", authMiddleware, requireRole("ADMIN", "STAFF"), inventoryRoutes);
app.use("/events", authMiddleware, requireRole("ADMIN", "TEACHER"), eventRoutes);
app.use("/disciplinary", authMiddleware, requireRole("ADMIN", "PRINCIPAL", "TEACHER"), disciplinaryRoutes);
app.use("/health", authMiddleware, requireRole("ADMIN", "STAFF"), healthRoutes);
app.use("/hostel", authMiddleware, requireRole("ADMIN", "STAFF"), hostelRoutes);
app.use("/sports", authMiddleware, requireRole("ADMIN", "TEACHER"), sportsRoutes);
app.use("/upload", authMiddleware, uploadRoutes);
app.use("/parent", authMiddleware, requireRole("PARENT"), parentRoutes);
app.use("/courses", authMiddleware, requireRole("ADMIN", "TEACHER"), courseRoutes);
app.use("/elearning", authMiddleware, elearningRoutes);

app.use(errorHandler);

export default app;
