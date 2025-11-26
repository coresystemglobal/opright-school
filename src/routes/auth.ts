import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { withTenant } from "../utils/withTenant";

const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const tenantId = req.tenantId!;

    const user = await withTenant(tenantId, (tx) =>
      tx.user.findFirst({ 
        where: { email },
        include: { role: true }
      })
    );

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, tenantId, roleId: user.roleId },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.json({ token, user: { id: user.id, email: user.email, roleId: user.roleId, role: user.role } });
  } catch (e) { next(e); }
});

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, roleId } = req.body;
    const tenantId = req.tenantId!;
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await withTenant(tenantId, (tx) =>
      tx.user.create({
        data: { tenantId, email, password: hashedPassword, firstName, lastName, roleId }
      })
    );

    res.status(201).json({ id: user.id, email: user.email, roleId: user.roleId });
  } catch (e) { next(e); }
});

export default router;