# MockAI — AI-Powered Mock Interview Platform

MockAI is a full-stack interview preparation platform that simulates real technical and behavioral interviews using AI. It generates questions tailored to the interview mode and the candidate's resume, evaluates spoken responses through live speech and webcam analysis, and produces a detailed performance report at the end of each session.

**[Live Demo](https://mockai-interview-platform.vercel.app/)** · **[Report a Bug](https://github.com/tiwari0428/mockai/issues)**

---

## Highlights

- 🎙️ Voice-driven interviews across 6 modes: HR, DSA, Resume-based, Google, Amazon Leadership, and Meta Behavioral
- 🧠 AI-generated questions and feedback (Gemini or OpenAI), with resilient fallback generation when no API key is configured
- 📄 Resume-aware question generation — parses uploaded PDF/DOCX resumes to extract skills, projects, and experience
- 📊 Live performance coaching combining webcam eye-contact tracking, speaking pace, and filler-word detection
- 📈 Performance dashboard with score trends and communication analytics (custom SVG charts, no charting library)
- 🔐 Secure JWT authentication with bcrypt password hashing and strict per-user data isolation

## Why MockAI?

Practicing interviews out loud usually requires another person. MockAI lets candidates practice independently — through AI-generated, voice-driven interviews — while getting detailed, structured feedback on both what they said and how they said it.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcrypt |
| AI | OpenAI or Google Gemini, with resilient fallback generation |
| Voice | Web Speech API (SpeechRecognition + SpeechSynthesis) |
| Resume Parsing | pdf-parse (backend), pdfjs-dist / mammoth (frontend) |
| Charts | Custom SVG-based charts (no charting library) |
| Deployment | Vercel (frontend), Render (backend), MongoDB Atlas |

---

## Project Structure

```text
Mockai/
  backend/
    src/
      config/          # Database connection
      controllers/      # Route handlers
      middleware/        # Auth, validation, error handling
      models/             # Mongoose schemas
      routes/              # API route definitions
      services/            # AI integration (aiService.js)
      utils/                 # Scoring logic, JWT helpers
  frontend/
    src/
      components/       # Reusable UI components
      context/            # Auth context
      pages/                # Route-level pages
      services/              # Speech + interview AI helpers
      utils/                   # Resume parsing, interview config
  README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB connection string (Atlas or local)
- A free Google Gemini API key ([Google AI Studio](https://aistudio.google.com)) and/or an OpenAI API key

### Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/ai-interview-simulator
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
AI_PROVIDER=gemini
OPENAI_API_KEY=
GEMINI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GEMINI_MODEL=gemini-3.5-flash
```

```bash
npm run dev
```

Backend runs on `http://localhost:5000`.

### Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

## Architecture

```
Frontend (React/Vite) ──REST API──▶ Backend (Express)
                                          │
                              ┌───────────┼───────────┐
                              ▼           ▼           ▼
                          MongoDB    Gemini/OpenAI  Web Speech API
                          (Atlas)   (question gen  (browser-native,
                                    + feedback)     no server cost)
```

Every AI call is wrapped with fallback logic — if the configured provider is unavailable, rate-limited, or missing an API key, the app automatically falls back to curated, mode-specific question and feedback generation so the app keeps working.

---

## Features

- Secure register/login flow with JWT-protected APIs
- Per-user data isolation across all interview sessions, answers, resumes, and reports
- Interview modes: HR, DSA, Resume-based, Google, Amazon Leadership, Meta Behavioral
- AI-generated questions and feedback via OpenAI or Gemini, with fallback logic when no API key is configured
- Live interview room with:
  - one-question-at-a-time flow with the question spoken aloud
  - live transcript capture via Web Speech API
  - session timer and progress tracking
  - real-time webcam eye-contact and face-visibility tracking
  - live confidence, pace, and filler-word scoring
- Resume upload with PDF/DOCX text extraction and pattern-based parsing (skills, projects, experience, education, certifications)
- Dashboard with session statistics, score trend charts, and communication analytics
- Detailed interview report with scores, strengths, weaknesses, suggestions, and an improvement roadmap
- Structured JSON report export for recruiter-review workflows

---

## API Overview

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Interview
- `POST /api/interview/generate-questions`
- `POST /api/interview/start`
- `POST /api/interview/save-answer`
- `POST /api/interview/finish`
- `GET /api/interview/history`
- `GET /api/interview/session/:id`
- `GET /api/interview/report/:id`

### Resume
- `POST /api/resume/upload`
- `GET /api/resume/me`

---

## Key Design Decisions

- **Live feedback is rule-based, not LLM-based.** Real-time scoring during an interview (eye contact, pace, filler words) uses a weighted formula for speed and zero marginal cost — the LLM is reserved for the final, deeper feedback report generated once per session.
- **AI calls always have a fallback.** Every provider call is wrapped so that if the model is unavailable, rate-limited, or the API key is missing, the app falls back to hand-written, mode-specific question and feedback generation instead of failing.
- **Ownership checks on every query.** Every database read/write involving a user's session, answer, resume, or report filters by the authenticated user's ID — never by a client-supplied value.
- **Provider-agnostic AI layer.** `AI_PROVIDER` switches between Gemini and OpenAI without touching controller code, so swapping providers is a config change, not a rewrite.

---

## Known Limitations

- Voice recognition relies on the browser's built-in `SpeechRecognition` API, which works best in Chrome/Edge and has reduced accuracy on long, continuous answers (the UI includes a note encouraging typing for longer responses).
- No rate limiting on authentication endpoints yet — planned for a future update.
- Live coaching scores are heuristic-based rather than AI-generated, by design, to keep feedback instant and free.
- Webcam analysis is intentionally structured so a face-detection library (e.g. face-api.js) can be integrated later without changing page flow or API shapes.

---

## Roadmap

- Move speech recognition to a dedicated streaming STT service (e.g. Deepgram) for improved accuracy on longer answers
- Add rate limiting on authentication endpoints
- PDF export for interview reports (currently JSON)
- Company-specific interview question datasets

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

*Built by [Akanksha Tiwari](https://github.com/tiwari0428)*
