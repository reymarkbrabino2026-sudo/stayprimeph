# Automated production device QA report

Run date: June 7, 2026

Production URL: `https://stayprimeph.com`

This was run with Playwright using iPhone 13 emulation, Pixel 5/Android emulation, and desktop Chromium. It is useful launch evidence, but it is not the same as physical iPhone Safari, physical Android Chrome, or hands-on desktop QA.

## Summary

| Target | Result | Notes |
| --- | --- | --- |
| iPhone Safari emulation | Partial pass | Public pages, login form, status/legal pages, and protected-route redirects loaded without horizontal overflow. Listing detail/checkout blocked because production search currently has `0 places available`. |
| Android Chrome emulation | Partial pass | Public pages, login form, status/legal pages, and protected-route redirects loaded without horizontal overflow. Listing detail/checkout blocked because production search currently has `0 places available`. |
| Desktop Chromium | Partial pass | Public pages, login form, status/legal pages, and protected-route redirects loaded without horizontal overflow. Listing detail/checkout blocked because production search currently has `0 places available`. |

## Passed checks

- Homepage loads.
- Search page loads.
- Login page loads and email/password fields are usable.
- Register/host registration UI loads.
- Legal pages load:
  - `/legal/privacy`
  - `/legal/terms`
  - `/legal/data-deletion`
- Support page loads.
- Status page loads.
- Guest dashboard blocks logged-out access and redirects to login.
- Host dashboard blocks logged-out access and redirects to login.
- Admin dashboard blocks logged-out access and redirects to login.
- No horizontal overflow was detected on the checked public pages.

## Blocked checks

- Listing detail from public search: blocked because `/search` currently shows `0 places available`.
- Checkout start: blocked because there is no public listing to open from search.
- Guest dashboard hands-on QA: blocked because production demo credentials are not accepted.
- Host dashboard hands-on QA: blocked because production demo credentials are not accepted.
- Admin dashboard hands-on QA: blocked because production demo credentials are not accepted.
- Photo upload from iPhone/Android gallery: blocked because physical devices are required.

## Important production finding

Production search currently reports `0 places available`, including for:

- `/search`
- `/search?location=Tagaytay`
- `/search?location=Baguio`

Known demo listing URLs such as `/rooms/p5` and `/rooms/42b8ae68-c9df-45f6-80c4-93a31e935c66` return the app's stay-not-found page in production. Before public launch, at least one approved public listing should exist so search, listing detail, booking, and checkout can be tested end to end.

## Evidence files

Generated screenshots and JSON report:

- `test-results/production-device-qa/iphone-final.png`
- `test-results/production-device-qa/android-final.png`
- `test-results/production-device-qa/desktop-final.png`
- `test-results/production-device-qa/report.json`

These files are local QA artifacts and are not committed.

## Current verdict

Automated device-emulation QA is partially passed for public browsing and protected-route behavior. Real-device QA and full booking/checkout device QA remain open until:

- Physical iPhone Safari is tested.
- Physical Android Chrome is tested.
- Desktop browser is tested hands-on.
- At least one approved production listing exists.
- Real guest/host/admin accounts or dedicated QA accounts are available for dashboard testing.
