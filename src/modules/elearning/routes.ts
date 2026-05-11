import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import {
  certificateController,
  discussionController,
  joinLiveClassController,
  liveClassController,
  quizController,
  recordedLessonController,
  studentElearningController,
  submissionController,
} from "./controller";

const router = Router();

router.use(authMiddleware);

// ── Student self-service (/elearning/me/*) ────────────────────────────────────
router.get("/me/courses", studentElearningController.getMyCourses);
router.get("/me/courses/:id", studentElearningController.getCourse);
router.get("/me/live-classes", studentElearningController.getUpcomingLiveClasses);
router.get("/me/quizzes", studentElearningController.getMyQuizzes);

// ── Quizzes ───────────────────────────────────────────────────────────────────
router.post("/quizzes", authorize("elearning", "create"), quizController.createQuiz);
router.get("/quizzes", authorize("elearning", "read"), quizController.getQuizzes);
router.get("/quizzes/:id", authorize("elearning", "read"), quizController.getQuiz);
router.put("/quizzes/:id", authorize("elearning", "update"), quizController.updateQuiz);
router.post("/quizzes/:id/publish", authorize("elearning", "update"), quizController.publishQuiz);
router.post("/quizzes/:id/close", authorize("elearning", "update"), quizController.closeQuiz);
router.post("/quizzes/:id/start", authorize("elearning", "update"), quizController.startQuiz);
router.post("/quizzes/:id/submit", authorize("elearning", "update"), quizController.submitQuiz);
router.post("/quizzes/:id/staff-submit", authorize("elearning", "update"), quizController.staffSubmitQuiz);
router.get("/quizzes/:id/attempts", authorize("elearning", "read"), quizController.getAttempts);

// ── Submissions ───────────────────────────────────────────────────────────────
router.post("/assignments/:assignmentId/submit", submissionController.submitAssignment);
router.get("/submissions", authorize("elearning", "read"), submissionController.getSubmissions);
router.put("/submissions/:id/grade", authorize("elearning", "update"), submissionController.gradeSubmission);

// ── Live Classes ──────────────────────────────────────────────────────────────
router.post("/live-classes", authorize("elearning", "create"), liveClassController.createClass);
router.get("/live-classes", authorize("elearning", "read"), liveClassController.getClasses);
router.put("/live-classes/:id", authorize("elearning", "update"), liveClassController.updateClass);
router.post("/live-classes/:id/join", joinLiveClassController.join);
router.post("/live-classes/:id/attendance", authorize("elearning", "create"), liveClassController.recordAttendance);
router.get("/live-classes/:id/attendance", authorize("elearning", "read"), liveClassController.getAttendance);

// ── Recorded Lessons ──────────────────────────────────────────────────────────
router.get("/recorded-courses", authorize("elearning", "read"), recordedLessonController.getRecordedCourses);
router.post("/lessons/:lessonId/progress", recordedLessonController.syncProgress);

// ── Discussions ───────────────────────────────────────────────────────────────
router.post("/discussions", discussionController.createDiscussion);
router.get("/discussions/:courseId", discussionController.getDiscussions);
router.post("/discussions/:id/replies", discussionController.addReply);
router.put("/discussions/:id/pin", authorize("elearning", "update"), discussionController.pinDiscussion);

// ── Certificates ──────────────────────────────────────────────────────────────
router.post("/certificates", authorize("elearning", "create"), certificateController.generateCertificate);
router.get("/certificates/:studentId", authorize("elearning", "read"), certificateController.getCertificates);
router.get("/certificates/verify/:certificateNumber", authorize("elearning", "read"), certificateController.verifyCertificate);

export default router;
