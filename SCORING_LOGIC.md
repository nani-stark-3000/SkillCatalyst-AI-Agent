# AI Assessment & Scoring Logic

The application leverages the Gemini model's structured data capabilities to transform unstructured candidate profiles into deterministic, objective scores and actionable paths. The logic is divided into three consecutive phases.

## Phase 1: Skill Extraction & Gap Analysis

The system first parses the Job Description and the candidate's Resume simultaneously. It performs semantic matching to identify required skills.

- **Goal:** Identify exactly what the JD needs and what the Resume _claims_ to have.
- **Mechanism:** The AI uses strict Deterministic JSON Schema (`responseSchema`) to output an exact array of `[name, category, jdRequirement, resumeClaim]`. All skills initially enter the system as `unverified`.

## Phase 2: Conversational Interrogation (Verification)

Instead of taking resume claims at face value, the system acts as a specialized technical interviewer.

- **Execution:** We pass the `unverified` skill list to Gemini in a conversational context.
- **Prompt Logic:** Gemini is instructed to ask _probing, conversational questions_ regarding real-world application, rejecting simple trivia.
- **Evaluation Engine:** Based on the depth, clarity, and technical correctness of the user's answers, Gemini builds an internal context representing the true proficiency level of the candidate.

## Phase 3: Final Synthesis & Plan Generation

Once the conversation provides enough evidence, the agent moves to synthesis. We provide all prior context (JD, Resume text, and the entire raw conversation history) to Gemini.

- **Scoring System:**
  - **Individual Skill Score:** Gemini assigns a score `0-100` and a discrete Level (`Beginner`, `Intermediate`, `Advanced`, `Expert`) for every skill based _strictly_ on the evidence gathered.
  - **Overall Score:** Calculated as the aggregate mathematical average of the individual skill scores, quantifying how perfectly the candidate matches the JD on verified metrics.
- **Learning Path Generation:**
  - If a skill gap is detected (i.e., JD requires it, but the assessment reveals weak/missing knowledge from the candidate), Gemini generates a structured JSON learning plan.
  - This plan includes precise, targeted resources, estimated durations, and priority levels (`High`, `Medium`, `Low`) based on the importance of the skill to the JD.

By enforcing rigid deterministic `responseSchema` on Gemini for Phase 1 and Phase 3, we prevent hallucinations and ensure the data integrates perfectly with our React UI components.
