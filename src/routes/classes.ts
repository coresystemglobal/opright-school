import { Router } from "express";
import { withTenant } from "../utils/withTenant";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const classes = await withTenant(tenantId, (tx) =>
      tx.class.findMany({ orderBy: { createdAt: "desc" } })
    );
    res.json(classes);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, level, teacherId } = req.body;
    const tenantId = req.tenantId!;
    const newClass = await withTenant(tenantId, (tx) =>
      tx.class.create({ data: { tenantId, name, level, teacherId } })
    );
    res.status(201).json(newClass);
  } catch (e) { next(e); }
});

router.post("/:classId/enroll", async (req, res, next) => {
  try {
    const { studentId } = req.body;
    const { classId } = req.params;
    const tenantId = req.tenantId!;
    
    const enrollment = await withTenant(tenantId, (tx) =>
      tx.enrollment.create({ data: { tenantId, studentId, classId } })
    );
    res.status(201).json(enrollment);
  } catch (e) { next(e); }
});

export default router;