# SkillCatalyst AI Agent

AI-powered conversational proficiency assessment and personalized career learning plans.

## Problem Statement

A resume tells you what someone claims to know — not how well they actually know it. SkillCatalyst is an agent that takes a Job Description and a candidate's resume, conversationally assesses real proficiency on each required skill, identifies gaps, and generates a personalised learning plan.

## Features

- **PDF Resume Parsing**: Extracts content from resumes using `pdf-parse`.
- **Skill Extraction**: Gemini 3 Flash automatically identifies core requirements from JDs vs Claims in Resumes.
- **Conversational AssessmentAgent**: A specialized AI interviewer that probes into specific skills to verify real-world proficiency.
- **Personalized Learning Plans**: Curated resource roadmap with time estimates and platform links.
- **Modern UI**: Built with React 19, Tailwind CSS 4, and Framer Motion for a fluid experience.

## Tech Stack

- **Frontend**: React, Tailwind CSS, Lucide React, Framer Motion.
- **AI**: Google Gemini API (@google/genai SDK).
- **Backend**: Node.js, Express, Multer, pdf-parse.

## Local Setup

1. **Clone the repository** (if applicable).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Configuration**:
   Create a `.env` file in the root and add your API key:
   ```env
   GEMINI_API_KEY=your_key_here
   ```
4. **Run the application**:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` in your browser.

## Architecture & Logic Documentation

For a detailed breakdown of the system components and scoring heuristics, please refer to the following documents:

- [System Architecture Diagram (ARCHITECTURE.md)](./ARCHITECTURE.md)
- [Scoring Logic & AI Implementation (SCORING_LOGIC.md)](./SCORING_LOGIC.md)

## Deployment (Vercel)

The application is structured to easily deploy on Vercel as a full-stack App (React Frontend + Express API via Serverless Functions).

1. Push your code to a GitHub repository.
2. Import the project in Vercel.
3. Add `GEMINI_API_KEY` to your Vercel Environment Variables.
4. Deploy! Vercel will automatically use `vercel.json` to route `/api/*` to the Express backend and everything else to the static React build.

---

_Built for Catalyst Hackathon • Deccan AI_
