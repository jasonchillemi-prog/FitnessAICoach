# Project Memory

Persistent context about the KineticIQ project.
For the authoritative current state, always read `JARVIS.md` in the project root first.
This file stores deeper background that does not change frequently.

---

## App Identity

- **App Name:** KineticIQ
- **Platform:** iOS (primary), Android (blocked — Google identity verification pending)
- **Framework:** React Native + **Expo SDK 54**
- **Backend:** Firebase — Auth, Firestore, Cloud Functions v2 (nodejs24), Crashlytics
- **AI Integration:** Anthropic Claude API — server-side only, routed through Firebase Cloud Functions
- **Project Path:** `~/Dev/FitnessAICoach` — must never be moved to iCloud
- **Primary Dev Tool:** Claude Code
- **Stable Baseline:** Build 55.5 — git tag `v55.5-stable`

## Project Structure Notes

- `screens/` — all app screens (18+ screens as of Phase 2 completion)
- `navigation/` — React Navigation config
- `services/` — Firebase and app service layer
- `functions/` — Firebase Cloud Functions (nodejs24, v2) — `index.js` is gitignored
- `ios/` — Native Xcode project (KineticIQ)
- `src/` — Additional source modules
- `jarvis/` — Jarvis AI operations layer (this folder)
- `JARVIS.md` — Jarvis master memory file (project root)

## Phase History

### Phase 1 — Foundation (COMPLETE)
- React Native + Expo SDK 54 + Firebase stack established
- Core navigation and auth implemented

### Phase 2 — Feature Build (COMPLETE)
- Core fitness tracking features built (workouts, recipes, AI coaching)
- Firebase integration complete (Auth, Firestore, Cloud Functions, Crashlytics)
- Anthropic Claude API integrated via Firebase Cloud Functions (server-side only)
- iOS build pipeline established
- TestFlight distribution set up
- Stable build: 55.5 (tag v55.5-stable)

### Phase 3 — Launch Prep (IN PROGRESS)
- Started: 2026-06-10
- Goal: Ship KineticIQ to the App Store
- Task queue defined and tracked in `JARVIS.md`
- Jarvis AI operations layer created

### Phase 4 — Voice Mode + Subagents + Android Full Launch (PLANNED)
- Voice input via Whisper or native iOS STT
- Jarvis subagents (Marketing, Firebase, QA, App Store, Google Play)
- Full Android launch (unblocked from Play identity verification)

## Critical Build Notes

- `objectVersion` must be **56** for `pod install`, restored to **70** before archive
- `@react-native-firebase/analytics` must NOT be in `app.json` plugins
- App Store Connect build numbers are permanent — never reuse an uploaded build number
- Every JS change needs a full archive + device install (no hot reload on native iOS)
- `functions/index.js` is gitignored — deploy from Mac directly, never commit

## Key Decisions Made

| Date       | Decision                                           | Reason                                              |
|------------|----------------------------------------------------|-----------------------------------------------------|
| 2026-06-10 | Created Jarvis AI ops layer in /jarvis             | Structured approach to Phase 3                      |
| 2026-06-10 | JARVIS.md as master persistent memory file         | Model-agnostic: memory in files, not model context  |
| 2026-06-10 | No hardcoded AI model or provider                  | Provider flexibility and cost control               |
| 2026-06-10 | All Claude API calls server-side via Cloud Functions | Security: API key in Secret Manager, never client   |
| 2026-06-10 | Voice mode deferred to Phase 4                     | Phase 3 = launch first, voice = enhancement         |
| 2026-06-10 | Master Agent before subagents                      | Stability first                                     |

## Open Blockers

- **Google Play:** Identity verification required before Android distribution can proceed.
  No action needed now — unblock when ready to pursue Android.

## Tester Feedback Summary

*(Populate this section as TestFlight feedback arrives)*

## Open Questions

*(Document unresolved architectural or product decisions here)*
