import { Router } from "express";
import {
  certificateController,
  discussionController,
  liveClassController,
  quizController,
  submissionController,
} from "./controller";

const router = Router();

// Quizzes
router.post("/quizzes", quizController.createQuiz);
router.get("/quizzes", quizController.getQuizzes);
router.post("/quizzes/:id/submit", quizController.submitQuiz);
router.get("/quizzes/:id/attempts", quizController.getAttempts);

// Submissions
router.post("/assignments/:assignmentId/submit", submissionController.submitAssignment);
router.get("/submissions", submissionController.getSubmissions);
router.put("/submissions/:id/grade", submissionController.gradeSubmission);

// Live Classes
router.post("/live-classes", liveClassController.createClass);
router.get("/live-classes", liveClassController.getClasses);
router.put("/live-classes/:id", liveClassController.updateClass);
router.post("/live-classes/:id/attendance", liveClassController.recordAttendance);
router.get("/live-classes/:id/attendance", liveClassController.getAttendance);

// Discussions
router.post("/discussions", discussionController.createDiscussion);
router.get("/discussions/:courseId", discussionController.getDiscussions);
router.post("/discussions/:id/replies", discussionController.addReply);
router.put("/discussions/:id/pin", discussionController.pinDiscussion);

// Certificates
router.post("/certificates", certificateController.generateCertificate);
router.get("/certificates/:studentId", certificateController.getCertificates);
router.get("/certificates/verify/:certificateNumber", certificateController.verifyCertificate);

export default router;
