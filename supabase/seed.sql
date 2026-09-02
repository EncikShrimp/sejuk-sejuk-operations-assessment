insert into public.branches (id, name, city) values
  ('10000000-0000-4000-8000-000000000001', 'Sejuk Sejuk PJ', 'Petaling Jaya'),
  ('10000000-0000-4000-8000-000000000002', 'Sejuk Sejuk Penang', 'George Town'),
  ('10000000-0000-4000-8000-000000000003', 'Sejuk Sejuk Johor', 'Johor Bahru'),
  ('10000000-0000-4000-8000-000000000004', 'Sejuk Sejuk Perak', 'Ipoh'),
  ('10000000-0000-4000-8000-000000000005', 'Sejuk Sejuk East Coast', 'Kuantan');

insert into public.technicians (id, branch_id, name, employee_code) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Ali', 'SS-T001'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'John', 'SS-T002'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Bala', 'SS-T003'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'Yusoff', 'SS-T004');

insert into public.service_orders (id, order_number, branch_id, assigned_technician_id, status, customer_name, customer_phone, address, issue, service_type, quoted_amount_cents, extra_charges_cents, admin_notes, scheduled_at, completed_at) values
  ('30000000-0000-4000-8000-000000000001', 'SSS-2026-00041', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'in_progress', 'Puan Siti Rahmah', '012-555 0188', '21, Jalan SS 2/72, Petaling Jaya', 'Indoor unit dripping after 30 minutes.', 'Chemical wash', 18000, 0, 'Parking at rear visitor bays.', current_timestamp, null),
  ('30000000-0000-4000-8000-000000000002', 'SSS-2026-00040', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'assigned', 'Mr Lim Wei Jian', '017-310 2284', '8, Jalan 19/1, George Town', 'Unit is not cooling consistently.', 'Diagnostic and repair', 12000, 0, 'Customer works from home; call on arrival.', current_timestamp + interval '2 hours', null),
  ('30000000-0000-4000-8000-000000000003', 'SSS-2026-00039', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'job_done', 'Nurul Huda', '019-604 1102', '16, Jalan Kristal 7/70, Johor Bahru', 'Service two bedroom units before tenant move-in.', 'General servicing', 28000, 3500, 'Condo management access arranged.', current_timestamp - interval '1 day', current_timestamp - interval '3 hours'),
  ('30000000-0000-4000-8000-000000000004', 'SSS-2026-00038', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'reviewed', 'Daniel Tan', '016-873 4201', '3, Jalan 16/4, Petaling Jaya', 'Outdoor condenser is noisy.', 'Diagnostic and repair', 22000, 6800, null, current_timestamp - interval '3 days', current_timestamp - interval '2 days'),
  ('30000000-0000-4000-8000-000000000005', 'SSS-2026-00037', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'closed', 'Aisha Binti Salleh', '011-2004 8761', 'B-12-08, Pangsapuri Bayu, George Town', 'Routine quarterly servicing.', 'General servicing', 16000, 0, null, current_timestamp - interval '6 days', current_timestamp - interval '5 days'),
  ('30000000-0000-4000-8000-000000000006', 'SSS-2026-00036', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', 'closed', 'Kavitha Devi', '018-404 2622', '9, Jalan Sultan Azlan Shah, Ipoh', 'Wall unit needs a standard service and drain flush.', 'General servicing', 15000, 0, null, current_timestamp - interval '4 days', current_timestamp - interval '3 days'),
  ('30000000-0000-4000-8000-000000000007', 'SSS-2026-00035', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'closed', 'Farid Ismail', '013-890 4572', '5, Jalan Bukit Bintang, Petaling Jaya', 'Air conditioner trips after 15 minutes.', 'Diagnostic and repair', 21000, 1200, null, current_timestamp - interval '8 days', current_timestamp - interval '8 days'),
  ('30000000-0000-4000-8000-000000000008', 'SSS-2026-00034', '10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'closed', 'Siti Mazlina', '012-788 7712', '44, Jalan Kebun, Kuantan', 'General service for a living room cassette unit.', 'General servicing', 19000, 0, null, current_timestamp - interval '9 days', current_timestamp - interval '9 days');

insert into public.service_completions (id, order_id, work_done_notes, remarks, extra_charges_cents, completed_at) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'Serviced two indoor units, cleaned filters and tested drainage.', 'Customer advised to run monthly filter clean.', 3500, current_timestamp - interval '3 hours'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', 'Replaced worn condenser fan capacitor and verified stable operating sound.', null, 6800, current_timestamp - interval '2 days'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000005', 'Completed chemical treatment and cooling check for both units.', null, 0, current_timestamp - interval '5 days'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000006', 'Cleaned indoor unit, cleared drain line, and tested cooling.', 'Suggested quarterly servicing.', 0, current_timestamp - interval '3 days'),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000007', 'Replaced damaged capacitor and verified normal running load.', null, 1200, current_timestamp - interval '8 days'),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000008', 'Cleaned filters, evaporator, and checked drainage flow.', null, 0, current_timestamp - interval '9 days');

insert into public.payment_records (order_id, completion_id, amount_cents, method, received_at) values
  ('30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 31500, 'duitnow', current_timestamp - interval '3 hours'),
  ('30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002', 28800, 'card', current_timestamp - interval '2 days'),
  ('30000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000003', 16000, 'cash', current_timestamp - interval '5 days'),
  ('30000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000004', 15000, 'bank_transfer', current_timestamp - interval '3 days'),
  ('30000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000005', 22200, 'duitnow', current_timestamp - interval '8 days'),
  ('30000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000006', 19000, 'cash', current_timestamp - interval '9 days');

insert into public.manager_reviews (order_id, reviewer_label, notes, reviewed_at) values
  ('30000000-0000-4000-8000-000000000004', 'Manager Demo', 'Evidence and parts charge checked.', current_timestamp - interval '1 day');

insert into public.reschedule_events (order_id, previous_scheduled_at, new_scheduled_at, reason, created_by_label) values
  ('30000000-0000-4000-8000-000000000002', current_timestamp - interval '1 day', current_timestamp + interval '2 hours', 'Customer requested an afternoon visit.', 'Admin Demo');

insert into public.audit_events (order_id, event_type, actor_label, detail, created_at) values
  ('30000000-0000-4000-8000-000000000001', 'created', 'Admin Demo', 'Order created and assigned to Ali.', current_timestamp - interval '1 hour'),
  ('30000000-0000-4000-8000-000000000001', 'assigned', 'Admin Demo', 'Assigned to Ali.', current_timestamp - interval '55 minutes'),
  ('30000000-0000-4000-8000-000000000001', 'started', 'Ali', 'Technician started work on site.', current_timestamp - interval '15 minutes'),
  ('30000000-0000-4000-8000-000000000003', 'completed', 'Bala', 'Completion recorded with RM35.00 extra charges.', current_timestamp - interval '3 hours'),
  ('30000000-0000-4000-8000-000000000003', 'payment_recorded', 'Bala', 'DuitNow payment recorded.', current_timestamp - interval '3 hours'),
  ('30000000-0000-4000-8000-000000000003', 'notification_generated', 'System', 'WhatsApp completion message generated.', current_timestamp - interval '3 hours'),
  ('30000000-0000-4000-8000-000000000004', 'reviewed', 'Manager Demo', 'Evidence and cost reviewed.', current_timestamp - interval '1 day'),
  ('30000000-0000-4000-8000-000000000005', 'closed', 'Manager Demo', 'Job closed after review.', current_timestamp - interval '4 days');
