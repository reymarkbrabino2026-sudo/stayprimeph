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
| iPhone | Safari | Not tested |  |
| Android | Chrome | Not tested |  |
| Desktop | Chrome or Edge | Not tested |  |

## Automated pre-check

Completed on June 7, 2026:

- iPhone 13 viewport emulation passed for `/`, `/search`, `/login`, `/register`, `/legal/privacy`, `/legal/terms`, and `/legal/data-deletion`.
- Pixel 5 viewport emulation passed for `/`, `/search`, `/login`, `/register`, `/legal/privacy`, `/legal/terms`, and `/legal/data-deletion`.
- Desktop `1440 x 900` viewport passed for `/`, `/search`, `/login`, `/register`, `/legal/privacy`, `/legal/terms`, and `/legal/data-deletion`.
- No horizontal overflow was detected on those automated public-page checks.

This automated pre-check does not mark real-device QA complete.

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
| Homepage loads without blank screen | Not tested | Not tested | Not tested |  |
| Header/nav is usable | Not tested | Not tested | Not tested |  |
| Footer links open | Not tested | Not tested | Not tested |  |
| Search page opens | Not tested | Not tested | Not tested |  |
| Search filters are usable | Not tested | Not tested | Not tested |  |
| Listing cards do not overlap | Not tested | Not tested | Not tested |  |
| Listing details page opens | Not tested | Not tested | Not tested |  |
| Photos render correctly | Not tested | Not tested | Not tested |  |
| Map area renders correctly | Not tested | Not tested | Not tested |  |
| No sideways horizontal scrolling | Not tested | Not tested | Not tested |  |

## Login and account

Test on iPhone, Android, and desktop.

| Check | iPhone | Android | Desktop | Notes |
| --- | --- | --- | --- | --- |
| Email login works | Not tested | Not tested | Not tested |  |
| Google login works | Not tested | Not tested | Not tested |  |
| Facebook login works | Not tested | Not tested | Not tested |  |
| Logout works | Not tested | Not tested | Not tested |  |
| Account settings page opens | Not tested | Not tested | Not tested |  |
| Account setting save shows confirmation | Not tested | Not tested | Not tested |  |
| Notification/privacy settings are tappable | Not tested | Not tested | Not tested |  |

## Guest flow

Test on iPhone, Android, and desktop.

| Check | iPhone | Android | Desktop | Notes |
| --- | --- | --- | --- | --- |
| Guest dashboard opens | Not tested | Not tested | Not tested |  |
| Guest bookings page opens | Not tested | Not tested | Not tested |  |
| Wishlist button is tappable | Not tested | Not tested | Not tested |  |
| Start checkout from listing | Not tested | Not tested | Not tested |  |
| Stripe sandbox checkout opens | Not tested | Not tested | Not tested |  |
| Return from checkout works | Not tested | Not tested | Not tested |  |

## Host flow

Test on iPhone, Android, and desktop.

| Check | iPhone | Android | Desktop | Notes |
| --- | --- | --- | --- | --- |
| Host dashboard opens | Not tested | Not tested | Not tested |  |
| Host listings page opens | Not tested | Not tested | Not tested |  |
| Create listing wizard opens | Not tested | Not tested | Not tested |  |
| Form fields are easy to tap/type | Not tested | Not tested | Not tested |  |
| Date/number inputs are usable | Not tested | Not tested | Not tested |  |
| Photo upload works from camera roll/gallery | Not tested | Not tested | Not tested |  |
| Listing submit button is visible and tappable | Not tested | Not tested | Not tested |  |

## Admin flow

Desktop is most important for admin, but check phone access enough to confirm it does not break.

| Check | iPhone | Android | Desktop | Notes |
| --- | --- | --- | --- | --- |
| Admin dashboard opens for admin only | Not tested | Not tested | Not tested |  |
| Users page opens | Not tested | Not tested | Not tested |  |
| Listings approval page opens | Not tested | Not tested | Not tested |  |
| Bookings page opens | Not tested | Not tested | Not tested |  |
| Payments page opens | Not tested | Not tested | Not tested |  |
| Non-admin cannot access admin pages | Not tested | Not tested | Not tested |  |

## Legal and support

Test on iPhone, Android, and desktop.

| Check | iPhone | Android | Desktop | Notes |
| --- | --- | --- | --- | --- |
| Terms page opens | Not tested | Not tested | Not tested |  |
| Privacy page opens | Not tested | Not tested | Not tested |  |
| Data deletion page opens | Not tested | Not tested | Not tested |  |
| Support page opens | Not tested | Not tested | Not tested |  |
| Text is readable without zooming | Not tested | Not tested | Not tested |  |

## Go/no-go rule

Do not mark real-device QA complete until:

- iPhone Safari has no blocking issues.
- Android Chrome has no blocking issues.
- Desktop Chrome or Edge has no blocking issues.
- Any failed checkout, login, upload, booking, or admin issue has been fixed or explicitly accepted as not launch-blocking.
