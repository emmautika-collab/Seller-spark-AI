# SellerSpark AI — BuildFest 2026

**Track 2: AI for Content & Creativity**

SellerSpark AI is an original human-in-the-loop creative workspace for small businesses. Its primary workflow is an **AI Content Generator**, extended with Social Media, Scriptwriting, and Branding assistants.

### What makes it BuildFest-ready
- Real AI generation through the OpenAI Responses API when `OPENAI_API_KEY` is configured.
- Deterministic demo mode for rehearsal when no key is configured.
- Human edit/review/approval workflow.
- Regeneration with a different creative angle.
- Fact-verification flags for common risky claim patterns.
- Save-to-history with the full context and flags preserved.
- `.txt` export plus a judge-friendly evidence JSON export.
- Responsive branded UI and four assistant modes.
- Automated tests covering core workflow logic and endpoints.

### Run locally
1. Install Node.js 20+.
2. `npm install`
3. Copy `.env.example` to `.env` and add your API key for live AI.
4. `npm start`
5. Open `http://localhost:3000`.

### Test
`npm test`

See `BUILD_FEST_SUBMISSION.md` for the evidence checklist, architecture, and 90-second demo script.

The API key is server-side only. Never put it in `public/` or commit `.env`.
