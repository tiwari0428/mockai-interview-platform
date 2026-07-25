import { Router } from "express";
import {
  finishInterview,
  finishInterviewValidation,
  generateQuestions,
  generateQuestionsValidation,
  getInterviewHistory,
  getInterviewSession,
  getInterviewReport,
  saveAnswer,
  saveAnswerValidation,
  startInterview,
  startInterviewValidation
} from "../controllers/interviewController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";

const router = Router();

router.use(protect);

router.post("/generate-questions", generateQuestionsValidation, validateRequest, generateQuestions);
router.post("/start", startInterviewValidation, validateRequest, startInterview);
router.post("/save-answer", saveAnswerValidation, validateRequest, saveAnswer);
router.post("/finish", finishInterviewValidation, validateRequest, finishInterview);
router.get("/history", getInterviewHistory);
router.get("/session/:id", getInterviewSession);
router.get("/report/:id", getInterviewReport);

export default router;
