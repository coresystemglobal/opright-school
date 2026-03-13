import { Router } from "express";
import { withTenant } from "../utils/withTenant";
import { validate } from "../middleware/validate";
import { paymentSchema } from "../utils/schemas";
import { apiLimiter } from "../middleware/rateLimiter";
import { z } from "zod";

const router = Router();

const feeSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().transform(s => new Date(s))
});

const paymentCreateSchema = z.object({
  feeId: z.string(),
  studentId: z.string(),
  amount: z.number().positive(),
  method: z.string()
});

router.post("/fees", apiLimiter, validate(feeSchema), async (req, res, next) => {
  try {
    const { name, amount, dueDate } = req.body;
    const tenantId = req.tenantId!;
    
    const fee = await withTenant(tenantId, (tx) =>
      tx.fee.create({ data: { tenantId, name, amount, dueDate: new Date(dueDate) } })
    );
    res.status(201).json(fee);
  } catch (e) { next(e); }
});

router.post("/", apiLimiter, validate(paymentCreateSchema), async (req, res, next) => {
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