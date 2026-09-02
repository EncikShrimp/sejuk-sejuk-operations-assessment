# Sejuk Sejuk Operations Assessment Build Specification

## Product goal
Build a credible internal operations web application for a fictional Malaysian air-conditioner service company. The complete demo workflow is:

`New → Assigned → In Progress → Job Done → Reviewed → Closed`

This is a focused assessment implementation, not a production claim. It must work locally with Supabase and contain realistic seeded demo records.

## Technology boundaries

- Next.js App Router, TypeScript, Tailwind CSS.
- Supabase local stack first: Postgres, private Storage bucket, migration-led schema, seed data.
- Mock role selector only: Admin, Technician, Manager. Do not imply real authentication.
- DeepSeek is the manager AI provider, called exclusively from a server-side route with `DEEPSEEK_API_KEY`. No Codex/OpenAI runtime dependency belongs in the app.
- WhatsApp is a `wa.me` deep-link that pre-fills a message. It prepares a message; it does not claim automatic delivery.
- No deploy, cloud migration, or production credential configuration in this phase.

## Data and integrity requirements

Tables should cover branches, technicians, orders, service completions, attachments, payment records, manager reviews, reschedule events, and immutable audit events.

- Use a PostgreSQL enum or checked domain for workflow states: `new`, `assigned`, `in_progress`, `job_done`, `reviewed`, `closed`.
- Store money as integer cents: quoted, extra charges, final amount, payment amount.
- Generate a unique order number on the server/database. A format such as `SSS-YYYY-00001` is acceptable.
- Final amount is always calculated on the server from quoted amount + extra charges.
- The job evidence bucket is private. Upload maximum is six files per completion. Permit images, video, PDF and validate count/type/size in server code.
- Server routes own writes. Browser code must never receive a Supabase service-role key.
- Enable RLS, remove direct anonymous table access, and use a server-only Supabase client for the mock-auth assessment flow.
- Audit creation, assignment, start, completion, payment recording, review and closure.

## Required workflows

### Admin desktop portal
- Create a service order with customer name, phone, address, issue, service type, quote, assigned technician and admin notes.
- Provide auto-generated order number and a post-submission summary.
- Only Admin mode exposes create/assign controls.

### Technician mobile portal
- Designed mobile-first, not a compressed dashboard.
- Assigned job list, job detail, start work and completion flow.
- Clear customer/address/service details, large touch targets, sticky completion action.
- Complete service with work-done notes, extra charges, remarks and evidence (≤ 6).
- Optional payment received section: amount, method and receipt evidence.
- Completion must generate a completion timestamp and `Job Done` status.

### Completion notification
On `Job Done`, display a customer WhatsApp deep link with a message derived from the order number, customer name, assigned technician and completion time. Record notification generation in the audit timeline.

### Manager portal
- Review queue for completed jobs.
- Manager can review then close reviewed work.
- Weekly KPI dashboard: completed jobs, total completed value, postpone/reschedule count, technician leaderboard.

## Controlled AI operations assistant

The manager-only Query Window supports the assessment examples:

1. Completed jobs for a named technician in a supported period.
2. Top technician in a period.
3. Completed-job count for today.
4. Completed-job count plus total final amount for today, this week, last week, or all time.

The DeepSeek model receives only question text and named tools. It can select at most one read-only tool:

- `get_completed_jobs({ technician, period })`
- `get_top_technician({ period })`
- `count_completed_jobs({ date })`
- `get_completion_summary({ period })`

Zod validates tool arguments before a bounded Supabase query runs. The model never receives database credentials, arbitrary SQL, attachments, full customer records, phone numbers, or addresses. It sees only the small structured result needed to format its answer. If no DeepSeek key exists, return an explicit configured-unavailable response. Unsupported questions receive a safe guidance response.

## UI direction

A practical operations console, not generic SaaS:

- Warm off-white workspace, ink/charcoal text, deep maintenance teal as primary, amber only for warning/action signals.
- Dense but readable desktop admin/manager shell.
- Intentional status chips, audit timeline, information hierarchy and tables/cards based on the task.
- Mobile technician screens use `100dvh`, readable input labels, large tap targets, bottom action bar and no hover-only interaction.
- Respect reduced motion and avoid unverified business performance claims.

## Tests and delivery gates

Start with unit tests for order-number, money, state transition, date-period and AI-tool argument behaviours. Add tests as each business rule is added.

Before completion run and report real output for:

```text
npm run lint
npm test
npm run typecheck
npm run build
npx supabase db reset
local browser walkthrough of Admin, Technician, Manager and AI unavailable/success branches
```

README must document setup, the modules built, data model, architecture choices, AI retrieval controls, supported questions, limitations, and local/cloud migration steps.