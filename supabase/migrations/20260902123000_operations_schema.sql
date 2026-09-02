create extension if not exists pgcrypto;

create type public.workflow_status as enum (
  'new',
  'assigned',
  'in_progress',
  'job_done',
  'reviewed',
  'closed'
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  city text not null,
  created_at timestamptz not null default now()
);

create table public.technicians (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  name text not null unique,
  employee_code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create sequence public.order_number_sequence start 1;

create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  branch_id uuid not null references public.branches(id),
  assigned_technician_id uuid references public.technicians(id),
  status public.workflow_status not null default 'new',
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_phone text not null check (char_length(customer_phone) between 6 and 32),
  address text not null check (char_length(address) between 1 and 500),
  issue text not null check (char_length(issue) between 1 and 1500),
  service_type text not null check (char_length(service_type) between 1 and 120),
  quoted_amount_cents bigint not null check (quoted_amount_cents >= 0),
  extra_charges_cents bigint not null default 0 check (extra_charges_cents >= 0),
  final_amount_cents bigint generated always as (quoted_amount_cents + extra_charges_cents) stored,
  admin_notes text,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'new' and assigned_technician_id is null) or status <> 'new')
);

create table public.service_completions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.service_orders(id) on delete restrict,
  work_done_notes text not null check (char_length(work_done_notes) between 1 and 3000),
  remarks text,
  extra_charges_cents bigint not null default 0 check (extra_charges_cents >= 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.job_attachments (
  id uuid primary key default gen_random_uuid(),
  completion_id uuid not null references public.service_completions(id) on delete restrict,
  bucket_path text not null unique,
  file_name text not null,
  content_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  kind text not null check (kind in ('job_evidence', 'payment_receipt')),
  created_at timestamptz not null default now()
);

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.service_orders(id) on delete restrict,
  completion_id uuid references public.service_completions(id) on delete restrict,
  amount_cents bigint not null check (amount_cents >= 0),
  method text not null check (method in ('cash', 'duitnow', 'card', 'bank_transfer')),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.manager_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.service_orders(id) on delete restrict,
  reviewer_label text not null,
  notes text,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.reschedule_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.service_orders(id) on delete restrict,
  previous_scheduled_at timestamptz not null,
  new_scheduled_at timestamptz not null,
  reason text not null,
  created_by_label text not null,
  created_at timestamptz not null default now(),
  check (new_scheduled_at <> previous_scheduled_at)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.service_orders(id) on delete restrict,
  event_type text not null check (event_type in ('created', 'assigned', 'started', 'completed', 'payment_recorded', 'reviewed', 'closed', 'notification_generated', 'rescheduled')),
  actor_label text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create index service_orders_status_scheduled_idx on public.service_orders(status, scheduled_at);
create index service_orders_technician_completed_idx on public.service_orders(assigned_technician_id, completed_at);
create index audit_events_order_created_idx on public.audit_events(order_id, created_at desc);
create index reschedule_events_order_created_idx on public.reschedule_events(order_id, created_at desc);

create or replace function public.assign_order_number()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'SSS-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.order_number_sequence')::text, 5, '0');
  end if;
  return new;
end;
$$;

create or replace function public.enforce_order_workflow()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status <> old.status and not (
    (old.status = 'new' and new.status = 'assigned') or
    (old.status = 'assigned' and new.status = 'in_progress') or
    (old.status = 'in_progress' and new.status = 'job_done') or
    (old.status = 'job_done' and new.status = 'reviewed') or
    (old.status = 'reviewed' and new.status = 'closed')
  ) then
    raise exception 'Invalid workflow transition from % to %', old.status, new.status;
  end if;

  if new.status = 'assigned' and new.assigned_technician_id is null then
    raise exception 'An assigned order requires a technician';
  end if;

  if new.status = 'job_done' and new.completed_at is null then
    new.completed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'Audit events are immutable';
end;
$$;

create trigger set_order_number_before_insert
before insert on public.service_orders
for each row execute function public.assign_order_number();

create trigger enforce_order_workflow_before_update
before update on public.service_orders
for each row execute function public.enforce_order_workflow();

create trigger prevent_audit_event_update
before update or delete on public.audit_events
for each row execute function public.prevent_audit_mutation();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-evidence',
  'job-evidence',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf']
)
on conflict (id) do update set public = false;

alter table public.branches enable row level security;
alter table public.technicians enable row level security;
alter table public.service_orders enable row level security;
alter table public.service_completions enable row level security;
alter table public.job_attachments enable row level security;
alter table public.payment_records enable row level security;
alter table public.manager_reviews enable row level security;
alter table public.reschedule_events enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

create policy "service role manages private job evidence"
on storage.objects for all to service_role
using (bucket_id = 'job-evidence')
with check (bucket_id = 'job-evidence');
