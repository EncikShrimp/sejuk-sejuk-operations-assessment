# Sejuk Sejuk Operations Assessment

A fictional Malaysian air-conditioner service workflow built for the programmer assessment.

**[Open the live demo](https://sejuk-sejuk-operations-assessment.vercel.app)**

> The demo uses fictional seed data. Its role picker is assessment-only; it is not production authentication.

## What I built

A role-based service-operations workflow:

```text
Admin creates and assigns a job
→ assigned Technician starts and completes it
→ Manager reviews and closes it
```

- **Admin:** create, quote, assign, and inspect jobs.
- **Technician:** task-first mobile view; the current job is first and completion uses a full-height mobile task sheet.
- **Manager:** review and close completed work, view weekly KPIs, and inspect the technician leaderboard.
- **Support features:** audit timeline, up to six job-evidence files, calculated final amount, and a human-sent WhatsApp feedback link.

## Tech stack used

- Next.js 16, React, TypeScript, Tailwind CSS v4
- Supabase: PostgreSQL, private Storage, migrations, and fictional seed data
- DeepSeek: server-side only for bounded Operations AI queries
- Vitest, ESLint, and TypeScript for checks

## Architecture decisions

- Workflow is explicit: `New → Assigned → In Progress → Job Done → Reviewed → Closed`.
- The server enforces role boundaries; only the assigned Technician can start or complete their job.
- Quote, extra charges, payment, and final amount use integer cents. The database calculates the final amount.
- Job evidence is private and limited to six files per completion.
- Key actions create an immutable audit event.
- WhatsApp is a prepared `wa.me` link. The application does not claim delivery.

## Challenges / assumptions

- The brief accepts a solid partial implementation, so the priority was one clear end-to-end workflow rather than broad production scope.
- The public demo needs reviewers to switch roles, so it uses a visible mock role picker with server-side assessment role checks.
- Admin assignment is required in the normal handoff. There is no open technician claim queue.
- AI answers need to be useful without becoming unrestricted database chat.

## How AI was integrated

Manager AI exposes **six fixed, read-only capabilities** for supported completion, KPI, leaderboard, workload, and review-watchlist questions.

```text
Manager question
→ Manager-only API route
→ validated named tool
→ bounded server-side query
→ safe, minimal result
```

The model cannot access credentials, SQL, files, arbitrary database records, customer phone numbers/addresses, or write tools. The server owns authentication, role checks, validation, calculations, query scope, and output formatting.

Advanced AI additions:

- **Operational Insight:** current-week technician workload watchlist.
- **Workflow Supervisor:** flags material price variance or missing job evidence as **Needs Manager review**.
- **Document Understanding:** not included.

## What limitations exist in your implementation?

- Mock roles are for assessment demonstration, not production identity or authorization.
- WhatsApp prepares a message; it does not send one automatically.
- Document extraction is not implemented.
- A production version needs verified identities, user-to-technician mapping, identity-bound RLS, signed uploads, file scanning, rate limits, observability, and WhatsApp Business API delivery.

## Run locally

```powershell
npm install
npx supabase start
npx supabase db reset
Copy-Item .env.example .env.local
npm run dev
```

Keep the Supabase service-role key server-side. Do not add `NEXT_PUBLIC_` to it.

```powershell
npm run lint
npm test
npm run typecheck
npm run build
```

## Detailed review documents

- [System overview](docs/SYSTEM_OVERVIEW.md) — architecture, workflow, data choices, and exact AI controls.
- [Assessment compliance](docs/ASSESSMENT_COMPLIANCE.md) — requirement-by-requirement implementation status.
