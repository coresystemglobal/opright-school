import { Router } from "express";

const router = Router();

// NOTE: Grade and exam functionality has been moved to /gradebook routes
// Use the following endpoints instead:
// - POST /gradebook/examinations - Create examination
// - POST /gradebook/exam-results - Record exam result
// - POST /gradebook/grades - Record grade
// - GET /gradebook/grades/student/:studentId - Get student grades

router.post("/exams", async (req, res) => {
  res.status(301).json({ 
    error: "This endpoint has moved",
    newEndpoint: "POST /gradebook/examinations"
  });
});

router.post("/", async (req, res) => {
  res.status(301).json({ 
    error: "This endpoint has moved",
    newEndpoint: "POST /gradebook/grades"
  });
});

router.get("/student/:studentId", async (req, res) => {
  res.status(301).json({ 
    error: "This endpoint has moved",
    newEndpoint: "GET /gradebook/grades/student/:studentId"
  });
});

export default router;