create function public.read_current_quote(
  p_invoice_id uuid,
  p_now timestamptz
)
returns table(
  id uuid,
  invoice_id uuid,
  source_kind text,
  source_currency text,
  source_amount_minor_text text,
  rate_decimal_text text,
  usdc_amount_units_text text,
  quoted_at timestamptz,
  expires_at timestamptz,
  source_observed_at timestamptz,
  source_name text,
  telegraph_call_id uuid,
  miner_id text,
  miner_name text,
  attempt_role text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    q.id,
    q.invoice_id,
    q.source_kind,
    q.source_currency,
    q.source_amount_minor::text,
    q.rate_decimal::text,
    q.usdc_amount_units::text,
    q.quoted_at,
    q.expires_at,
    q.source_observed_at,
    q.source_name,
    q.telegraph_call_id,
    tc.miner_id,
    tc.miner_name,
    tc.attempt_role
  from public.quotes q
  left join public.telegraph_calls tc on tc.id = q.telegraph_call_id
  where q.invoice_id = p_invoice_id
    and q.expires_at > p_now
  order by q.quoted_at desc, q.id desc
  limit 1;
$$;

create function public.consume_quote_rate_limit(
  p_invoice_id uuid,
  p_network_hash text,
  p_limit integer default 6,
  p_window_seconds integer default 60
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_oldest timestamptz;
  v_retry integer;
begin
  if p_network_hash is null or char_length(p_network_hash) <> 64 then
    raise exception 'Invalid network hash';
  end if;
  if p_limit < 1 or p_limit > 60 or p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'Invalid quote rate limit';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('payproof:quote-rate:' || p_invoice_id::text || ':' || p_network_hash, 0)
  );

  select count(*)::integer, min(occurred_at)
    into v_count, v_oldest
    from public.usage_events
    where event_name = 'quote_requested'
      and invoice_id = p_invoice_id
      and network_hash = p_network_hash
      and occurred_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    v_retry := greatest(
      1,
      ceil(extract(epoch from (v_oldest + make_interval(secs => p_window_seconds) - now())))::integer
    );
    return query select false, v_retry;
    return;
  end if;

  insert into public.usage_events (
    event_name,
    invoice_id,
    network_hash,
    metadata
  ) values (
    'quote_requested',
    p_invoice_id,
    p_network_hash,
    jsonb_build_object('endpoint', 'quote')
  );

  return query select true, 0;
end;
$$;

revoke all on function public.read_current_quote(uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.consume_quote_rate_limit(uuid, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.read_current_quote(uuid, timestamptz)
  to service_role;
grant execute on function public.consume_quote_rate_limit(uuid, text, integer, integer)
  to service_role;
