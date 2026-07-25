import pdfParse from "pdf-parse";
import Resume from "../models/Resume.js";
import User from "../models/User.js";

export const uploadResume = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "PDF resume is required" });
  }

  const pdfResult = await pdfParse(req.file.buffer);
  const extractedText = pdfResult.text?.trim();

  if (!extractedText) {
    return res.status(400).json({ message: "Unable to extract text from the resume" });
  }

  const resume = await Resume.create({
    user: req.user._id,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    text: extractedText
  });

  await User.findByIdAndUpdate(req.user._id, { latestResumeText: extractedText });

  res.status(201).json({
    message: "Resume uploaded successfully",
    resume: {
      id: resume._id,
      fileName: resume.fileName,
      textPreview: extractedText.slice(0, 500),
      createdAt: resume.createdAt
    }
  });
};

export const getLatestResume = async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });

  if (!resume) {
    return res.status(404).json({ message: "No resume found" });
  }

  res.json({
    resume: {
      id: resume._id,
      fileName: resume.fileName,
      text: resume.text,
      createdAt: resume.createdAt
    }
  });
};
