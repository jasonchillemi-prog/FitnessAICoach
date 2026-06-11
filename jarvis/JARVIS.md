# JARVIS — KineticIQ Master Agent
**Version:** 1.0
**Last Updated:** June 9, 2026
**Project:** KineticIQ / FitnessAI Coach
**Operator:** Jason Chillemi (solo founder)
**Agent Type:** Master Agent (subagents not yet active)

---

## CURRENT STATE

| Field | Value |
|-------|-------|
| Stable Build | 55.5 (tag: v55.5-stable) |
| Current Phase | Phase 3 — Launch Prep |
| Next Build | 56 |
| Primary Dev Tool | Claude Code |
| Project Path | ~/Dev/FitnessAICoach |
| TestFlight | ✅ Live — Build 55.5 |
| App Store | ⏳ Pending resubmission |
| Google Play | ⏳ Blocked — identity verification |

---

## PHASE STATUS

| Phase | Status |
|-------|--------|
| Phase 1 — Stable MVP | ✅ Complete |
| Phase 2 — Production Quality | ✅ Complete (Build 55.5) |
| Phase 3 — Launch Prep | 🔄 In Progress |
| Phase 4 — Growth | ⏳ Not Started |

---

## PHASE 3 TASK QUEUE

Complete in order. One change per build. One test build between each.

| # | Task | Priority | Status |
|---|------|----------|--------|
| 1 | First name + display name in profile edit + onboarding | 🔴 High | ⏳ Pending |
| 2 | Privacy Policy screen | 🔴 High | ⏳ Pending |
| 3 | App Store screenshots | 🔴 High | ⏳ Pending |
| 4 | Apple IAP — StoreKit 2 (replaces test button) | 🔴 High | ⏳ Pending |
| 5 | App Store resubmission | 🔴 High | ⏳ Pending — blocked by 2, 3, 4 |
| 6 | Push notifications | 🟡 Medium | ⏳ Pending |
| 7 | Offline caching — RecipeScreen + WorkoutDetailScreen | 🟡 Medium | ⏳ Pending |
| 8 | Google Play distribution | 🟡 Medium | ⏳ Blocked — identity verification |

---

## OPEN BUGS

| # | Bug | Severity | Notes |
|---|-----|----------|-------|
| 1 | RecipeScreen + WorkoutDetailScreen show offline message but no cached content | Low | Deferred to Phase 3 task 7 |
| 2 | Calendar shows same meals every day (recurring events) | Low | Known limitation — daily variety in-app only |
| 3 | Crashlytics not fully active until production build | Low | Resolves at App Store launch |
| 4 | Pro paywall uses test button, not real StoreKit IAP | Medium | Intentional for beta — Phase 3 task 4 |

---

## RELEASE BLOCKERS
Nothing ships to App Store with any of these open:

- [ ] Privacy Policy screen
- [ ] App Store screenshots
- [ ] StoreKit 2 IAP replacing test button
- [ ] No critical bugs in TestFlight

---

## APP STORE READINESS

| Item | Status |
|------|--------|
| Bundle ID | com.kineticiq.app ✅ |
| Provisioning Profile | KineticIQ App Store ✅ |
| Codesign Identity | 8B69BB61DAA588CDDE34EBE47D4AD6E31F482830 ✅ |
| Privacy Policy | ❌ Not built |
| Screenshots | ❌ Not created |
| IAP configured in App Store Connect | ❌ Not done |
| Last submission | ~May 17, 2026 — status unknown |

---

## GOOGLE PLAY READINESS

| Item | Status |
|------|--------|
| Identity verification | ⏳ Pending |
| .aab build | ✅ Previously built |
| Play Console setup | ⏳ Pending |

---

## FIREBASE HEALTH

| Service | Status | Notes |
|---------|--------|-------|
| Auth | ✅ Live | `initializeAuth` + AsyncStorage persistence |
| Firestore | ✅ Live | |
| Cloud Functions v2 | ✅ Live | nodejs24, us-central1 |
| Secret Manager | ✅ Live | ANTHROPIC_API_KEY |
| Analytics | ✅ Live | 32min avg engagement |
| Crashlytics | ⚠️ Partial | Needs production build |
| Rate Limiting | ✅ Live | All 6 functions, per-UTC-date, midnight reset |

### Cloud Functions Rate Limits
| Function | Limit |
|----------|-------|
| generatePlan | 3/day |
| analyzeGoals | 20/day |
| coachChat | 20/day |
| generateWorkoutDetail | 10/day |
| generateRecipe | 10/day |
| applyCoachSuggestion | 5/day |

---

## ARCHITECTURE RULES
Jarvis enforces these on every session. No exceptions.

- All Anthropic API calls via Cloud Functions only — never from client
- API key in Firebase Secret Manager — never hardcoded
- functions/index.js is gitignored — deploy directly from Mac only
- `@react-native-firebase/analytics` must NOT be in app.json plugins
- objectVersion → 56 for pod install, restore to 70 before archive
- Every JS change = full archive + device install (no hot reload on native iOS)
- App Store Connect build numbers must be unique — never reuse uploaded numbers
- Project must stay at ~/Dev/FitnessAICoach — iCloud corrupts builds
- Do NOT migrate to EAS
- Do NOT rebuild from scratch
- Do NOT downgrade Expo SDK
- One change per build. One test build between each.

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | React Native + Expo SDK 54 |
| Language | JavaScript |
| Navigation | React Navigation (Native Stack + Bottom Tabs) |
| Backend | Firebase Cloud Functions v2 / nodejs24 |
| Database | Firestore |
| Auth | Firebase Auth |
| AI | Anthropic Claude API (server-side only) |
| Analytics | Firebase Analytics + Crashlytics |
| Health | Apple HealthKit |
| Calendar | expo-calendar |
| Notifications | expo-notifications (installed, not wired) |
| Offline Cache | AsyncStorage + write sync queue |
| IAP | StoreKit 2 (not yet implemented) |
| Dev Tool | Claude Code |

---

## SUBAGENTS (NOT YET ACTIVE)

| Agent | Responsibility | Status |
|-------|---------------|--------|
| Marketing Agent | ASO, screenshots, copy, social | ⏳ Phase 3+ |
| Firebase Agent | Firestore rules, CF health, Crashlytics | ⏳ Future |
| QA Agent | Regression testing, TestFlight verification | ⏳ Future |
| App Store Agent | Metadata, review responses, release notes | ⏳ Future |
| Google Play Agent | Android build, Play Console | ⏳ Future |

---

## VOICE ASSISTANT PLAN (PHASE 4+)

- Voice input via Whisper or native iOS Speech framework
- STT transcribes voice → passes as text to Jarvis
- No architecture change required — text-first design is already in place
- Jarvis responds in text; TTS layer optional on top

---

## SESSION PROTOCOL

At the start of every session Jarvis must:
1. Read this file
2. Report: current phase, next task, open blockers
3. Confirm project path is ~/Dev/FitnessAICoach
4. Confirm no architecture rules are being violated

After every completed task Jarvis must:
1. Mark task complete in Phase 3 queue above
2. Add build number and date
3. Update APP STORE READINESS or FIREBASE HEALTH if relevant
4. Note any new bugs discovered

---

## CHANGE LOG

| Date | Build | Change |
|------|-------|--------|
| Jun 9, 2026 | 55.5 | Phase 2 complete. JARVIS.md created. Phase 3 begins. |
