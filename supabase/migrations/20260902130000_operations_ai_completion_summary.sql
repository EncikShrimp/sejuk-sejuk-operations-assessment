-- A server-only aggregate for the bounded Operations AI summary tool.
-- Anonymous/authenticated callers cannot execute it; the application uses the service-role client.
create or replace function public.operations_ai_completion_summary(
  p_start timestamptz default null,
  p_end timestamptz default null
)
returns table (
  completed_jobs bigint,
  total_amount_cents bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)::bigint as completed_jobs,
    coalesce(sum(final_amount_cents), 0)::bigint as total_amount_cents
  from public.service_orders
  where completed_at is not null
    and (p_start is null or completed_at >= p_start)
    and (p_end is null or completed_at < p_end);
$$;

revoke all on function public.operations_ai_completion_summary(timestamptz, timestamptz) from public;
revoke all on function public.operations_ai_completion_summary(timestamptz, timestamptz) from anon;
revoke all on function public.operations_ai_completion_summary(timestamptz, timestamptz) from authenticated;
grant execute on function public.operations_ai_completion_summary(timestamptz, timestamptz) to service_role;
