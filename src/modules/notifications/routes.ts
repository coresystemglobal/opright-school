import { Router } from "express";
import { notificationController } from "./controller";

const router = Router();

router.get("/", notificationController.list);
router.get("/unread-count", notificationController.unreadCount);
router.post("/mark-read", notificationController.markRead);
router.post("/mark-all-read", notificationController.markAllRead);
router.get("/vapid-key", notificationController.vapidPublicKey);
router.post("/push/subscribe", notificationController.subscribe);
router.post("/push/unsubscribe", notificationController.unsubscribe);

export default router;
