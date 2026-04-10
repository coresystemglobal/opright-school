import { Router } from "express";
import { apiLimiter } from "../../middleware/rateLimiter";
import { onboardingController } from "./controller";

const router = Router();

router.post("/school", apiLimiter, onboardingController.createSchool);

export default router;
