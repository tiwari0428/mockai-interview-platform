import { Router } from "express";
import multer from "multer";
import { getLatestResume, uploadResume } from "../controllers/resumeController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF resumes are allowed"));
    }
    cb(null, true);
  }
});

router.use(protect);

router.post("/upload", upload.single("resume"), uploadResume);
router.get("/me", getLatestResume);

export default router;
