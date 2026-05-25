import { PrismaClient } from "@prisma/client";
import { config } from "../../config";
import { CacheService } from "../../utils/cache";
import { AttendanceService } from "../attendance/service";
import { GradebookService } from "../gradebook/service";
import { TermService } from "../terms/service";
import { buildInsightPrompt, InsightPromptContext } from "./prompts";

type InsightData = {
  strengths: string;
  concerns: string;
  parentRecommendations: string[];
  teacherRecommendations: string[];
};

export type InsightResponse = {
  studentId: string;
  studentName: string;
  generatedAt: string;
  cached: boolean;
  data: InsightData;
};

const CACHE_TTL = 86400; // 24 hours
const CACHE_RESOURCE = "ai-insights";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export class AIInsightsService {
  private attendanceService: AttendanceService;
  private gradebookService: GradebookService;
  private termService: TermService;

  constructor(private prisma: PrismaClient) {
    this.attendanceService = new AttendanceService(prisma);
    this.gradebookService = new GradebookService(prisma);
    this.termService = new TermService(prisma);
  }

  async getStudentInsights(
    tenantId: string,
    studentId: string,
    options?: { refresh?: boolean }
  ): Promise<InsightResponse> {
    if (!config.ai.anthropicApiKey) {
      throw new Error("AI insights not configured — ANTHROPIC_API_KEY is missing");
    }

    if (!options?.refresh) {
      const cached = await CacheService.get<InsightResponse>(tenantId, CACHE_RESOURCE, studentId);
      if (cached) return { ...cached, cached: true };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [student, attendanceStats, currentTerm, recentGradesRaw] = await Promise.all([
      this.prisma.student.findFirst({
        where: { id: studentId, tenantId },
        select: { firstName: true, lastName: true },
      }),
      this.attendanceService.getAttendanceStats(tenantId, studentId, thirtyDaysAgo, now),
      this.termService.getCurrent(tenantId),
      this.gradebookService.getStudentGrades(tenantId, studentId),
    ]);

    if (!student) throw new Error("Student not found");

    const studentName = `${student.firstName} ${student.lastName}`;

    // Fetch report card only if there's a current term; else derive subject summaries from raw grades
    let subjects: InsightPromptContext["subjects"] = [];
    let overallAverage: number | null = null;
    let termName = "Current Period";

    if (currentTerm) {
      termName = currentTerm.name;
      const reportCard = await this.gradebookService.getStudentReportCard(tenantId, studentId, currentTerm.id);
      overallAverage = reportCard.overallAverage ?? null;
      subjects = reportCard.subjects.map((s: { subjectName: string; average: number; grades: unknown[] }) => ({
        subjectName: s.subjectName,
        average: s.average,
        gradeCount: s.grades.length,
      }));
    } else {
      // No current term — derive from raw grades grouped by subject
      const bySubject = new Map<string, { scores: number[]; maxScores: number[] }>();
      for (const g of recentGradesRaw) {
        const name = (g as { subject?: { name?: string } }).subject?.name ?? "Unknown";
        if (!bySubject.has(name)) bySubject.set(name, { scores: [], maxScores: [] });
        const entry = bySubject.get(name)!;
        entry.scores.push((g as { score: number }).score);
        entry.maxScores.push((g as { maxScore: number }).maxScore);
      }
      for (const [name, { scores, maxScores }] of bySubject.entries()) {
        const totalScore = scores.reduce((a, b) => a + b, 0);
        const totalMax = maxScores.reduce((a, b) => a + b, 0);
        subjects.push({
          subjectName: name,
          average: totalMax > 0 ? (totalScore / totalMax) * 100 : 0,
          gradeCount: scores.length,
        });
      }
    }

    // Shape last 8 grades for the trend section
    const recentGrades: InsightPromptContext["recentGrades"] = recentGradesRaw
      .slice(0, 8)
      .map((g: {
        subject?: { name?: string };
        assignment?: { title?: string } | null;
        score: number;
        maxScore: number;
      }) => ({
        subjectName: g.subject?.name ?? "Unknown",
        assignmentTitle: g.assignment?.title ?? "Unlinked grade",
        score: g.score,
        maxScore: g.maxScore,
        percentage: g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0,
      }));

    const prompt = buildInsightPrompt({ studentName, termName, attendance: attendanceStats, subjects, overallAverage, recentGrades });
    const insightData = await this.callClaude(prompt);

    const result: InsightResponse = {
      studentId,
      studentName,
      generatedAt: now.toISOString(),
      cached: false,
      data: insightData,
    };

    await CacheService.set(tenantId, CACHE_RESOURCE, result, CACHE_TTL, studentId);
    return result;
  }

  private async callClaude(prompt: string): Promise<InsightData> {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": config.ai.anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "unknown");
      throw new Error(`Claude API error (${res.status}): ${errorText}`);
    }

    const json = (await res.json()) as { content: { type: string; text: string }[] };
    const text = json.content?.find(c => c.type === "text")?.text ?? "";

    try {
      return JSON.parse(text) as InsightData;
    } catch {
      // Claude occasionally wraps JSON in markdown code fences — strip them and retry
      const stripped = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
      return JSON.parse(stripped) as InsightData;
    }
  }
}
