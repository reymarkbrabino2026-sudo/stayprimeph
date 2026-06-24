# Meta/Facebook public launch runbook

Use this to close the Meta/Facebook public launch items in `docs/project-checklist.md`.

## Code-side readiness

- App icon asset: `public/meta-app-icon.png`
- Verified local asset size: `1024 x 1024` PNG
- Public site: `https://stayprimeph.com`
- Privacy Policy URL: `https://stayprimeph.com/legal/privacy`
- Terms URL: `https://stayprimeph.com/legal/terms`
- Data Deletion URL: `https://stayprimeph.com/legal/data-deletion`
- Supabase OAuth callback URL: `https://iiqbmcycsdaukoigsqfx.supabase.co/auth/v1/callback`
- Supabase app redirect URL: `https://stayprimeph.com/auth/callback`

## Meta dashboard steps

1. Open the StayPrimePH app in Meta for Developers.
2. Go to **App settings > Basic**.
3. Upload `public/meta-app-icon.png` as the App Icon.
4. Confirm these Basic settings are saved:
   - App domain includes `stayprimeph.com`.
   - App domain includes `iiqbmcycsdaukoigsqfx.supabase.co`.
   - Privacy Policy URL is `https://stayprimeph.com/legal/privacy`.
   - Terms URL is `https://stayprimeph.com/legal/terms`.
   - User Data Deletion URL is `https://stayprimeph.com/legal/data-deletion`.
   - App category is set.
5. Go to the Facebook Login settings and confirm the valid OAuth redirect URI includes `https://iiqbmcycsdaukoigsqfx.supabase.co/auth/v1/callback`.
6. Go to **App Review > Permissions and Features**.
7. Confirm whether the current Facebook Login permissions need review or Advanced Access for public non-role users.
   - The current StayPrimePH flow only needs basic profile/email login data.
   - If Meta marks `email` or any requested feature as requiring review or Advanced Access, submit the request before public launch.
8. Switch the app from Development mode to Live mode only after the settings above are saved and the public URLs are reachable.
9. Test Facebook login on `https://stayprimeph.com` using a real Facebook account that is not assigned an app role in Meta.

## Evidence to record before checking items off

- Screenshot or note confirming the App Icon is visible in Meta Basic settings.
- Screenshot or note confirming the app is Live.
- Screenshot or note confirming the permissions/review status for Facebook Login.
- Result of a successful production Facebook login from a non-role account.

Do not mark the Meta/Facebook checklist items as complete until the dashboard evidence exists.

## Evidence log

- June 23, 2026: Meta app icon upload recorded as complete based on external confirmation that the app icon is visible in Meta Basic settings.
- June 23, 2026: Meta app Live mode recorded as complete based on external confirmation that the app is published/live in Meta for Developers.
- June 23, 2026: Facebook Login permissions/review status recorded as complete based on external confirmation that Meta Login Review was submitted/approved or not required for the current public login permissions.
