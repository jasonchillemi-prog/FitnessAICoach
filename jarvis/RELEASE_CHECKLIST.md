# Release Checklist

No App Store submission until every item in this checklist is marked complete.

---

## Build & Technical

- [ ] All P0 and P1 bugs resolved and verified
- [ ] App launches without crash on clean install (iPhone simulator + physical device)
- [ ] App launches without crash on oldest supported iOS version
- [ ] All core user flows tested end-to-end (sign up, log workout, view history, settings)
- [ ] Firebase Crashlytics showing 0 active P0 crash reports
- [ ] Cloud Functions deployed and healthy in production Firebase project
- [ ] Firebase security rules reviewed and tightened for production
- [ ] No debug logs, test accounts, or dev-only code paths left active
- [ ] Bundle identifier matches App Store Connect entry
- [ ] App version and build number incremented correctly
- [ ] `CFBundleShortVersionString` and `CFBundleVersion` correct in `Info.plist`
- [ ] Release build (not debug) archived and uploaded to App Store Connect
- [ ] Bitcode / dSYM symbols uploaded to Crashlytics

## App Store Connect

- [ ] App name confirmed: KineticIQ
- [ ] App subtitle written (30 chars max)
- [ ] App description written (4000 chars max)
- [ ] Keywords filled in (100 chars max)
- [ ] Support URL active and resolves
- [ ] Privacy policy URL active and resolves
- [ ] Marketing URL (optional) set if available
- [ ] Category selected (Health & Fitness)
- [ ] Age rating completed (no age-restricted content expected)
- [ ] Content rights confirmed
- [ ] Pricing set (Free / Paid / Freemium — confirm before submission)
- [ ] In-app purchases configured if applicable

## Screenshots & Media

- [ ] Screenshots for iPhone 6.9" (iPhone 16 Pro Max) — required
- [ ] Screenshots for iPhone 6.5" (iPhone 14 Plus / 15 Plus) — required
- [ ] Screenshots for iPad 13" — required if iPad supported
- [ ] App Preview video (optional but recommended)
- [ ] Screenshots accurately represent current app UI

## Legal & Compliance

- [ ] Privacy policy covers all data collected (Firebase Analytics, Crashlytics, user data)
- [ ] App does not request permissions it doesn't use
- [ ] Health/HealthKit permissions (if used) explained in the permission prompt
- [ ] GDPR / CCPA compliance reviewed if applicable
- [ ] No third-party SDKs with unreviewed license conflicts

## TestFlight Validation

- [ ] At least one external tester has used the build and approved it
- [ ] No P0 or P1 bugs reported by testers remain open
- [ ] Tester feedback reviewed and actioned or consciously deferred

## Final Sign-Off

- [ ] Developer has done a final walkthrough of the full app on a physical device
- [ ] App Store listing previewed in App Store Connect for visual accuracy
- [ ] Submission submitted and "Waiting for Review" status confirmed
