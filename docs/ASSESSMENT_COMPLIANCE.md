# Assessment Compliance Matrix

This is a fact-checked record of the local implementation against **Programmer Assessment – Operations System + AI Challenge**. It distinguishes completed assessment scope from production hardening and optional work.

## Status key

- **Complete** — implemented in the local application and covered by source/runtime evidence.
- **Partial** — implemented with a stated limitation or only part of an optional item.
- **Not included** — deliberately outside the submitted assessment scope.

## Delivery scope

| Assessment expectation | Status | Evidence / truth |
| --- | --- | --- |
| React frontend | **Complete** | Next.js 16 / React application under `src/app` and `src/components`. |
| Tailwind styling | **Complete** | Tailwind v4 is used throughout the portal UI. |
| Supabase database and storage | **Complete** | Versioned schema, seed, RLS, private `job-evidence` bucket, and server-side data access in `supabase/` and `src/lib/supabase/`. |
| Simple mock login / role switch | **Complete** | Cookie-backed mock login at `/login`, with Admin, Technician and Manager routes. It persists across refresh and redirects unauthorised portal URLs. |
| Live public deployment | **Not included** | The app has been verified locally. No Vercel/Netlify deployment has been requested or performed. |
| GitHub repository / ZIP | **Not included** | No repository push or ZIP submission artifact has been created. |

## Workflow and rules

| Requirement | Status | Evidence / truth |
| --- | --- | --- |
| `New → Assigned → In Progress → Job Done → Reviewed → Closed` | **Complete** | `src/lib/domain/workflow.ts` permits only the sequential transitions; unit tests reject skipped/reversed transitions. The database migration also validates state changes. |
| Admin creates and assigns work | **Complete (assessment mock)** | The Admin portal requires an assigned technician before submitting, and `POST /api/orders` requires the Admin mock cookie. Creation writes `created` and `assigned` audit events. |
| Only assigned technician starts/completes | **Complete (assessment mock)** | Technician-only write routes require the Technician mock cookie; `src/lib/api/operations.ts` also compares the submitted technician ID to `assigned_technician_id`. |
| Manager review and closure | **Complete (assessment mock)** | Manager-only transition routes permit `Job Done → Reviewed` and `Reviewed → Closed`; a `manager_reviews` record is created on review. |
| Key actions traceable | **Complete** | Immutable `audit_events` records cover creation, assignment, start, completion, payment, notification generation, review, close, and reschedule. |
| Production-grade identity enforcement | **Partial — intentionally not claimed** | The selectable mock cookie now gates routes and write endpoints, but it remains forgeable and is not a real person-to-technician identity binding. Production must use verified Supabase Auth claims and transactional audit writes. |

## Module 1 — Admin Portal

| Requirement | Status | Evidence / truth |
| --- | --- | --- |
| Auto-generated order number | **Complete** | Database sequence/trigger creates `SSS-YYYY-#####` order numbers. |
| Customer name, phone, address, issue | **Complete** | Required Admin form fields, validated on client and server. |
| Service type, quoted price, assigned technician, Admin notes | **Complete** | Native select/amount/text inputs; technician is now required for the normal Admin handoff. |
| Responsive, clean Admin form | **Complete** | Desktop-oriented at large widths and single-column at mobile widths. Runtime checks at 320px and 360px found no horizontal overflow. |
| Write to database | **Complete** | `POST /api/orders` calls the server-only Supabase client. |
| Post-submit handoff summary | **Partial / bonus** | The new order appears in the refreshed register. There is not yet a dedicated persisted confirmation summary panel. |
| WhatsApp notification to technician | **Not included** | The implemented WhatsApp link is the completion-feedback message to the customer, not an assignment notification. |

## Module 2 — Technician Portal

| Requirement | Status | Evidence / truth |
| --- | --- | --- |
| Mobile-first assigned-job workspace | **Complete** | Technician portal shows only demo technician Ali’s assigned active jobs, with a mobile card layout and 48px primary actions. |
| Read-only order information | **Complete** | Order number, customer context, address, service type, issue, quote and assigned technician are displayed before completion. |
| Work done, extra charges, remarks | **Complete** | Completion sheet records all fields; work-done text is required. |
| Final amount auto-calculated | **Complete** | Final = quote + extra charges using integer cents in both UI and server/database. |
| Up to 6 photos / video / PDF | **Complete** | Client gives a visible, associated error and disables submission above six; server independently enforces six files, media types and a 20MB limit. |
| Upload storage | **Complete** | Accepted evidence is uploaded to private Supabase Storage and recorded as attachments. |
| Technician name and timestamp | **Complete** | The server captures the assigned technician and completion timestamp. |
| Payment amount and method | **Complete (optional bonus)** | Optional payment amount and method are recorded and audited. |
| Receipt photo | **Partial (optional bonus)** | The backend accepts one `receipt` file, but the current mobile form does not expose a distinct receipt-photo control. Generic job evidence can still be uploaded. |

## Module 3 — WhatsApp completion message

| Requirement | Status | Evidence / truth |
| --- | --- | --- |
| Trigger on `Job Done` | **Complete for v1 deep-link workflow** | Completion writes a `notification_generated` audit event. The Manager completion card exposes the generated feedback-message link. |
| Pre-filled customer message | **Complete** | `buildWhatsAppUrl` creates a `wa.me` message containing customer name, order number, technician and completion time. |
| Honest delivery behavior | **Complete** | UI explicitly says it opens a prepared message and a human must press Send in WhatsApp. No automated-delivery claim is made. |

## KPI Dashboard (bonus)

| Requirement | Status | Evidence / truth |
| --- | --- | --- |
| Weekly jobs completed | **Complete** | Manager KPI dashboard calculates completed-job counts. |
| Total amount | **Complete** | Manager KPI dashboard aggregates final integer-cent amounts and formats Ringgit. |
| Postpone / reschedule | **Complete** | Weekly reschedule count is displayed from the operational snapshot. |
| Technician leaderboard | **Complete** | Manager dashboard shows technician counts and revenue. |

## Operations AI module

| Requirement | Status | Evidence / truth |
| --- | --- | --- |
| Manager-only portal feature | **Complete for mock session** | Only Manager navigation exposes Operations AI; the endpoint independently requires the Manager mock cookie. |
| Controlled data retrieval | **Complete** | `src/lib/operations-ai/tool-contracts.ts` defines and Zod-validates four named read-only tools. The model has no arbitrary SQL or database connection. |
| Supported Ali/leaderboard/count questions | **Complete** | Bounded completed-jobs, top-technician and today-count tools are implemented. |
| Amount / revenue summaries | **Complete** | `get_completion_summary` returns only count and total final amount for today, week, last week or all time. |
| Clear, structured response | **Complete** | Server formats safe, verified tool output and falls back deterministically if model formatting does not match. |
| No customer phone/address/files in AI results | **Complete** | Tool responses return aggregate data or restricted completion details only. |
| General free chat | **Not included by design** | This is an Operations Query Window, as specified by the assessment—not a general-purpose database-connected chatbot. |

## Optional advanced AI challenges

| Challenge | Status |
| --- | --- |
| AI Workflow Supervisor | **Not included** |
| AI Document Understanding | **Not included** |
| AI Operational Insight / overload detection | **Not included** |

## Mobile-form quality checks added

The most recent local mobile checks verified:

- no horizontal overflow at **320px** and **360px** widths;
- customer name, phone and address use native mobile autofill hints;
- long notes have client-side length limits aligned with server limits;
- invalid price input produces an inline, `aria-describedby`-associated error without calling the create-order API;
- selecting seven files shows an associated visible error and blocks completion before any API call;
- the mobile Manager navigation labels the AI section **Ops AI**;
- the completion CTA is a **48px sticky mobile action**, while the header remains sticky too;
- keyboard-visible focus and `prefers-reduced-motion` fallbacks are defined globally;

## Latest verified quality gate

The following passed after the latest mobile-form, closure-flow and mock-write-route changes:

```text
npm run lint       PASS
npm run typecheck  PASS
npm test           PASS — 26 tests across 9 files
npm run build      PASS
git diff --check   PASS
```

Focused browser checks also confirmed no mobile horizontal overflow, a 48px sticky completion CTA, the six-file error state, and zero application console errors.

## Local verification commands

```text
npm run lint
npm run typecheck
npm test
npm run build
npx supabase db reset
```

The completed local quality gate should be run again after any further change. This document intentionally does not claim a hosted deployment, real authentication, automatic WhatsApp delivery, or optional advanced AI features that are not present.
