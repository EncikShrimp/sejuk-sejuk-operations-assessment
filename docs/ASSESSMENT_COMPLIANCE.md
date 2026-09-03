# Assessment Compliance Matrix

This is a fact-checked record of the implementation against **Programmer Assessment – Operations System + AI Challenge**. It distinguishes assessment-complete behaviour from deliberate production limitations.

## Status key

- **Complete** — implemented in source and backed by test/runtime evidence.
- **Partial** — intentionally limited or only part of an optional capability.
- **Not included** — deliberately outside this assessment release.

## Delivery scope

| Assessment expectation | Status | Evidence / truth |
| --- | --- | --- |
| React frontend | **Complete** | Next.js 16 / React application under `src/app` and `src/components`. |
| Tailwind styling | **Complete** | Tailwind v4 portal UI. |
| Supabase database and storage | **Complete** | Hosted Supabase project, versioned migrations, fictional seed, RLS and private `job-evidence` storage. |
| Simple mock login / role switch | **Complete** | Cookie-backed mock login at `/login`; server redirects wrong portal URLs and write endpoints check the selected role. |
| Live public deployment | **Complete** | https://sejuk-sejuk-operations-assessment.vercel.app |
| GitHub repository | **Complete** | https://github.com/EncikShrimp/sejuk-sejuk-operations-assessment |

## Workflow and rules

| Requirement | Status | Evidence / truth |
| --- | --- | --- |
| `New → Assigned → In Progress → Job Done → Reviewed → Closed` | **Complete** | Domain transition checks and PostgreSQL workflow trigger reject skipped/reversed changes. |
| Admin creates and assigns work | **Complete (assessment mock)** | Admin route/API requires Admin mock role; standard handoff requires a technician and writes creation/assignment audit events. |
| Only assigned technician starts/completes | **Complete (assessment mock)** | Technician route/API role checks plus server-side comparison with `assigned_technician_id`. |
| Manager review and closure | **Complete (assessment mock)** | Manager-only transition route creates review record and permits only valid review/close steps. |
| Key actions traceable | **Complete** | Immutable audit events cover creation, assignment, start, completion, payment, notification generation, review, closure and reschedule. |
| Production-grade identity enforcement | **Partial — intentionally not claimed** | The assessment cookie is role-gated but forgeable. Production requires verified Auth claims and person-to-technician binding. |

## Module 1 — Admin Portal

| Requirement | Status | Evidence / truth |
| --- | --- | --- |
| Auto-generated order number | **Complete** | Database sequence/trigger creates `SSS-YYYY-#####`. |
| Customer name, phone, address, issue | **Complete** | Required Admin fields are validated client/server-side. |
| Service type, quoted price, assigned technician, Admin notes | **Complete** | Standard handoff requires an assigned technician. |
| Responsive, clean Admin form | **Complete** | Desktop-first form with responsive layout and prior mobile overflow checks. |
| Write to database | **Complete** | `POST /api/orders` uses server-only Supabase client. |
| Assignment visibility | **Complete** | Newly created work appears in the sorted order register and creates audit events. |
| WhatsApp technician notification | **Not included** | Implemented WhatsApp v1 is customer feedback after completion, not assignment notification. |

## Module 2 — Technician Portal

| Requirement | Status | Evidence / truth |
| --- | --- | --- |
| Mobile-first assigned-job workspace | **Complete** | Narrow field layout, sticky action, large touch targets and mock field-user selector for Ali, John, Bala and Yusoff. |
| Read-only order information | **Complete** | Order number, customer context, address, service type, issue, quote and assignment are shown before completion. |
| Work done, extra charges, remarks | **Complete** | Work-done text is required; extra charges/remarks are persisted. |
| Final amount auto-calculated | **Complete** | Quote + extra charges is handled in integer cents in UI/server/database. |
| Up to six photos / video / PDF | **Complete** | Client and server enforce the six-file limit, allowed MIME family and 20 MB file cap. |
| Upload storage | **Complete** | Evidence writes to private Supabase Storage with attachment metadata. |
| Technician name and timestamp | **Complete** | Assigned technician and server completion timestamp are recorded. |
| Payment amount and method | **Complete (optional bonus)** | Optional payment is persisted and audited. |
| Receipt photo | **Partial (optional bonus)** | Backend accepts one receipt file; the mobile UI prioritises generic job evidence rather than a distinct receipt selector. |

## Module 3 — WhatsApp completion message

| Requirement | Status | Evidence / truth |
| --- | --- | --- |
| Trigger on `Job Done` | **Complete for v1 deep-link workflow** | Completion records notification generation and exposes prepared feedback action in Manager review. |
| Pre-filled customer message | **Complete** | `wa.me` message uses customer name, order number, technician and completion time. |
| Honest delivery behaviour | **Complete** | UI states that a human must press Send; no automatic-delivery claim. |

## KPI Dashboard (bonus)

| Requirement | Status | Evidence / truth |
| --- | --- | --- |
| Weekly jobs completed / total amount / reschedules | **Complete** | Manager KPI cards derive weekly counts, final value and reschedule count using `Asia/Kuala_Lumpur` reporting periods. |
| Technician leaderboard | **Complete** | Manager dashboard shows completed-job and revenue comparison. |

## Operations AI module

| Requirement | Status | Evidence / truth |
| --- | --- | --- |
| Manager-only feature | **Complete for mock session** | Manager UI and `POST /api/manager/ai` independently require Manager mock role. |
| Controlled data retrieval | **Complete** | Six named, strict Zod-validated, read-only capabilities; no arbitrary SQL path. |
| Assessment example questions | **Complete** | Completed jobs for named technician, top technician, today count and completed-job money summary are supported. |
| Clear structured response | **Complete** | Model formatting is accepted only with an exact structured-data echo; deterministic fallback is used otherwise. |
| No customer phone/address/files in AI results | **Complete** | Tool results are aggregate metrics or narrow order/service result fields; no customer identifiers, storage paths or attachments. |
| General free chat | **Not included by design** | The brief asks for an Operations Query Window, not a database-connected general chatbot. |

## Optional advanced AI challenges

| Challenge | Status | Evidence / truth |
| --- | --- | --- |
| AI Workflow Supervisor | **Complete** | Manager Review cards and `get_workflow_review_watchlist({})` flag documented price/evidence facts without status changes, accusations or outbound action. |
| AI Operational Insight / overload detection | **Complete** | `get_technician_workload({ period: "this_week" })` derives active-team workload average/threshold and returns a Manager-review watchlist. |
| AI Document Understanding | **Not included** | Deliberately deferred: it needs secure document ingestion, extraction quality controls, PII policy and human confirmation before order creation. |

## Current limitations

- Public demo roles are assessment-only mock sessions, not real Auth.
- WhatsApp v1 prepares rather than sends a message.
- Evidence storage is private and bounded, but a production implementation should add signed user access, signature/content inspection, malware scanning and retention handling.
- Production AI should add rate limits, PII controls, monitoring and least-privilege application database roles/RPCs.

## Verification commands

```text
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
npx supabase db reset
```

See [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) for the architecture, feature inventory and detailed AI integration boundary.
