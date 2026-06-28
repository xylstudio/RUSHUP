# Compliance Production Rollout

Last updated: 2026-05-05

## Objective

This runbook turns the implemented PDPA, consent, audit logging, and request-correlation changes into a usable production rollout.

## 1. Environment Prerequisites

Confirm these variables are set in the target environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `LINE_CHANNEL_ID`
- `LINE_CHANNEL_SECRET`
- `LINE_PASSWORD_SECRET`
- `LINE_REDIRECT_URI`
- `LINE_FRONTEND_SUCCESS_URL`
- `LINE_FRONTEND_ERROR_URL`
- `STRIPE_SECRET_KEY`
- `WEBHOOK_SECRET` or the production webhook secret actually used by your payment integration

## 2. Database Rollout

Apply the migration for consent evidence storage before enabling the updated auth and workshop flows.

Primary file:

- `migrations/20260505110000_add_user_consents.sql`

Recommended sequence:

1. Backup production database.
2. Apply the SQL in staging.
3. Verify `user_consents` exists and RLS is enabled.
4. Apply the SQL in production.

## 3. Application Verification

Verify these flows after deployment:

1. Email registration writes:
   - auth user
   - profile row
   - `user_consents` rows for privacy and terms
   - `audit_logs` entry for `register_succeeded`
2. LINE account linking writes:
   - `audit_logs` for `line_account_linked`
   - `user_consents` for `line_notifications`
3. Workshop checkout writes:
   - consent evidence
   - audit events for checkout start and payment initiation
4. Order creation writes:
   - audit event with `request_id`
5. Notification send writes:
   - `notification_sent`
   - `line_notification_delivery_failed` when applicable
6. System settings save writes:
   - attempt/success or error audit trail with `request_id`
7. Payment webhook writes:
   - webhook received
   - completed/failed/cancelled audit events

## 4. Admin Review

Open the admin audit log page and confirm:

1. `Consent / Policy` view shows consent-related events.
2. `Security / Access` view shows failures and authentication-related events.
3. `request_id` is visible in event details.

## 5. Smoke Test Commands

Run before production cutover when environment variables are available:

```bash
npm run typecheck
npm run build
npm run db:status
```

If your migration RPC helpers are not installed in Supabase, use the SQL file directly in Supabase SQL Editor instead of relying on the CLI migration helper.

## 6. Operational Note

The code now expects compliance evidence storage to exist. If `user_consents` is missing in production, registration and workshop checkout consent persistence will fail. Do not deploy the application changes without the migration.