# Manual Acceptance Test Plan

Run this after local Supabase has been reset with seed data and the application is running.

## Role and navigation

- [ ] The role switch visibly states that it is a mock assessment role selector.
- [ ] Admin, Technician and Manager workspaces show their task-relevant navigation and hide inappropriate primary actions.
- [ ] The interface remains usable at 320px and 390px widths without horizontal scrolling.
- [ ] Mobile customer inputs expose `name`, `tel`, and `street-address` autofill hints.

## Admin: order creation and assignment

- [ ] Admin can open the order workflow and see required customer, service, quote and technician fields.
- [ ] Admin must explicitly choose an assigned technician before a normal order handoff can be submitted.
- [ ] A submitted valid order receives a unique generated `SSS-YYYY-#####` number.
- [ ] Admin receives a post-submission summary containing the assigned technician and initial state.
- [ ] Assignment action is represented in the audit timeline.
- [ ] Technician and Manager modes cannot expose the admin assignment control.

## Technician: mobile completion

- [ ] Technician sees only their assigned work in the primary technician view.
- [ ] Address, service type and issue are readable without expanding a desktop-style data table.
- [ ] Start Work changes only an eligible assigned order to In Progress.
- [ ] Completion requires work-done text and calculates final amount from quote plus extra charges.
- [ ] Attempting to select more than six evidence files is blocked with an inline, text-based message associated with the file input.
- [ ] Optional payment data records amount and method without being required for completion.
- [ ] Completion produces Job Done, timestamp, audit event and WhatsApp message action.

## WhatsApp completion action

- [ ] Link uses `https://wa.me/` with customer number normalized to E.164 digits.
- [ ] The encoded message includes customer name, order number, technician name and completion time.
- [ ] UI says the action opens a prepared message for a person to send; it does not claim delivery.

## Manager: review and KPI

- [ ] Job Done work appears in the review queue.
- [ ] Manager review transitions only Job Done to Reviewed.
- [ ] A Manager can close only a Reviewed job; an Admin or Technician cookie receives `403` from manager-only workflow mutations.
- [ ] Close action is available only after review.
- [ ] KPI cards show weekly completed job count, final value and reschedules.
- [ ] Leaderboard values reconcile with seeded completions.
- [ ] Workflow Supervisor labels a reviewable job only when its final amount crosses both documented material-variance thresholds or it has zero `job_evidence` attachments.
- [ ] Workflow Supervisor labels are review signals only: they do not alter job status, contact a customer or accuse a technician.

## Operations AI

- [ ] Technician and Admin roles cannot submit Operations AI questions.
- [ ] Deterministic KPI, workload and Workflow Supervisor questions work from configured Supabase data without a model request.
- [ ] With a key configured, test model-selected question patterns:
  - What jobs did technician Ali complete last week?
  - Which technician completed the most jobs this week?
- [ ] Test deterministic advanced question patterns:
  - Which technician might be overloaded this week?
  - Which completed jobs need Manager review?
- [ ] Unsupported questions receive a limited-capability guidance answer.
- [ ] Network inspection confirms no DeepSeek key, Supabase service key, phone number or address is returned to the browser from AI responses.

## Accessibility and resilience

- [ ] Keyboard focus remains visible for all controls.
- [ ] Form errors are text-based, associated with their inputs and do not rely on colour alone.
- [ ] Reduced-motion preference removes non-essential animation.
- [ ] No console errors occur during the core walkthrough.
- [ ] Supabase-unavailable persistence requests return a safe unavailable message.
