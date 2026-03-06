import { Router } from 'express';
import { QuizController, SubmissionController, LiveClassController, DiscussionController, CertificateController } from '../controllers/elearningController';

const router = Router();

// Quizzes
router.post('/quizzes', QuizController.createQuiz);
router.get('/quizzes', QuizController.getQuizzes);
router.post('/quizzes/:id/submit', QuizController.submitQuiz);
router.get('/quizzes/:id/attempts', QuizController.getAttempts);

// Submissions
router.post('/assignments/:assignmentId/submit', SubmissionController.submitAssignment);
router.get('/submissions', SubmissionController.getSubmissions);
router.put('/submissions/:id/grade', SubmissionController.gradeSubmission);

// Live Classes
router.post('/live-classes', LiveClassController.createClass);
router.get('/live-classes', LiveClassController.getClasses);
router.put('/live-classes/:id', LiveClassController.updateClass);
router.post('/live-classes/:id/attendance', LiveClassController.recordAttendance);
router.get('/live-classes/:id/attendance', LiveClassController.getAttendance);

// Discussions
router.post('/discussions', DiscussionController.createDiscussion);
router.get('/discussions/:courseId', DiscussionController.getDiscussions);
router.post('/discussions/:id/replies', DiscussionController.addReply);
router.put('/discussions/:id/pin', DiscussionController.pinDiscussion);

// Certificates
router.post('/certificates', CertificateController.generateCertificate);
router.get('/certificates/:studentId', CertificateController.getCertificates);
router.get('/certificates/verify/:certificateNumber', CertificateController.verifyCertificate);

export default router;
