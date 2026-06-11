# Phase 3 Plan — Launch Prep

**Status:** IN PROGRESS
**Started:** 2026-06-10
**Goal:** Ship KineticIQ to the App Store

The Phase 3 task queue is ordered. Do not reorder or skip tasks without updating
`JARVIS.md`. One task at a time. One test build between each task.

---

## Task Queue (Ordered)

| # | Task                                                    | Status     | Notes                                         |
|---|---------------------------------------------------------|------------|-----------------------------------------------|
| 1 | First name + display name — profile edit + onboarding  | **NEXT**   | Add to profile edit screen and onboarding flow |
| 2 | Privacy Policy screen                                   | Pending    | Required for App Store + IAP                  |
| 3 | App Store screenshots                                   | Pending    | All required device sizes                     |
| 4 | Apple IAP — StoreKit 2                                  | Pending    | Replaces the current test button              |
| 5 | App Store resubmission                                  | Pending    | After IAP + screenshots + privacy policy done |
| 6 | Push notifications                                      | Pending    |                                               |
| 7 | Offline caching — RecipeScreen + WorkoutDetailScreen    | Pending    |                                               |
| 8 | Google Play distribution                                | **BLOCKED**| Blocked on Google identity verification       |

---

## Task Notes

### Task 1 — First Name + Display Name
- Screens affected: profile edit screen, onboarding flow
- Verify the name is saved to Firestore and displayed correctly in the app
- One change, one build, device install to verify before moving to Task 2

### Task 2 — Privacy Policy Screen
- Must be a real, accessible URL for App Store + IAP compliance
- Options: in-app screen, or external URL (termly.io, a static page, etc.)
- The URL must also be added to App Store Connect

### Task 3 — App Store Screenshots
- Required sizes: iPhone 6.9" (16 Pro Max), iPhone 6.5" (14 Plus / 15 Plus)
- iPad 13" required if the app supports iPad
- Screenshots should be story-driven, not raw screen dumps
- See `MARKETING_BACKLOG.md` for content ideas

### Task 4 — Apple IAP (StoreKit 2)
- Replaces the current test button — StoreKit 2 is required for modern App Store compliance
- IAP products must be configured in App Store Connect before code changes
- Test in sandbox environment before submitting
- Architecture rule: IAP logic stays client-side — no server-side purchase logic needed unless validating receipts

### Task 5 — App Store Resubmission
- Only after Tasks 1–4 are complete
- Review `RELEASE_CHECKLIST.md` before submitting — every item must be green
- Build number must be unique (never reuse an uploaded build number)

### Task 6 — Push Notifications
- Firebase Cloud Messaging (FCM) already in stack
- APNs certificate/key configuration in Firebase console
- Test on physical device — simulator does not support push notifications

### Task 7 — Offline Caching
- RecipeScreen and WorkoutDetailScreen need to render without a network connection
- Use Firestore offline persistence (already available in Firebase SDK) or AsyncStorage cache
- Confirm caching does not break real-time sync when back online

### Task 8 — Google Play (BLOCKED)
- No action until Google identity verification is complete
- Once unblocked: Android build, Play Console setup, Play Store listing

---

## Planned Subagents (Phase 4+ — not yet built)

| Subagent        | Responsibility                                              |
|-----------------|-------------------------------------------------------------|
| MarketingAgent  | ASO, screenshots, copy, social media                        |
| FirebaseAgent   | Firestore rules, Cloud Function health, Crashlytics         |
| QAAgent         | Regression testing, TestFlight build verification           |
| AppStoreAgent   | Metadata, review responses, release notes                   |
| GooglePlayAgent | Android build, Play Console                                 |

---

## Phase 3 Principles

- Ship what works — do not add features not on the task queue
- One change at a time, one test build between each
- Tester feedback drives priority, not assumptions
- No App Store submission until `RELEASE_CHECKLIST.md` is fully green
- Any regression found mid-phase halts progression until resolved
