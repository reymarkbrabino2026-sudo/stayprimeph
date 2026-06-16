# PayMongo setup guide

This guide describes the planned StayPrimePH payment setup while replacing Stripe with PayMongo.

## Goal

StayPrimePH is a lodging marketplace. For each booking:

- The guest pays the full booking amount through PayMongo.
- StayPrimePH keeps a 20% markup/platform share.
- The host receives the remaining payout.
- Host payout setup should not block signup or listing creation.

Example:

| Item | Amount |
| --- | ---: |
| Host earning | PHP 10,000 |
| StayPrimePH 20% markup | PHP 2,000 |
| Guest total | PHP 12,000 |

## Recommended launch model

Use PayMongo Hosted Checkout first, then add marketplace split payments once PayMongo enables platform features for the account.

Initial flow:

1. Guest books a stay.
2. Guest pays the full booking amount through PayMongo Hosted Checkout.
3. PayMongo sends a paid webhook to StayPrimePH.
4. StayPrimePH marks the booking paid.
5. StayPrimePH records:
   - total guest payment
   - StayPrimePH markup
   - host payable amount
6. Host completes payout setup before the payout is released.
7. StayPrimePH releases the host payout after the chosen release event, such as check-in or checkout.

This avoids forcing every new host to complete PayMongo onboarding before they can create a listing.

## Useful PayMongo links

- PayMongo signup: https://dashboard.paymongo.com/signup
- Hosted Checkout guide: https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- Create Checkout Session v2: https://docs.paymongo.com/reference/create-a-checkout-v2
- Webhook setup: https://docs.paymongo.com/docs/developer-tools-webhook-setup-management
- Linked accounts: https://docs.paymongo.com/docs/account-settings-linked-accounts
- Account capabilities: https://docs.paymongo.com/docs/account-settings-account-capabilities
- PayMongo Platforms: https://www.paymongo.com/products/platform

## Phase 1: Create the PayMongo account

1. Sign up at https://dashboard.paymongo.com/signup.
2. Create the account under the StayPrimePH business.
3. Complete PayMongo business verification.
4. Add the StayPrimePH settlement bank account.
5. Enable the payment methods needed for launch:
   - cards
   - GCash
   - QR Ph
   - online banking, if available

Keep live keys private. Do not paste live keys into chat, screenshots, tickets, source code, or documentation.

## Phase 2: Request marketplace/platform access

Contact PayMongo support or sales and request platform features.

Suggested message:

```txt
Hello PayMongo team,

We are building StayPrimePH, a lodging marketplace in the Philippines.
Guests pay for bookings through our platform. StayPrimePH keeps a 20% platform markup, and hosts receive the remaining payout.

We would like to use PayMongo Hosted Checkout first, then enable Linked Accounts / Platforms / split payments / host payouts when available for our account.

Please advise the required onboarding, KYB/KYC, API access, and recommended integration flow for this marketplace setup.
```

Ask PayMongo to confirm:

- whether Linked Accounts / Platforms can be enabled for StayPrimePH
- whether split payments can send the host share directly to a host child account
- whether funds can be held and released after check-in or checkout
- what host KYC or bank details are required
- whether StayPrimePH can use PayMongo-hosted onboarding for hosts
- webhook events needed for checkout, payment, payout, refund, and dispute tracking

## Phase 3: Configure environment variables

Add these variables in Vercel when the PayMongo integration is implemented:

```txt
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=
```

Optional, if a future client-side PayMongo flow requires it:

```txt
NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY=
```

Use test keys in preview/development and live keys only in production.

## Phase 4: Hosted Checkout integration

The app should create a PayMongo Checkout Session from the server.

Checkout request requirements:

- Use PayMongo Checkout Session v2.
- Amount should come from the server-side booking total.
- Currency should be `PHP`.
- Store the booking ID in both:
  - `reference_number`
  - `metadata.bookingId`
- Redirect success and cancel URLs back to the guest booking page.
- Use an idempotency key based on the booking ID to avoid duplicate checkout sessions on retry.

Example data model:

```txt
booking.totalPrice = 12000
stayprimeShare = 2000
hostPayable = 10000
```

## Phase 5: Webhook setup

Create the webhook in the PayMongo dashboard:

```txt
https://stayprimeph.com/api/payments/webhook
```

Subscribe first to:

```txt
checkout_session.payment.paid
```

The webhook route must:

1. Read the raw request body.
2. Verify `Paymongo-Signature` with `PAYMONGO_WEBHOOK_SECRET`.
3. Reject invalid signatures before parsing the body.
4. Ignore unknown events with a 2xx response.
5. For paid checkout events:
   - read `metadata.bookingId` or `reference_number`
   - load the booking from the database
   - verify currency is `PHP`
   - verify amount matches the expected booking amount
   - mark booking paid
   - record the PayMongo transaction ID
   - create or update the StayPrimePH platform ledger entry
6. Handle duplicate webhook delivery safely.

## Phase 6: Host payout setup

Do not require payout setup during host signup.

Recommended host flow:

1. Host signs up.
2. Host creates a listing.
3. Listing can be reviewed and approved.
4. Host dashboard shows a task:

```txt
Add your payout method before your first guest checks in so we can send your earnings on time.
```

5. After a paid booking exists, payout setup becomes more urgent:

```txt
Complete payout setup to receive PHP 10,000 for this booking.
```

6. Before payout release, host must complete PayMongo linked account or payout setup.

StayPrimePH should avoid storing raw bank details when PayMongo can collect them. Prefer storing only:

- PayMongo host account ID
- payout setup status
- verification/KYC status
- payout method label, such as bank name or masked account details, if PayMongo allows it

## Phase 7: Payout release policy

Do not release host payout immediately when the guest pays.

Recommended policy:

- collect payment when booking is confirmed
- hold host payable amount until check-in or checkout
- release payout only if there is no cancellation, refund, or active dispute

Airbnb-style release:

```txt
Guest pays at booking
StayPrimePH records host payable
Payout is released after guest check-in or checkout
```

This protects StayPrimePH from:

- host cancellation
- guest refund requests
- listing issues
- fraud checks
- failed or incomplete host payout setup

## Phase 8: Testing checklist

Before enabling live payments:

- [ ] PayMongo test secret key is configured.
- [ ] PayMongo test webhook secret is configured.
- [ ] Checkout session is created from a real booking.
- [ ] Guest is redirected to PayMongo Hosted Checkout.
- [ ] Payment success redirects back to the booking page.
- [ ] Webhook signature verification passes.
- [ ] Booking is marked paid only after the webhook.
- [ ] Amount mismatch is rejected.
- [ ] Currency mismatch is rejected.
- [ ] Duplicate webhook delivery does not duplicate ledger entries.
- [ ] Admin payments page shows full payment amount.
- [ ] Admin payments page shows StayPrimePH 20% markup.
- [ ] Admin payments page shows host payable amount.
- [ ] Host payout status is visible in the host/admin dashboard.
- [ ] Refund/cancellation handling is defined before live launch.

## Phase 9: Go-live checklist

- [ ] StayPrimePH PayMongo account is live verified.
- [ ] Required payment methods are enabled.
- [ ] Production webhook endpoint is registered.
- [ ] Production webhook signature verification is tested.
- [ ] Live keys are stored only in Vercel environment variables.
- [ ] Stripe checkout remains disabled.
- [ ] Manual GCash/bank transfer fallback still works.
- [ ] First live booking uses a small controlled test amount.
- [ ] PayMongo dashboard, Vercel logs, and Sentry are monitored during the first live payment.
- [ ] Support/refund process is ready before public launch.

## Current code status

As of this guide, Stripe checkout has been disabled in the app while PayMongo planning continues.

Manual payment flows remain available.

The PayMongo implementation still needs to be built before online checkout can be re-enabled.
