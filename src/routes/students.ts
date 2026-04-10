import { Router } from "express";
import bcrypt from "bcryptjs";
import { withTenant } from "../utils/withTenant";
import { CacheService } from "../utils/cache";
import { StudentIdService } from "../services/studentIdService";
import prisma from "../prisma/client";

const router = Router();
const studentIdService = new StudentIdService(prisma);

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
    const { dob, guardian, ...rest } = req.body;

    const student = await withTenant(tenantId, async (tx) => {
      // Look up tenant schoolCode and student role in parallel
      const [tenant, studentRole] = await Promise.all([
        tx.tenant.findUnique({ where: { id: tenantId }, select: { schoolCode: true } }),
        tx.role.findFirst({ where: { tenantId, name: "Student" }, select: { id: true } }),
      ]);

      const studentData: any = { ...rest, tenantId };
      if (dob) studentData.dob = new Date(dob);
      if (guardian) studentData.guardian = guardian;

      // If the tenant has a schoolCode, auto-generate a studentCode and create a User account
      if (tenant?.schoolCode) {
        const studentCode = await studentIdService.generateStudentId(tenantId, tenant.schoolCode);

        // Default password: DOB as DDMMYYYY if provided, otherwise a fixed placeholder
        const defaultPassword = dob
          ? formatDobPassword(new Date(dob))
          : "change123";
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        const user = await tx.user.create({
          data: {
            tenantId,
            studentCode,
            password: hashedPassword,
            firstName: rest.firstName,
            lastName: rest.lastName,
            roleId: studentRole?.id ?? undefined,
          },
        });

        studentData.studentCode = studentCode;
        studentData.userId = user.id;
      }

      return tx.student.create({ data: studentData });
    });

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

/** Format a Date as DDMMYYYY for use as a default password */
function formatDobPassword(dob: Date): string {
  const dd = String(dob.getDate()).padStart(2, "0");
  const mm = String(dob.getMonth() + 1).padStart(2, "0");
  const yyyy = String(dob.getFullYear());
  return `${dd}${mm}${yyyy}`;
}

export default router;
