import { Router } from "express";
import { sportsController } from './controller';

const router = Router();

router.post("/activities", sportsController.createActivity);
router.get("/activities", sportsController.getActivities);
router.post("/enrollments", sportsController.enrollStudent);
router.post("/competitions", sportsController.createCompetition);
router.get("/competitions", sportsController.getCompetitions);

export default router;
