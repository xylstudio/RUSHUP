# XYL STUDIO Workshops: Public Booking + Checkout Setup

This guide enables the public no-login workshop booking flow with immediate (simulated) payment in dev or staging.

## Prerequisites
- Supabase project (Postgres + RLS)
- Environment variables in `.env.local` for the app:
  - `NEXT_PUBLIC_SUPABASE_URL=...`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

Optional (server-side privileged ops not required for this demo):
- `SUPABASE_SERVICE_ROLE_KEY=...` if you later add admin pages or webhooks.

## 1) Apply SQL schema in Supabase
Open Supabase Dashboard → SQL Editor and run the contents of:
- `create-workshop-bookings.sql`

This creates:
- `public.workshop_bookings` (anon insert allowed; RLS enabled)
  - Columns include: full_name, email, phone, topic (Tray Garden/Terrarium Garden), attendees_count (1–10), date, start_time, end_time, notes, status
- `public.workshop_payments` (anon insert allowed; RLS enabled)

Indexes and RLS policies are included. No public read/update/delete is enabled.

## 2) Run the app
- Start dev server (already configured):
  - VS Code task: "XYL STUDIO: Start Development Server" or `npm run dev`
- App served at http://localhost:3000

## 3) Quick smoke tests
- Slots API:
  - GET `http://localhost:3000/api/workshops/slots?date=YYYY-MM-DD`
  - Should return hourly grid by default (09:00–17:00)
- Checkout API (booking + test payment):
  - POST `http://localhost:3000/api/workshops/checkout`
  - JSON body example:
```
{
  "full_name": "Test User",
  "email": "test@example.com",
  "phone": "0812345678",
  "topic": "Tray Garden",
  "attendees_count": 2,
  "date": "2025-01-15",
  "start_time": "10:00",
  "end_time": "11:00",
  "notes": "CLI smoke test"
}
```
  - Should return `{ success: true, booking, payment, amount, perPerson, attendees_count, currency }` with `status: confirmed` booking and `paid` payment. `amount = perPerson * attendees_count`.

If you see `Could not find the table 'public.workshop_bookings'`, the SQL schema hasn’t been applied yet.

## 4) Public page
- Visit `/workshops/book` to book and pay in one step (simulated payment). No login required.

## Next steps (optional)
- Replace simulated payment with Stripe Checkout (test mode)
- Hook slots API to real schedules/capacity
- Admin/staff pages + RLS to review/manage bookings and payments
- Email confirmations and rate-limiting/CAPTCHA for public form
