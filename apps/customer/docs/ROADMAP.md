# Xylem Landscape – Product Roadmap

This roadmap outlines pragmatic, high‑impact features to elevate the customer, staff, and admin experience. Items are grouped by phase and include suggested data structures and acceptance criteria highlights.

## Phase 0 – Hardening and Ops

- CI/CD + Quality Gates
  - Enable CI build with lint/typecheck/test. Gradually tighten ESLint warnings back to errors.
  - Add Playwright smoke tests for critical flows (login → select service → checkout stub).
- Observability & Stability
  - Error monitoring (Sentry) and basic server metrics.
  - Logging strategy for API routes (privacy‑safe).
- Data Safety
  - Nightly database backups (Supabase) and restore drill doc.
  - RLS policy audit for all tables; add unit tests for RLS invariants.

## Phase 1 – Customer Experience

- Booking & Availability
  - Customer can pick date/time slots based on staff availability and branch capacity.
  - Data: `schedules(id, staff_id, branch_id, date, start_time, end_time, is_available)` and `bookings(id, order_id, schedule_id, status)`.
- Checkout & Payments
  - Integrate Stripe Checkout or Payment Links for card payments.
  - Data: `payments(id, order_id, provider, provider_charge_id, amount, currency, status, created_at)`.
  - Acceptance: Successful payment updates order status; failed/abandoned triggers reminders.
- Order Tracking
  - Customer sees ETA, status changes, and technician en‑route.
  - Add web push or email notifications on status transitions (assigned → in_progress → completed).
- Promotions & Coupons
  - Data: `coupons(id, code, type, value, valid_from, valid_to, usage_limit, used_count, active)` and `order_coupons(order_id, coupon_id, discount_amount)`.
- Reviews & Ratings
  - Post‑service review with rating and comments.
  - Data: `reviews(id, order_id, customer_id, rating, comment, created_at)`.

## Phase 2 – Staff Productivity (Mobile‑first)

- PWA App Shell for Staff
  - Installable, offline‑friendly staff UI: today’s jobs, map, checklists, photo upload.
  - Minimal: manifest + caching strategy (later service worker for offline forms).
- Job Execution Toolkit
  - Task checklists per service, time tracking (start/pause/complete), photo evidence.
  - Data: `job_checklists(id, job_id, item, required, completed_at, completed_by)` and `job_photos(id, job_id, url, caption)`.
- Route & Capacity Optimization (later)
  - Suggest route order and estimate travel time (Google Maps Distance Matrix API).

## Phase 3 – Admin & Pricing Intelligence

- Service & Pricing CMS
  - Manage service cards, upsells, and pricing templates in one place.
  - Versioned price templates; preview diffs and schedule rollouts.
- Branch & Capacity Planning
  - Staffing levels, skill tags, and capacity dashboards per day/week.
- Analytics Dashboard
  - KPIs: Orders, revenue, AOV, conversion, fulfillment time, NPS.
  - Export CSV for accounting.

## Notifications Platform

- Unified Notifications
  - Tables: `notifications(id, user_id, type, title, body, data, read_at, created_at)`.
  - Delivery channels: in‑app, email; later: web push.
  - API: create + list + mark‑as‑read. Hook into job/order status changes.

## Messaging (Optional but Valuable)

- In‑App Messaging
  - Threads between customer and staff/admin with attachment support.
  - Tables: `message_threads(id, subject, order_id)` and `messages(id, thread_id, sender_id, body, attachment_url, created_at)`.

## Internationalization & Accessibility

- i18n
  - Expand LanguageSwitcher with resource files and dynamic locale routing.
- A11y
  - Keyboard navigation, focus states, aria labels on interactive UI.

## Security & Compliance

- Secrets management and environment docs.
- PII handling policy; consent and privacy pages.
- Admin actions audit trail (already started) with immutable append‑only logs.

---

## Top 5 Quick Wins (low risk, high impact)

1) Mark jobs API as dynamic (done) to keep builds green and support live data.
2) Add payments schema + Stripe test mode using Payment Links (no card data on our servers).
3) Basic booking slots: read‑only staff availability + slot picker on checkout.
4) In‑app notifications table + bell UI wiring for job/order status updates.
5) Playwright smoke test: login → select package → reach payment page.

## Minimal Contracts (for near‑term features)

- Payment event
  - Input: order_id, amount, currency
  - Output: payment row with status=paid/failed, update order status
  - Errors: invalid order, currency mismatch, provider error
- Booking slot
  - Input: date range, branch_id
  - Output: list of available 30/60‑min slots
  - Errors: closed hours, capacity exceeded, conflicting bookings
- Notification create
  - Input: user_id, type, title/body, data
  - Output: persisted notification; optional email dispatch
  - Errors: missing user, invalid payload

## Suggested Next Steps

- Decide Phase 1 scope: Payments + Booking + Notifications.
- I can scaffold the tables, a minimal admin screen for coupons, and wire a Stripe test checkout end‑to‑end behind a feature flag.