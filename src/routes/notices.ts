import { Router } from "express";

const router = Router();

// Notices/Announcements require a Notice model in the Prisma schema before these
// routes can be implemented. Add the model and a migration, then implement here.

router.post("/", (_req, res) => {
  res.status(501).json({ error: "Not implemented — Notice model required in schema" });
});

router.get("/", (_req, res) => {
  res.status(501).json({ error: "Not implemented — Notice model required in schema" });
});

export default router;
