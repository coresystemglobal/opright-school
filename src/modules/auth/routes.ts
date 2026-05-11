import { Router } from "express";
import { authLimiter } from "../../middleware/rateLimiter";
import { authMiddleware } from "../../middleware/auth";
import { authController } from "./controller";

const router = Router();

router.post("/login", authLimiter, authController.login);
router.post("/register", authLimiter, authController.register);
router.post("/student-login", authLimiter, authController.studentLogin);
router.post("/refresh", authLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.get("/verify-email", authController.verifyEmail);
router.post("/change-password", authMiddleware, authController.changePassword);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password", authLimiter, authController.resetPassword);

export default router;
