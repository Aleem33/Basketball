# Google Play Release

## One-time setup

The client owns the Google Play Console account, verified developer identity, application ID, signing key/Play App Signing decision, service-account scope, privacy policy, data-safety answers, content rating, target countries, pricing, support details, and deletion URL/process. Replace `com.client.tournament` before the first irreversible Play registration if that is not the approved ID.

Create adaptive/legacy icons, splash art, phone/tablet screenshots, feature graphic, short/full descriptions, release notes, and localized legal/support links. Review Android permissions and remove anything unnecessary. The current client uses network and secure-storage capabilities; any future notifications/location/analytics require renewed disclosure and consent review.

## Build

From a clean, tagged commit with Flutter 3.29.3, inject production HTTPS endpoints and approved branding/legal values. Keep upload keystore/password files outside source control and use CI secret files with minimal retention.

```bash
flutter pub get
flutter analyze --fatal-infos
flutter test --coverage
flutter build appbundle --release \
  --dart-define=API_URL=https://api.client.example/api/v1 \
  --dart-define=WEBSOCKET_URL=https://api.client.example/live \
  --dart-define=APP_NAME="Approved Product Name" \
  --dart-define=PRIVACY_POLICY_URL=https://client.example/privacy \
  --dart-define=TERMS_URL=https://client.example/terms \
  --dart-define=SUPPORT_EMAIL=support@client.example
```

Configure Gradle release signing through CI/local untracked properties, increment `version` and build number in `pubspec.yaml`, verify the AAB signature and provenance, scan dependencies, and retain checksums.

## Rollout

Upload to Internal testing, test account creation/links/deep links, auth refresh, offline cache, realtime reconnect, favorites/preferences, maintenance/upgrade responses, and account export/deletion on physical devices. Promote through Closed/Open testing as appropriate, review pre-launch reports and accessibility, then use a staged production rollout with API/mobile error monitoring and a documented halt percentage.

An AAB cannot be rolled back in place. Halt rollout and publish a higher build number containing the fix. Keep the server backward compatible through the adoption window and use `MOBILE_MINIMUM_VERSION` only for urgent security/incompatibility cases with clear user messaging.
