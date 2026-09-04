# Sejuk Sejuk Operations Assessment

A fictional Malaysian air-conditioner service workflow built for the programmer assessment.

**[Open the live demo](https://sejuk-sejuk-operations-assessment.vercel.app)**

> The demo uses fictional seed data. Its role picker is assessment-only; it is not production authentication.

## Core workflow

```text
Admin creates and assigns a job
→ assigned Technician starts and completes it
→ Manager reviews and closes it
```

The application enforces:

- `New → Assigned → In Progress → Job Done → Reviewed → Closed`
- Admin-only creation and assignment
- assigned-Technician-only start and completion
- Manager-only review and closure
- quote + extra charges = final amount, stored in integer cents

## What is included

- **Admin:** create a job, quote it, assign a technician, and see the handoff.
- **Technician:** a task-first mobile view. The current job comes first; completion uses a full-height mobile task sheet.
- **Manager:** review and close completed jobs, view weekly KPIs, and inspect the technician leaderboard.
- **WhatsApp v1:** a prepared customer-feedback `wa.me` link. A person still presses Send.
- **Audit trail:** records the key lifecycle actions.

## Controlled Operations AI

Manager AI supports six fixed, read-only operational questions: completed-job lookups, counts, totals, top technician, workload, and a review watchlist.

The model never receives database credentials or direct access. It cannot run SQL, browse records freely, access files, see customer phone numbers/addresses, or write data. The server owns role checks, validation, query scope, calculations, and safe result formatting.

### Advanced AI extensions

Implemented:

- **Operational Insight** — highlights a technician workload watchlist for the current week.
- **Workflow Supervisor** — flags completed work with a material price variance or missing job evidence as **Needs Manager review**.

Not included:

- **Document Understanding** — document extraction needs secure ingestion, PII handling, extraction checks, and human confirmation beyond this assessment scope.

## Run locally

```powershell
npm install
npx supabase start
npx supabase db reset
Copy-Item .env.example .env.local
npm run dev
```

Set the local Supabase values in `.env.local`. Keep the service-role key server-side; never add `NEXT_PUBLIC_` to it.

```powershell
npm run lint
npm test
npm run typecheck
npm run build
```

## Scope and limits

- Mock roles are for assessment demonstration, not real identity enforcement.
- WhatsApp prepares a message; it does not send one automatically.
- The public demo is mutable fictional data, not a production operations system.

## Detailed review documents

- [System overview](docs/SYSTEM_OVERVIEW.md) — architecture, workflow, data choices, and exact AI controls.
- [Assessment compliance](docs/ASSESSMENT_COMPLIANCE.md) — requirement-by-requirement implementation status.
