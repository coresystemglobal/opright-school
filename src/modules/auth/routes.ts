import { Router } from "express";
import { authLimiter } from "../../middleware/rateLimiter";
import { authController } from "./controller";

const router = Router();

router.post("/login", authLimiter, authController.login);
router.post("/register", authLimiter, authController.register);
router.post("/student-login", authLimiter, authController.studentLogin);

export default router;
