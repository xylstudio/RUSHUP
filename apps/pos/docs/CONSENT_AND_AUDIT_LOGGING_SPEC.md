# Consent, Audit Logging, and PDPA Control Specification

Version: 1.0  
Last updated: 2026-05-05

## 1. Purpose

This document defines the minimum professional standard for privacy consent capture, audit logging, security logging, and data governance controls across the Xylem Landscape platform.

It covers customer, staff, admin, workshop, payment, LINE, notification, and operational workflows implemented in the current system.

## 2. Current State Summary

The platform already includes:

- public privacy and terms pages
- a structured application logger in `lib/logger.ts`
- an `audit_logs` table used by several API routes
- Sentry integration for runtime error monitoring
- admin UI for viewing some audit log events, currently focused on notification failures

Current gaps:

- no versioned consent record for privacy policy, terms, or marketing consent
- no central event taxonomy for audit and business events
- no redaction layer before structured logs are emitted
- inconsistent audit coverage across service, payment, authentication, and document access flows
- no documented retention matrix for logs and consent evidence

## 3. Objectives

The target state must ensure:

1. every material consent is captured with evidence
2. every high-risk or business-critical action is auditable
3. sensitive data is never written to logs in raw form
4. admin review can answer who did what, when, from where, and with what outcome
5. retention and deletion decisions are consistent with PDPA and operational obligations

## 4. Control Model

### 4.1 Control Layers

Implement four distinct event layers:

1. Application log
2. Audit log
3. Security log
4. Business event log

These layers may share infrastructure, but must remain distinguishable by schema and retention policy.

### 4.2 Definitions

- Application log: engineering and runtime telemetry for requests, latency, dependency failures, and debugging
- Audit log: immutable record of user or system actions that affect data, permissions, contracts, money, or compliance posture
- Security log: authentication, authorization, fraud, abuse, or suspicious activity trail
- Business event log: operational state changes that matter to service delivery but are not always compliance-critical on their own

## 5. Consent Capture Standard

### 5.1 Consent Events Required

Capture explicit evidence for the following events:

- privacy policy accepted
- terms of service accepted
- marketing consent granted
- marketing consent withdrawn
- LINE notification consent granted or updated
- cookie or analytics consent granted when non-essential trackers are introduced

### 5.2 Consent Data Model

Add a dedicated table such as `user_consents`.

Suggested columns:

```sql
create table user_consents (
  id bigserial primary key,
  user_id uuid null,
  email text null,
  consent_type text not null,
  consent_status text not null,
  policy_version text not null,
  policy_document text not null,
  source_channel text not null,
  locale text null,
  ip_address text null,
  user_agent text null,
  session_id text null,
  consent_text_snapshot text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  withdrawn_at timestamptz null
);
```

Rules:

- `consent_type` examples: `privacy_policy`, `terms_of_service`, `marketing`, `line_notifications`
- `consent_status` examples: `granted`, `withdrawn`, `reaffirmed`
- `policy_version` must match the published document version
- `consent_text_snapshot` is optional but recommended for high-risk legal changes

### 5.3 UX Capture Points

Minimum implementation points:

1. registration page
2. LINE sign-in or LINE account link flow
3. checkout or booking confirmation where terms materially apply
4. profile communication preferences page
5. admin-assisted customer creation flow

### 5.4 Enforcement Rules

- user cannot complete registration without accepting privacy policy and terms
- marketing consent must be optional and separate from service consent
- changing a policy version with material legal impact must trigger re-acceptance
- system must retain prior consent evidence when a new version is accepted

## 6. Audit Event Taxonomy

### 6.1 Minimum Schema

Standardize audit records with the following fields, whether stored in the current `audit_logs` table or a new normalized table:

```ts
type AuditEvent = {
  event_name: string
  event_category: 'consent' | 'auth' | 'security' | 'order' | 'payment' | 'notification' | 'document' | 'settings' | 'profile' | 'staff' | 'system'
  actor_id?: string
  actor_role?: 'customer' | 'staff' | 'admin' | 'system' | 'anonymous'
  actor_email_masked?: string
  entity_type?: string
  entity_id?: string
  target_user_id?: string
  source_channel?: 'web' | 'admin_portal' | 'customer_portal' | 'staff_portal' | 'api' | 'webhook' | 'line' | 'system_job'
  result: 'success' | 'failure' | 'denied'
  reason_code?: string
  request_id?: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, unknown>
  created_at: string
}
```

### 6.2 Required Audit Events

Consent:

- `privacy_policy_accepted`
- `terms_of_service_accepted`
- `marketing_consent_granted`
- `marketing_consent_withdrawn`

Authentication and security:

- `login_succeeded`
- `login_failed`
- `line_login_succeeded`
- `line_login_failed`
- `line_account_linked`
- `line_account_unlinked`
- `password_reset_requested`
- `permission_denied`

Customer and profile data:

- `profile_updated`
- `house_created`
- `house_updated`
- `house_image_uploaded`
- `measurement_requested`

Orders and scheduling:

- `order_created`
- `order_updated`
- `order_rescheduled`
- `order_cancelled`
- `service_assignment_created`
- `service_assignment_reassigned`

Payments and documents:

- `payment_checkout_started`
- `payment_succeeded`
- `payment_failed`
- `payment_refund_requested`
- `payment_refunded`
- `invoice_generated`
- `receipt_generated`

Notifications and communication:

- `notification_sent`
- `notification_delivery_failed`
- `line_notification_sent`
- `line_notification_delivery_failed`

Admin and configuration:

- `system_settings_updated`
- `price_template_updated`
- `feature_flag_changed`
- `customer_record_viewed_sensitive`
- `audit_log_exported`

Staff operations:

- `work_report_submitted`
- `work_photo_uploaded`
- `customer_notified_report_ready`

## 7. Business Event Coverage Map

The following areas must emit at least one auditable business event and one failure-path event when applicable:

1. registration
2. login
3. LINE callback and linking
4. house creation and image upload
5. order creation and order update
6. rescheduling and cancellation
7. workshop booking
8. payment checkout and payment webhook
9. notification send and retry
10. staff report upload and customer notification
11. admin settings save

## 8. Logging Safety and Redaction Standard

### 8.1 Never Log Raw Secrets

Do not log:

- passwords
- OTP values
- access tokens
- refresh tokens
- secret keys
- webhook secrets
- full payment payloads containing sensitive fields
- full card data or bank credentials

### 8.2 Masked or Reduced Logging

When logging personally identifiable data, apply the following defaults:

- email: mask middle portion
- phone: keep last 2 to 4 digits only
- address: log city, district, or internal house id instead of full free text where possible
- image URLs: log asset id or storage key, not signed URL
- payment references: store gateway reference id, not raw response body

### 8.3 Redaction Utility

Introduce a single utility called before `logger.log(...)` or audit persistence.

Example responsibilities:

- recursively strip keys such as `password`, `token`, `secret`, `authorization`, `cookie`
- truncate oversized payloads
- transform known identifiers into masked form
- record when redaction was applied

## 9. Request Correlation Standard

Every API route should include a `request_id` or correlation id so a single user action can be traced across:

- incoming request log
- database mutation
- notification send attempt
- external provider response
- audit event
- error event in Sentry

Recommended sources:

- incoming header if trusted
- generated UUID per request

## 10. Retention Policy

Recommended baseline:

- application logs: 30 to 90 days
- security logs: 180 to 365 days
- audit logs tied to legal or financial events: 1 to 3 years minimum, longer if accounting or dispute handling requires
- consent evidence: for the lifetime of the account relationship and a defensible period after withdrawal or termination
- Sentry traces and runtime diagnostics: according to operational needs, but never as the sole compliance record

Retention must be implemented separately from product code through database lifecycle jobs, storage lifecycle rules, or log platform retention settings.

## 11. Access Control and Review

### 11.1 Who Can View Logs

- customers: only their own customer-facing history where explicitly exposed
- staff: only logs relevant to assigned work and only if necessary
- admins: role-scoped operational access
- compliance or senior operations: expanded audit access where authorized

### 11.2 Admin UI Requirements

The current audit page should be expanded to support:

- filtering by date range
- filtering by actor role
- filtering by event category
- filtering by entity id
- filtering by result
- search by request id
- visibility of consent events and sensitive data access events
- export with access control and export audit trail

## 12. Implementation Plan

### Phase 1: Policy and Evidence Foundation

1. publish versioned privacy policy and terms
2. add consent checkbox capture in registration flow
3. add `user_consents` table
4. record consent evidence on registration and LINE link flows

### Phase 2: Logging Safety

1. add redaction utility for `lib/logger.ts`
2. add request correlation id middleware or route helper
3. standardize audit insert helper

### Phase 3: Coverage Expansion

1. instrument order, payment, workshop, and document flows
2. instrument admin settings and sensitive record access
3. add security events for auth failures and permission denials

### Phase 4: Governance and Operations

1. implement retention jobs
2. expand admin audit UI
3. define DSAR and consent withdrawal operational runbook

## 13. Definition of Done

This initiative is complete when:

1. consent is versioned and queryable
2. registration cannot complete without legal acceptance
3. marketing consent is optional and independent
4. every critical workflow emits structured audit events
5. logs are redacted before persistence or transport
6. admin can trace a material event end-to-end with a request id
7. retention and access control are documented and implemented