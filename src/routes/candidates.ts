import { Router } from "express";
import { validate } from "../middleware/validate";
import { candidateSchema } from "../utils/schemas";
import { CandidateService } from "../services/candidateService";
import prisma from "../prisma/client";

const router = Router();
const service = new CandidateService(prisma);

router.get("/", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    res.json(await service.list(tenantId));
  } catch (e) { next(e); }
});

router.post("/", validate(candidateSchema), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const candidate = await service.create(tenantId, req.body);
    res.status(201).json(candidate);
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const candidate = await service.getById(tenantId, req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    res.json(candidate);
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const candidate = await service.update(tenantId, req.params.id, req.body);
    res.json(candidate);
  } catch (e) { next(e); }
});

router.post("/:id/admit", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const student = await service.admit(tenantId, req.params.id);
    res.status(201).json(student);
  } catch (e) { next(e); }
});

export default router;
