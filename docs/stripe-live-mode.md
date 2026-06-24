# Legacy Stripe live mode runbook

This is retained only as historical reference for the legacy Stripe integration. It is not the current launch payment path.

Current decision as of June 23, 2026:

- Manual GCash/bank-transfer payment is the current setup.
- PayMongo is the intended future online payment provider.
- Stripe should remain disabled unless the business explicitly reverses the PayMongo decision.

Do not paste live Stripe secret keys into chat, screenshots, issues, email, or committed files. Put live secrets directly into Vercel Environment Variables.

## Current code status

- Checkout route: `POST /api/payments/checkout`
- Webhook route: `POST /api/payments/webhook`
- Checkout mode: one-time payment
- Currency: `php`
- Booking is marked paid only after a valid Stripe webhook with `checkout.session.completed`, `payment_status=paid`, matching currency, and matching amount.
- Production should keep `PAYMENT_LAUNCH_MODE=disabled` while manual payments are current and hosted provider checkout is disabled.
- App variables already used by the code:
  - `PAYMENT_LAUNCH_MODE`
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`

## Before switching to live mode

- [ ] Stripe account is activated for live charges.
- [ ] Stripe business profile is complete.
- [ ] Bank payout account is configured.
- [ ] Statement descriptor is correct and recognizable.
- [ ] Customer support email/phone is correct in Stripe.
- [ ] StayPrimePH business/legal operator details are confirmed.
- [ ] Terms, Privacy Policy, Cancellation Policy, Safety Policy, and refund process are approved for real payments.
- [ ] Real-device QA is complete on iPhone, Android, and desktop.
- [ ] Sentry, Vercel logs, Stripe logs, and admin payments page are ready to monitor the first payment.
- [ ] A rollback plan exists: restore test keys in Vercel and redeploy if live checkout misbehaves.

## Stripe dashboard steps

1. Open Stripe Dashboard.
2. Switch from sandbox/test mode to live mode.
3. Go to Developers -> API keys.
4. Copy the live publishable key. It starts with `pk_live_`.
5. Create or reveal the live server key. It starts with `sk_live_` or, preferably, use a restricted key starting with `rk_live_` if it has the required Checkout permissions.
6. Go to Developers -> Webhooks.
7. Create a live webhook endpoint:
   - Endpoint URL: `https://stayprimeph.com/api/payments/webhook`
   - Event to send: `checkout.session.completed`
8. Copy the live webhook signing secret for that endpoint. It starts with `whsec_`.

## Vercel production environment variables

In Vercel -> StayPrimePH project -> Settings -> Environment Variables -> Production:

- Replace `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` with the `pk_live_...` value.
- Replace `STRIPE_SECRET_KEY` with the `sk_live_...` or `rk_live_...` value.
- Replace `STRIPE_WEBHOOK_SECRET` with the live endpoint `whsec_...` value.
- Set `PAYMENT_LAUNCH_MODE` to `stripe`.

Keep Preview/Development on test keys unless you intentionally want those environments to create real payments.

## Deploy

After saving the Production environment variables:

```powershell
npx.cmd vercel@latest --prod --yes
```

## First live payment test

Use the smallest practical real booking amount. This must use a real card or real payment method because Stripe test cards do not work in live mode.

- [ ] Create or choose a low-value listing/booking.
- [ ] Start checkout on `https://stayprimeph.com`.
- [ ] Confirm Stripe Checkout shows the correct listing name.
- [ ] Confirm the amount and currency are correct before paying.
- [ ] Complete payment with a real card/payment method.
- [ ] Confirm redirect returns to the booking page.
- [ ] Confirm Stripe Dashboard shows successful live payment.
- [ ] Confirm Stripe webhook delivery succeeded.
- [ ] Confirm booking is marked paid in StayPrimePH.
- [ ] Confirm admin payments page shows the payment.
- [ ] Confirm guest and host booking pages show the paid booking.
- [ ] Confirm confirmation emails arrive.
- [ ] Refund the test live payment in Stripe if it was only a test transaction.

## If something goes wrong

1. Stop additional checkout attempts.
2. Restore the previous test Stripe keys in Vercel Production.
3. Redeploy.
4. Check Stripe Dashboard logs, Vercel logs, and Sentry.
5. Confirm any live charge was refunded or handled with the customer.

## Official Stripe references

- Stripe API keys: `https://docs.stripe.com/keys`
- Stripe go-live checklist: `https://docs.stripe.com/get-started/checklist/go-live`
- Stripe Checkout fulfillment/webhooks: `https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted`
