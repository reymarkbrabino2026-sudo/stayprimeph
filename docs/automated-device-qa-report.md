# Automated production device QA report

Run date: June 19, 2026

Production URL: `https://stayprimeph.com`

This was run with Playwright using iPhone 13 emulation, Pixel 5/Android emulation, and desktop Chromium. It is useful launch evidence, but it is not the same as physical iPhone Safari, physical Android Chrome, or hands-on desktop QA.

## Summary

| Target | Result | Notes |
| --- | --- | --- |
| iPhone Safari emulation | Pass | Public pages, search, approved listing detail, login, register, legal pages, support, and status loaded without app errors or horizontal overflow. |
| Android Chrome emulation | Pass | Public pages, search, approved listing detail, login, register, legal pages, support, and status loaded without app errors or horizontal overflow. |
| Desktop Chromium | Pass | Public pages, search, approved listing detail, login, register, legal pages, support, and status loaded without app errors or horizontal overflow. |

## Passed checks

- Homepage loads.
- Search page loads.
- Approved production listing detail loads: `/rooms/46d34c9c-ae54-4ca5-9286-1ec6452b58c1`.
- Login page loads and email/password fields are usable.
- Register/host registration UI loads.
- Legal pages load:
  - `/legal/privacy`
  - `/legal/terms`
  - `/legal/data-deletion`
- Support page loads.
- Public status page loads and shows the generic platform, guest, host, and support availability sections.
- Guest dashboard blocks logged-out access and redirects to login.
- Host dashboard blocks logged-out access and redirects to login.
- Admin dashboard blocks logged-out access and redirects to login.
- No horizontal overflow was detected on the checked public pages.

## Blocked checks

- Guest dashboard hands-on QA: blocked because production demo credentials are not accepted.
- Host dashboard hands-on QA: blocked because production demo credentials are not accepted.
- Admin dashboard hands-on QA: blocked because production demo credentials are not accepted.
- Photo upload from iPhone/Android gallery: blocked because physical devices are required.

## Current production listing finding

Production search currently shows 3 public listings. Listing detail and checkout handoff were verified separately for:

- `/rooms/46d34c9c-ae54-4ca5-9286-1ec6452b58c1`

## Evidence files

Generated screenshots and JSON report from the earlier June 7 pre-check:

- `test-results/production-device-qa/iphone-final.png`
- `test-results/production-device-qa/android-final.png`
- `test-results/production-device-qa/desktop-final.png`
- `test-results/production-device-qa/report.json`

These files are local QA artifacts and are not committed.

## Current verdict

Automated device-emulation QA passes for public browsing, legal/support/status pages, search, and an approved listing detail page. Real-device QA and authenticated dashboard/upload checks remain open until:

- Physical iPhone Safari is tested.
- Physical Android Chrome is tested.
- Desktop browser is tested hands-on.
- Real guest/host/admin accounts or dedicated QA accounts are available for dashboard testing.
