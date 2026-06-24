# Manual launch QA checklist

Use this before public launch and again after pointing the production domain.

Record each result as:

- Pass
- Fail
- Blocked
- Notes / screenshot link

## 1. Legal and policy review

- [ ] Terms reviewed by qualified legal counsel.
- [ ] Privacy Policy reviewed by qualified privacy/legal counsel.
- [ ] Cancellation Policy finalized for real bookings and payments.
- [ ] Safety Policy reviewed for host, guest, dispute, and emergency language.
- [ ] Company/support/legal footer links work from desktop and mobile.
- [ ] Contact/support path is clear for disputes and payment issues.

## 2. Device and browser coverage

Test the production URL on real devices, not only browser emulation.

- [ ] iPhone Safari
- [ ] Android Chrome
- [ ] Tablet Safari or Chrome
- [ ] Desktop Chrome
- [ ] Desktop Safari or Edge
- [ ] Slow mobile network profile

For each device:

- [ ] Homepage loads without layout breakage.
- [ ] Search page works.
- [ ] Listing detail page works.
- [ ] Login/register forms are usable.
- [ ] Guest dashboard is usable.
- [ ] Host dashboard/listing flow is usable.
- [ ] Admin dashboard is usable.
- [ ] No horizontal scrolling unless intended.
- [ ] Sticky/bottom navigation does not cover important actions.

## 3. Manual accessibility pass

- [ ] Keyboard-only navigation works through public pages.
- [ ] Keyboard-only navigation works through login/register.
- [ ] Keyboard-only navigation works through checkout.
- [ ] Keyboard-only navigation works through host listing creation.
- [ ] Visible focus states are clear.
- [ ] Screen reader announces form labels and errors correctly.
- [ ] Page titles are meaningful.
- [ ] Dialogs/menus can be opened and closed by keyboard.
- [ ] 200% zoom works.
- [ ] 400% zoom keeps core flows usable.
- [ ] Reduced-motion preference is respected.
- [ ] Color contrast is acceptable on core actions and text.

## 4. Auth flows

### Register

- [ ] Guest can register.
- [ ] Host can register.
- [ ] Duplicate email is rejected cleanly.
- [ ] Weak/short password is rejected.
- [ ] Successful registration redirects to the correct dashboard.
- [ ] Welcome email is delivered.
- [ ] Email verification email is delivered.

### Login/logout

- [ ] Guest login redirects to guest dashboard.
- [ ] Host login redirects to host dashboard.
- [ ] Admin login redirects to admin dashboard.
- [ ] Wrong password shows safe error.
- [ ] Wrong role login is rejected.
- [ ] Logout clears session and blocks dashboard access.

### Email verification

- [ ] Valid verification link marks account as verified.
- [ ] Expired/used verification link fails safely.

### Password reset

- [ ] Reset request always returns a safe generic response.
- [ ] Reset email is delivered.
- [ ] Valid reset link allows password change.
- [ ] Used/expired reset link fails safely.
- [ ] New password works.
- [ ] Old password no longer works.

## 5. Guest booking flow

- [ ] Search listings.
- [ ] Apply filters.
- [ ] Open listing detail page.
- [ ] Select dates.
- [ ] Select guest count.
- [ ] Price calculation is correct.
- [ ] Booking confirmation creates the correct booking record.
- [ ] Booking appears in guest booking history.
- [ ] Booking appears in host booking queue.
- [ ] Guest cannot book unavailable dates.
- [ ] Guest cannot book above max guest count.

## 6. Manual payment flow

Manual GCash/bank-transfer payment is the current launch setup. PayMongo online checkout is planned but not set up yet.

- [ ] Guest can open payment form from booking.
- [ ] Guest can select GCash.
- [ ] Guest can select bank transfer.
- [ ] Payment QR/reference instructions are visible.
- [ ] Guest can upload receipt screenshot.
- [ ] Guest can submit payment reference number.
- [ ] Submitted payment appears for host review.
- [ ] Submitted payment appears for admin payment review.
- [ ] Host/admin can approve a valid submitted payment.
- [ ] Host/admin can reject an invalid submitted payment with a reason.
- [ ] Approved manual payment marks booking paid.
- [ ] Payment record is visible in admin payments.
- [ ] Confirmation emails are delivered after payment approval.

## 7. Host listing flow

- [ ] Host can start listing wizard.
- [ ] Required listing fields validate correctly.
- [ ] Host can set property type.
- [ ] Host can enter address/location.
- [ ] Host can set bedrooms, bathrooms, guests.
- [ ] Host can select amenities.
- [ ] Host can set base price and fees.
- [ ] Host can upload JPG image.
- [ ] Host can upload PNG image.
- [ ] Host can upload WebP image.
- [ ] File larger than 5 MB is rejected.
- [ ] Non-image file is rejected.
- [ ] Cloudinary image appears after upload.
- [ ] Listing submits as pending.
- [ ] Pending listing is not public until approved.

## 8. Admin operations

- [ ] Admin can view users.
- [ ] Admin can view hosts.
- [ ] Admin can view pending listings.
- [ ] Admin can approve listing.
- [ ] Approved listing appears in search/public pages.
- [ ] Admin can reject listing.
- [ ] Rejected listing does not appear publicly.
- [ ] Admin can view bookings.
- [ ] Admin can view payments.
- [ ] Admin can view reports.
- [ ] Admin can view reviews.
- [ ] Admin can view disputes.
- [ ] Non-admin cannot access admin pages or actions.

## 9. Messaging, reviews, reports, disputes

- [ ] Guest can message host from booking context.
- [ ] Host can reply to guest.
- [ ] Messages show correct sender/receiver.
- [ ] Guest can leave review after completed stay.
- [ ] Review appears on listing.
- [ ] Rating calculation is correct.
- [ ] User can submit a report.
- [ ] Admin can view report.
- [ ] Admin can update dispute/report status.

## 10. Production observability

- [ ] Sentry receives test server error.
- [ ] Sentry receives test browser error.
- [ ] Analytics records page views/events.
- [ ] Upstash rate-limit telemetry is visible.
- [ ] Provider logs are accessible.
- [ ] Backup/restore process has been tested or rehearsed.

## 11. Final go/no-go

- [ ] `npm.cmd run prod:check` passes.
- [ ] `npm.cmd run lint` passes.
- [ ] `npm.cmd run test` passes.
- [ ] `npm.cmd run test:e2e` passes.
- [ ] `npm.cmd run build` passes.
- [ ] Production smoke test passes on deployed URL.
- [ ] Hosted provider checkout remains disabled until PayMongo implementation and final sign-off.
- [ ] Real production secrets are stored only in provider secret manager.
- [ ] Rollback plan is documented.
