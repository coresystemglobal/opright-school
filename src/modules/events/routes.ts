import { Router } from "express";
import { eventController } from './controller';

const router = Router();

router.post("/", eventController.create);
router.get("/", eventController.list);
router.get("/upcoming", eventController.getUpcoming);
router.post("/:id/participants", eventController.addParticipant);
router.get("/:id/participants", eventController.getParticipants);

export default router;
