# MockAI Interview Simulator

MockAI is a full-stack AI interview simulator for students preparing for HR, DSA, resume-based, and company-style interviews. It includes JWT auth, MongoDB persistence, AI-powered question and feedback generation, live speech transcription, webcam readiness, resume upload, reports, and a modern React dashboard.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT + bcrypt
- AI: OpenAI or Gemini with resilient fallback generation
- Voice: Web Speech API
- Resume Parsing: `pdf-parse`
- Charts: Recharts

## Project Structure

```text
Mockai/
  backend/
  frontend/
  README.md
```

## Backend Setup

1. Open a terminal in [backend](backend).
2. Create a `.env` file from [.env.example](backend/.env.example).
3. Install dependencies:

```bash
npm install
```

4. Start the backend:

```bash
npm run dev
```

Backend runs on `http://localhost:5000`.

## Frontend Setup

1. Open a terminal in [frontend](frontend).
2. Create a `.env` file from [.env.example](frontend/.env.example).
3. Install dependencies:

```bash
npm install
```

4. Start the frontend:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Environment Variables

Backend `.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/ai-interview-simulator
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
AI_PROVIDER=openai
OPENAI_API_KEY=
GEMINI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GEMINI_MODEL=gemini-3.5-flash
```

Frontend `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Features

- Secure register/login flow with JWT-protected APIs
- Separate user-owned interview sessions, answers, resumes, and reports
- Interview modes:
  - HR Interview
  - DSA Interview
  - Resume-based Interview
  - Google Mode
  - Amazon Leadership Mode
  - Meta Behavioral Mode
- AI-generated questions from OpenAI or Gemini
- AI-generated feedback with fallback logic when API keys are missing
- Mock interview room with:
  - one-question-at-a-time flow
  - transcript capture using Web Speech API
  - timer
  - answer persistence
  - voice analysis preview
  - webcam readiness panel
- Resume upload with PDF text extraction
- Dashboard with session statistics and confidence chart
- Interview report with scores, strengths, weaknesses, suggestions, and roadmap
- Downloadable JSON recruiter-style report export

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
- `GET /api/interview/report/:id`

### Resume

- `POST /api/resume/upload`
- `GET /api/resume/me`

## Notes

- The webcam analysis layer is intentionally structured so `face-api.js` or OpenCV can be integrated later without changing page flow or API shapes.
- If no AI API key is configured, the platform still works locally using backend fallback question and feedback generation.
- Report download currently exports structured JSON, which is practical for recruiter-review pipelines and can be extended to PDF later.
