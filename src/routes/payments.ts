import { Router } from "express";
import { withTenant } from "../utils/withTenant";

const router = Router();

router.post("/fees", async (req, res, next) => {
  try {
    const { name, amount, dueDate } = req.body;
    const tenantId = req.tenantId!;
    
    const fee = await withTenant(tenantId, (tx) =>
      tx.fee.create({ data: { tenantId, name, amount, dueDate: new Date(dueDate) } })
    );
    res.status(201).json(fee);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { feeId, studentId, amount, method } = req.body;
    const tenantId = req.tenantId!;
    
    const payment = await withTenant(tenantId, (tx) =>
      tx.payment.create({ 
        data: { tenantId, feeId, studentId, amount, method, status: "SUCCESS" as any }
      })
    );
    res.status(201).json(payment);
  } catch (e) { next(e); }
});

router.get("/student/:studentId", async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const tenantId = req.tenantId!;
    
    const payments = await withTenant(tenantId, (tx) =>
      tx.payment.findMany({ where: { studentId } })
    );
    res.json(payments);
  } catch (e) { next(e); }
});

export default router;