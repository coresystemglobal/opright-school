import { Router } from "express";
import { withTenant } from "../utils/withTenant";
import { CacheService } from "../utils/cache";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const cached = await CacheService.get(tenantId, "teachers");
    if (cached) return res.json(cached);

    const teachers = await withTenant(tenantId, (tx) =>
      tx.teacher.findMany({ orderBy: { createdAt: "desc" } })
    );
    await CacheService.set(tenantId, "teachers", teachers, 300);
    res.json(teachers);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const teacher = await withTenant(tenantId, (tx) =>
      tx.teacher.create({ data: { ...req.body, tenantId } })
    );
    await CacheService.invalidate(tenantId, "teachers");
    res.status(201).json(teacher);
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const teacher = await withTenant(tenantId, (tx) =>
      tx.teacher.update({ where: { id: req.params.id }, data: req.body })
    );
    await CacheService.invalidate(tenantId, "teachers");
    res.json(teacher);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    await withTenant(tenantId, (tx) =>
      tx.teacher.delete({ where: { id: req.params.id } })
    );
    await CacheService.invalidate(tenantId, "teachers");
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
