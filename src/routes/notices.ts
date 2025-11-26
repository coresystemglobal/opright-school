import { Router } from "express";

const router = Router();

// TODO: Add Notice model to schema and implement routes
// Notice feature is part of Tier 2 - Communication System

router.post("/", async (req, res) => {
  res.status(501).json({ error: "Notice feature not yet implemented" });
});

router.get("/", async (req, res) => {
  res.status(501).json({ error: "Notice feature not yet implemented" });
});

export default router;