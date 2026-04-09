import { Router } from "express";
import { withTenant } from "../utils/withTenant";
import { CacheService } from "../utils/cache";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const cached = await CacheService.get(tenantId, "students");
    if (cached) return res.json(cached);

    const students = await withTenant(tenantId, (tx) =>
      tx.student.findMany({ orderBy: { createdAt: "desc" } })
    );
    await CacheService.set(tenantId, "students", students, 300);
    res.json(students);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const student = await withTenant(tenantId, (tx) =>
      tx.student.create({ data: { ...req.body, tenantId } })
    );
    await CacheService.invalidate(tenantId, "students");
    res.status(201).json(student);
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const student = await withTenant(tenantId, (tx) =>
      tx.student.findUnique({ where: { id: req.params.id } })
    );
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const student = await withTenant(tenantId, (tx) =>
      tx.student.update({ where: { id: req.params.id }, data: req.body })
    );
    await CacheService.invalidate(tenantId, "students");
    res.json(student);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    await withTenant(tenantId, (tx) =>
      tx.student.delete({ where: { id: req.params.id } })
    );
    await CacheService.invalidate(tenantId, "students");
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
