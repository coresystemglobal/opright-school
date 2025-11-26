import { Router } from "express";
import { withTenant } from "../utils/withTenant";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const students = await withTenant(tenantId, (tx) =>
      tx.student.findMany({ orderBy: { createdAt: "desc" } })
    );
    res.json(students);
  } catch (e) { next(e); }
});

export default router;