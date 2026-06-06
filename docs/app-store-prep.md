# Future iOS / Android packaging prep

StayPrimePH is a responsive web app today. These notes prepare it for a future Capacitor or native wrapper without forcing that work early.

## Web app readiness

- Keep primary flows mobile-first and touch-friendly.
- Preserve safe-area spacing for iPhone and Android gesture navigation.
- Avoid hover-only interactions.
- Keep modals and sheets usable on small screens.
- Keep upload, map, checkout, auth, and dashboard flows functional on mobile browsers.

## Packaging prerequisites

- Add production app icons and splash assets.
- Confirm PWA manifest details: name, short name, theme color, start URL, display mode.
- Choose wrapper strategy: Capacitor first for speed, native rebuild later only if needed.
- Validate deep links for listing, booking, reset password, and email verification URLs.
- Confirm provider SDKs work inside embedded browser contexts.

## App-store review readiness

- Finalize terms, privacy policy, cancellation policy, and safety policy.
- Add support contact and account deletion instructions.
- Confirm payments comply with marketplace and platform rules.
- Test login, booking, photo upload, maps, and messaging on physical iOS and Android devices.
