import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { ValidationError } from "../../utils/errors";
import { uuidSchema } from "../../utils/validation";
import { AIInsightsService } from "./service";

const service = new AIInsightsService(prisma);

const paramsSchema = z.object({ studentId: uuidSchema });

export const aiController = {
  async getStudentInsights(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });

      const { studentId } = paramsSchema.parse(req.params);
      const refresh = req.query.refresh === "true";
      const role = (req.user?.role as string | undefined)?.toUpperCase() ?? "";

      const result = await service.getStudentInsights(req.tenantId, studentId, { refresh });

      // Parents only see their own lens — strip teacher-specific recommendations
      if (role === "PARENT") {
        const { teacherRecommendations: _omit, ...parentData } = result.data;
        return res.json({ ...result, data: parentData });
      }

      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes("ANTHROPIC_API_KEY")) {
        return res.status(503).json({ error: "AI insights are not available — contact your administrator" });
      }
      next(error);
    }
  },
};
