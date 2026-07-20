# App Store Release

## One-time setup

The client owns the Apple Developer/App Store Connect organization, bundle ID, certificates/profiles or managed signing, App Store Connect API key, agreements/tax/banking, privacy policy, App Privacy answers, age rating, territories, support/marketing URLs, and account-deletion review path. Replace `com.client.tournament` before registering the final bundle ID.

Provide approved icons, launch appearance, iPhone/iPad screenshots, description, keywords, subtitle, review notes/demo account, release notes, and localized legal/support content. Any future push, analytics, tracking, or location capability requires entitlements, privacy manifests, consent, and renewed App Privacy review.

## Build and archive

Use macOS with the approved Xcode/Flutter versions from a clean tag. Increment semantic version and build number, inject production HTTPS configuration, run tests, install pods, and build/archive with client-controlled signing:

```bash
flutter pub get
flutter analyze --fatal-infos
flutter test
cd ios && pod install --repo-update && cd ..
flutter build ipa --release \
  --dart-define=API_URL=https://api.client.example/api/v1 \
  --dart-define=WEBSOCKET_URL=https://api.client.example/live \
  --dart-define=APP_NAME="Approved Product Name" \
  --dart-define=PRIVACY_POLICY_URL=https://client.example/privacy \
  --dart-define=TERMS_URL=https://client.example/terms \
  --dart-define=SUPPORT_EMAIL=support@client.example
```

Keep `.p8`, certificate, profile, and keychain material out of the repository and ordinary artifacts. Verify archive identity, entitlements, privacy manifest, dSYM retention, provenance, and checksums before upload.

## TestFlight and release

Use internal TestFlight first, then external testing if needed. Test verification/reset/deep links, background/resume token refresh, realtime reconnect, offline cache, VoiceOver/Dynamic Type, different timezones, privacy controls, and upgrade/maintenance behavior on physical devices. Supply review notes and a non-production least-privilege review account when authentication is needed.

Choose manual or phased release, monitor server/mobile crashes and auth/store feedback, and pause the phased release on regression. App Store builds cannot be downgraded; publish a higher build and keep API compatibility until adoption is safe. Expedited review is not a substitute for an incident rollback plan.
