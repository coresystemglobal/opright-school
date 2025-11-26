import { Router } from "express";
import { withTenant } from "../utils/withTenant";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { studentId, date, status, remarks } = req.body;
    const tenantId = req.tenantId!;
    
    const attendance = await withTenant(tenantId, (tx) =>
      tx.attendance.create({ 
        data: { 
          tenantId, 
          studentId, 
          date: new Date(date), 
          status: status as any,
          remarks 
        } 
      })
    );
    res.status(201).json(attendance);
  } catch (e) { next(e); }
});

router.get("/student/:studentId", async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const tenantId = req.tenantId!;
    
    const attendance = await withTenant(tenantId, (tx) =>
      tx.attendance.findMany({ 
        where: { studentId },
        orderBy: { date: "desc" }
      })
    );
    res.json(attendance);
  } catch (e) { next(e); }
});

export default router;