# Sejuk Sejuk Operations Assessment

Next.js assessment for a fictional Malaysian air-conditioner service operation. It demonstrates the workflow `New → Assigned → In Progress → Job Done → Reviewed → Closed`; it is not a production-auth claim.

## Live demo

[Open the live assessment demo](https://sejuk-sejuk-operations-assessment.vercel.app)

The hosted demo uses fictional seeded jobs. Login is an assessment-only role selector, not production authentication.

## Tech stack

- Next.js 16 + React + TypeScript
- Tailwind CSS v4
- Supabase (Postgres, private Storage, versioned migrations and fictional demo seed data)
- DeepSeek, server-side only, for the bounded Operations AI query window
- Vitest, ESLint and TypeScript checks

## Run locally

```powershell
npm install
npx supabase start
npx supabase db reset
Copy-Item .env.example .env.local
npm run dev
```

Use the local Supabase API URL and service-role key in `.env.local`. They are server-only values: do not prefix them with `NEXT_PUBLIC_` and do not put them in browser code. Without `.env.local`, the app deliberately renders its seeded demo snapshot and marks preview changes as reset-on-refresh. Write routes return a safe `503` response in that mode.

Run the delivery checks with:

```powershell
npm run lint
npm test
npm run typecheck
npm run build
npx supabase db reset
```

## Modules built

- Admin desk: create, quote, assign and inspect service orders with a post-submit handoff summary.
- Technician field view: narrow mobile-first job list/detail, large touch targets, sticky action bar, completion notes, charges, evidence selection, optional payment and WhatsApp preparation link.
- Manager workspace: completion review, closure, weekly completed-job/value/reschedule KPIs and technician leaderboard.
- Audit timeline: creation, assignment, start, completion, payment, notification generation, review, closure and reschedule records.
- Controlled manager AI: a DeepSeek-backed server route that exposes four validated, named read-only queries.

## Data model and security

`supabase/migrations/20260902123000_operations_schema.sql` creates branches, technicians, service orders, completions, job attachments, payment records, manager reviews, reschedules and immutable audit events. Order status is a PostgreSQL enum; quote, extra charges, final amount and payments are integer cents. The final amount is a stored generated expression of quote plus extras.

Order numbers come from a database sequence/trigger. RLS is enabled for every application table and anonymous/authenticated direct privileges are revoked. `job-evidence` is a private storage bucket; only the service role may access it. The application only creates the Supabase client in `src/lib/supabase/server.ts`, which is marked server-only. The browser never receives the service-role key.

The completion route enforces a maximum of six job-evidence files, allows images/video/PDF only, and rejects files over 20 MB. It writes the completion timestamp, server-calculated final amount, optional payment, audit events and a notification-generation audit event. The WhatsApp action is a `wa.me` deep link only; it prepares a message and never claims delivery.

## Manager AI controls

`POST /api/manager/ai` calls DeepSeek only when `DEEPSEEK_API_KEY` is configured. It sends the question and named tool definitions, accepts at most one tool call, validates tool arguments with Zod, and executes a bounded Supabase query. There is no arbitrary SQL path.

Supported questions are:

- Completed-job count **and** total final amount for `today`, `this week`, `last week`, or `all time`.
- Completed jobs for `Ali`, `John`, `Bala`, or `Yusoff` in `today`, `this week`, or `last week`.
- Top technician for one of those periods.
- Completed-job count for today.

Tool results contain only aggregated count/amount data or order number, service type, completion time and amount where needed—never phone numbers, addresses, attachments, credentials or full customer records. When a model formats a selected tool result, it must return an exact copy of the structured result; otherwise the route uses a deterministic formatter. Aggregate money questions take the same bounded, server-side path and use the deterministic formatter directly. Missing configuration and unsupported questions return explicit safe messages.

## Portal routes

- `/login` — select the Admin, Technician, or Manager assessment role.
- `/admin` — order creation and technician assignment; only available to the Admin mock session.
- `/technician` — assigned field-work and completion workflow; only available to the Technician mock session.
- `/manager` — review queue, KPI dashboard, and Operations AI; only available to the Manager mock session.
- `/` — redirects to the signed-in role’s portal, or to `/login` when no mock session exists.

## Assessment assumptions

- This is a local assessment implementation using a cookie-backed mock role session, not a production identity system.
- A technician must be selected during the normal Admin handoff, so new Admin-created jobs enter the assigned field workflow immediately. The `New` state remains in the model for unassigned/draft records and validation coverage.
- WhatsApp v1 is a human-sent `wa.me` deep link. It does not claim automated delivery.
- Money is stored as integer cents, reporting periods use `Asia/Kuala_Lumpur`, and local seed data is illustrative only.

## Assessment compliance

See [`docs/ASSESSMENT_COMPLIANCE.md`](docs/ASSESSMENT_COMPLIANCE.md) for a requirement-by-requirement, fact-checked assessment matrix. It distinguishes completed local functionality from optional work and production hardening rather than overstating the scope.

## Limitations and migration path

The assessment uses a real `/login` route with a cookie-backed mock role session. It survives browser refresh, server-side redirects unauthorised role URLs to the signed-in role's portal, and gates Admin/Technician/Manager write routes against the selected mock role; it is still not production authentication or authorization. Upload handling is intentionally route-based; a production implementation should add verified identities, person-to-technician bindings, per-user RLS policies, signed read URLs, antivirus/media processing, transactional outbox notifications, observability and real WhatsApp delivery controls.

For cloud migration, create a hosted Supabase project, apply the migration through the Supabase CLI, run the seed only in non-production, set server-only environment variables in the host, replace the mock selector with verified session/role claims, then tighten the storage/table policies to those real identities.
