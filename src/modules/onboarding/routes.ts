import { Router } from "express";
import { apiLimiter } from "../../middleware/rateLimiter";
import { onboardingController } from "./controller";
import { getPricingComparison } from "../billing/pricing";

const router = Router();

router.get("/pricing", (_req, res) => {
  res.json({ pricing: getPricingComparison() });
});

router.post("/school", apiLimiter, onboardingController.createSchool);

export default router;
