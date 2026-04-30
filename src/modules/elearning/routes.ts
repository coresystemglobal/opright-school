import { Router } from "express";
import { requireRole } from "../../middleware/auth";
import {
  certificateController,
  discussionController,
  liveClassController,
  quizController,
  recordedLessonController,
  submissionController,
} from "./controller";

const router = Router();

// Quizzes
router.post("/quizzes", requireRole("ADMIN", "TEACHER"), quizController.createQuiz);
router.get("/quizzes", quizController.getQuizzes);
router.get("/quizzes/:id", quizController.getQuiz);
router.put("/quizzes/:id", requireRole("ADMIN", "TEACHER"), quizController.updateQuiz);
router.post("/quizzes/:id/publish", requireRole("ADMIN", "TEACHER"), quizController.publishQuiz);
router.post("/quizzes/:id/close", requireRole("ADMIN", "TEACHER"), quizController.closeQuiz);
router.post("/quizzes/:id/start", requireRole("STUDENT"), quizController.startQuiz);
router.post("/quizzes/:id/submit", requireRole("STUDENT"), quizController.submitQuiz);
router.post("/quizzes/:id/staff-submit", requireRole("ADMIN", "TEACHER"), quizController.staffSubmitQuiz);
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

// Recorded Lessons
router.get("/recorded-courses", recordedLessonController.getRecordedCourses);
router.post("/lessons/:lessonId/progress", recordedLessonController.syncProgress);

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
