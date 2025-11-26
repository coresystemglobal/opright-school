import { Router } from "express";
import { withTenant } from "../utils/withTenant";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const teachers = await withTenant(tenantId, (tx) =>
      tx.teacher.findMany({ orderBy: { createdAt: "desc" } })
    );
    res.json(teachers);
  } catch (e) { next(e); }
});

export default router;