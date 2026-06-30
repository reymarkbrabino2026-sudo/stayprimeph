# Google Play upload handoff

As of June 27, 2026, StayPrimePH is a production Next.js web app, not a native Android project. The current repository cannot be uploaded directly to Google Play. Google Play needs an Android artifact, preferably a signed Android App Bundle (`.aab`).

The recommended fast path is a Trusted Web Activity (TWA) wrapper generated with Bubblewrap. This keeps the live web app as the source of truth while producing the Android shell Google Play expects.

## Current status

- Production web app: `https://stayprimeph.com`
- Web manifest: `https://stayprimeph.com/manifest.webmanifest` returns successfully.
- Privacy Policy: `https://stayprimeph.com/legal/privacy` returns successfully.
- Data Deletion Instructions: `https://stayprimeph.com/legal/data-deletion` returns successfully.
- Digital Asset Links: `https://stayprimeph.com/.well-known/assetlinks.json` is not deployed yet. This must be added after the Android signing fingerprint is known.
- Local machine check: Java 17 is installed, but `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and `JAVA_HOME` are not currently set. Bubblewrap starts interactive dependency setup on first run.

## Recommended wrapper strategy

Use Bubblewrap to create a TWA project from the existing manifest.

Suggested project values:

- App name: `StayPrimePH`
- Package name: `com.stayprimeph.app` unless the client prefers another permanent ID.
- Manifest URL: `https://stayprimeph.com/manifest.webmanifest`
- Launch URL: `https://stayprimeph.com/`
- Host: `stayprimeph.com`
- Theme color: `#083f35`
- Category: Travel & Local, or Lifestyle if the client wants broader positioning.
- Release artifact: signed `app-release-bundle.aab`

The package name is permanent once used in Play Console. Get explicit client approval before publishing the first release under it.

## Build flow

Run this from a machine with Android Studio or Android SDK command-line tools configured:

```powershell
npm install -g @bubblewrap/cli
bubblewrap validate --url=https://stayprimeph.com
bubblewrap init --manifest=https://stayprimeph.com/manifest.webmanifest --directory=android-twa
Set-Location android-twa
bubblewrap build
```

Bubblewrap should produce:

- `app-release-signed.apk` for direct device testing.
- `app-release-bundle.aab` for Play Console upload.

Do not commit keystores, keystore passwords, Play service account JSON files, or upload certificates to the repository.

## Digital Asset Links

After the signing key exists, generate the asset links file from the TWA project:

```powershell
bubblewrap fingerprint generateAssetLinks --output=assetlinks.json
```

Deploy the generated JSON at:

```text
public/.well-known/assetlinks.json
```

Expected shape:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.stayprimeph.app",
      "sha256_cert_fingerprints": ["REPLACE_WITH_RELEASE_CERT_SHA256"]
    }
  }
]
```

Once deployed, verify `https://stayprimeph.com/.well-known/assetlinks.json` returns `200`.

## Play Console checklist

Client or account owner must provide:

- Google Play Console access with permission to create releases.
- Developer account type: personal or organization.
- Approved package name.
- Decision on Play App Signing. Recommended: use Play App Signing and keep a separate upload key.
- Store listing copy approval.
- Store listing graphics: 512 x 512 app icon, 1024 x 500 feature graphic, and phone screenshots.
- Review/test credentials for guest, host, and admin-restricted areas.
- Data Safety answers approved by the business/legal owner.
- Production support contact details.

Create the app in Play Console:

- App name: `StayPrimePH`
- App/game: App
- Free/paid: Free
- Default language: English
- Declarations: confirm policies, ads, target audience, content rating, data safety, app access, and privacy policy.

## Store listing draft

Short description:

```text
Book and host Philippine staycations.
```

Full description draft:

```text
StayPrimePH helps guests discover short-term stays across the Philippines and gives hosts tools to manage listings, bookings, messages, and payments.

Guests can browse available stays, review listing details, manage bookings, message hosts, and keep payment and support records in one place.

Hosts can publish property listings, manage availability, review bookings, track guest conversations, and use admin-supported marketplace workflows built for local staycation operations.

StayPrimePH includes account security, privacy controls, support pages, cancellation guidance, and data deletion instructions for users who need account or privacy help.
```

Release notes for first internal test:

```text
Initial Android test release for StayPrimePH.
```

## Data Safety starter notes

These are implementation notes for the Play Console Data Safety form. The final form should be reviewed by the client or legal owner.

Likely collected data:

- Personal info: name, email address, phone number when provided, account identifiers, profile details.
- Financial info: payment status, payment method labels, manual payment references, payout and tax settings. The app should not store full card numbers or bank login credentials.
- Location: listing addresses, property map coordinates, user-entered search locations, and optional browser geolocation if users use nearby search.
- Photos and videos: listing photos, avatar images, receipt/payment-proof images if enabled.
- App activity: bookings, wishlists, listings, messages, reviews, support requests, safety reports, host reports, and admin decisions.
- App info and performance: security logs, rate-limit records, error-monitoring data, audit logs, and diagnostics.

Likely sharing/processing parties:

- Hosting, database, storage, email, payment, authentication, security, analytics, rate-limit, and error-monitoring providers.
- Guests, hosts, and admins where needed for bookings, listings, messages, support, disputes, and marketplace operations.

Current public URLs for Play forms:

- Privacy Policy: `https://stayprimeph.com/legal/privacy`
- Data deletion: `https://stayprimeph.com/legal/data-deletion`
- Terms: `https://stayprimeph.com/legal/terms`
- Support/help: `https://stayprimeph.com/support`

## Payment policy note

StayPrimePH appears to handle real-world accommodation bookings, not digital goods. Current Google Play payment rules focus Play Billing requirements on in-app purchases of digital goods and services. Still, the client should confirm the marketplace/payment flow with policy or legal review before production submission, especially if hosted checkout or PayMongo is enabled later.

## Testing timeline

1. Build signed TWA artifact.
2. Deploy and verify `assetlinks.json`.
3. Install the APK on at least one physical Android device and run guest, host, auth, upload, search, booking, messaging, legal, support, and account deletion flows.
4. Upload the AAB to internal testing first.
5. If the Play Console account is a new personal account, run closed testing with at least 12 opted-in testers for 14 continuous days before applying for production access.
6. Submit production release after App Content, Data Safety, Content Rating, App Access, and store listing are complete.

## Official references

- Target API level requirement: `https://developer.android.com/google/play/requirements/target-sdk`
- Trusted Web Activities overview: `https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities`
- Bubblewrap quick start: `https://developer.chrome.com/docs/android/trusted-web-activity/quick-start`
- Bubblewrap CLI reference: `https://github.com/GoogleChromeLabs/bubblewrap/blob/main/packages/cli/README.md`
- Play App Signing: `https://support.google.com/googleplay/android-developer/answer/9842756`
- Prepare and roll out a release: `https://support.google.com/googleplay/android-developer/answer/9859348`
- App review preparation: `https://support.google.com/googleplay/android-developer/answer/9859455`
- Data Safety form: `https://support.google.com/googleplay/android-developer/answer/10787469`
- New personal account testing requirement: `https://support.google.com/googleplay/android-developer/answer/14151465`
- Payments policy overview: `https://support.google.com/googleplay/android-developer/answer/10281818`
