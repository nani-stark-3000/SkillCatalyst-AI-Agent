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

## Architecture
1. **Input Phase**: User provides JD and Resume.
2. **Analysis Phase**: Gemini extracts required vs claimed skills.
3. **Verification Phase**: A conversational loop where Gemini acts as a technical interviewer.
4. **Closing Phase**: Logic calculates gaps and prompts Gemini to generate a JSON-structured learning path.

---
*Built for Catalyst Hackathon • Deccan AI*
