# Project Rules

These rules govern all decisions made by Jarvis, the developer, and any contributors.
No exceptions without explicit documented justification.
Source of truth: `JARVIS.md` in the project root.

---

## Phase Rules

- Phase 1 is **COMPLETE**.
- Phase 2 is **COMPLETE**.
- Phase 3 is **IN PROGRESS**. Work only within Phase 3 scope unless a blocking issue requires reaching back.
- Phase 4 (voice mode, subagents, full Android launch) is planned but not started.

---

## Architecture Rules (Non-Negotiable)

### AI / API
- All Anthropic API calls go through Firebase Cloud Functions **ONLY** — never from the client.
- The Anthropic API key lives in Firebase Secret Manager — never hardcoded, never in `.env` committed to git.
- `functions/index.js` is gitignored — always deployed directly from Mac, never committed to version control.

### Expo / React Native
- Do **NOT** migrate to EAS.
- Do **NOT** rebuild the app from scratch.
- Do **NOT** downgrade Expo SDK (currently SDK 54 — stay here).
- Every JS change requires a full archive + device install. Hot reload does not apply to native iOS.
- `objectVersion` in the Xcode project must be **56** for `pod install`.
- `objectVersion` must be restored to **70** before running archive.
- App Store Connect build numbers must be unique — never reuse an uploaded number.

### Firebase
- `@react-native-firebase/analytics` must **NOT** appear in `app.json` plugins.
- Cloud Functions changes require local Firebase emulator testing before deploying to production.
- Do not modify Firebase security rules without testing in a staging environment first.
- All Crashlytics findings must be logged in `BUG_TRACKER.md` before being acted on.

### Project Integrity
- Project must stay at `~/Dev/FitnessAICoach` — iCloud corrupts builds. Do not move or sync this directory.
- One change at a time. One test build between each change. Never stack multiple changes in one build.
- If something looks like a regression, stop and flag it before proceeding.
- If a crash or P0 bug is discovered, halt Phase 3 progression until it is resolved.

---

## Agent / Model Rules

- Jarvis is model-agnostic. It is not Claude, GPT, or Gemini — it works with any of them.
- Never depend on a specific model's capabilities or context window size.
- All state and memory live in files inside the project — not in model memory.
- `JARVIS.md` in the project root is the persistent memory file. Update it after every completed task.
- `jarvis/aiProvider.ts` is the only permitted interface for AI calls within Jarvis — never call provider SDKs directly from agent files.
- Model and provider selection are configured in `jarvis/CONFIG.json` (derived from `CONFIG.example.json`).

---

## Release Rules

- No App Store submission until every item in `RELEASE_CHECKLIST.md` is complete and green.
- TestFlight builds must be validated by at least one external tester before App Store submission.
- Do not submit without reviewing Apple's current guideline compliance.
- App Store Connect build numbers are permanent — never reuse an uploaded number.

---

## Documentation Rules

- Update `JARVIS.md` whenever a task is completed, a blocker is discovered, or a key decision is made.
- Update `TASKS.md` and `BUG_TRACKER.md` at the start and end of every work session.
- Completed tasks must be moved to the Done section in `TASKS.md` the same day they are finished.
- Do not let documentation drift from reality — stale docs are worse than no docs.
