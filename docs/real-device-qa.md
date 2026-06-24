# StayPrimePH real-device QA

Use this on the live site: `https://stayprimeph.com`

This checklist must be completed on physical devices. Browser emulation and Playwright responsive tests are helpful, but they do not replace real Safari/Chrome behavior, keyboard behavior, upload behavior, tap targets, scrolling, and provider login redirects on actual phones.

## Result key

- Pass
- Fail
- Blocked
- Notes / screenshot

## Devices to test

| Device | Browser | Result | Notes |
| --- | --- | --- | --- |
| iPhone | Safari | Pass | Completed June 23, 2026 based on external launch signoff confirmation. |
| Android | Chrome | Pass | Completed June 23, 2026 based on external launch signoff confirmation. |
| Desktop | Chrome or Edge | Pass | Completed June 23, 2026 based on external launch signoff confirmation. |

## Automated pre-check

Completed on June 7, 2026:

- iPhone 13 viewport emulation passed for `/`, `/search`, `/login`, `/register`, `/legal/privacy`, `/legal/terms`, and `/legal/data-deletion`.
- Pixel 5 viewport emulation passed for `/`, `/search`, `/login`, `/register`, `/legal/privacy`, `/legal/terms`, and `/legal/data-deletion`.
- Desktop `1440 x 900` viewport passed for `/`, `/search`, `/login`, `/register`, `/legal/privacy`, `/legal/terms`, and `/legal/data-deletion`.
- No horizontal overflow was detected on those automated public-page checks.

This automated pre-check does not mark real-device QA complete.

## June 23, 2026 physical-device signoff

- Physical iPhone Safari QA is recorded as completed with no launch-blocking issues based on external launch signoff confirmation.
- Physical Android Chrome QA is recorded as completed with no launch-blocking issues based on external launch signoff confirmation.
- Physical desktop Chrome/Edge QA is recorded as completed with no launch-blocking issues based on external launch signoff confirmation.
- Physical iPhone, Android, and desktop real-device QA signoffs are complete.

## Quick setup

1. Open `https://stayprimeph.com`.
2. Clear old tabs for StayPrimePH if login redirects feel strange.
3. Test with Wi-Fi first.
4. On phones, also test once using mobile data if available.
5. Take a screenshot for any broken layout, stuck loading state, blocked button, or strange redirect.

## Public browsing

Test on iPhone, Android, and desktop.

| Check | iPhone | Android | Desktop | Notes |
| --- | --- | --- | --- | --- |
| Homepage loads without blank screen | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Header/nav is usable | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Footer links open | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Search page opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Search filters are usable | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Listing cards do not overlap | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Listing details page opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Photos render correctly | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Map area renders correctly | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| No sideways horizontal scrolling | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |

## Login and account

Test on iPhone, Android, and desktop.

| Check | iPhone | Android | Desktop | Notes |
| --- | --- | --- | --- | --- |
| Email login works | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Google login works | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Facebook login works | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Logout works | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Account settings page opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Account setting save shows confirmation | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Notification/privacy settings are tappable | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |

## Guest flow

Test on iPhone, Android, and desktop.

| Check | iPhone | Android | Desktop | Notes |
| --- | --- | --- | --- | --- |
| Guest dashboard opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Guest bookings page opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Wishlist button is tappable | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Start checkout from listing | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Manual payment form opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Return from checkout works | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |

## Host flow

Test on iPhone, Android, and desktop.

| Check | iPhone | Android | Desktop | Notes |
| --- | --- | --- | --- | --- |
| Host dashboard opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Host listings page opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Create listing wizard opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Form fields are easy to tap/type | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Date/number inputs are usable | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Photo upload works from camera roll/gallery | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Listing submit button is visible and tappable | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |

## Admin flow

Desktop is most important for admin, but check phone access enough to confirm it does not break.

| Check | iPhone | Android | Desktop | Notes |
| --- | --- | --- | --- | --- |
| Admin dashboard opens for admin only | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Users page opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Listings approval page opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Bookings page opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Payments page opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Non-admin cannot access admin pages | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |

## Legal and support

Test on iPhone, Android, and desktop.

| Check | iPhone | Android | Desktop | Notes |
| --- | --- | --- | --- | --- |
| Terms page opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Privacy page opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Data deletion page opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Support page opens | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |
| Text is readable without zooming | Pass | Pass | Pass | Covered by June 23 physical-device signoff. |

## Go/no-go rule

Do not mark real-device QA complete until:

- iPhone Safari has no blocking issues.
- Android Chrome has no blocking issues.
- Desktop Chrome or Edge has no blocking issues.
- Any failed checkout, login, upload, booking, or admin issue has been fixed or explicitly accepted as not launch-blocking.
