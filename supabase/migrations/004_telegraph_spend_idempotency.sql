create or replace function public.reserve_telegraph_spend(
  p_action_key text,
  p_invoice_id uuid,
  p_quote_id uuid,
  p_payment_id uuid,
  p_intent text,
  p_miner_id text,
  p_miner_name text,
  p_attempt_role text,
  p_request_sanitized jsonb,
  p_x402_network text,
  p_amount_units bigint,
  p_daily_budget_units bigint
)
returns table(call_id uuid, reserved boolean, call_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.telegraph_calls%rowtype;
  v_spent bigint;
  v_call_id uuid;
begin
  if p_amount_units <= 0 or p_daily_budget_units <= 0 then
    raise exception 'Spend limits must be positive';
  end if;

  if p_amount_units > 9007199254740991 or p_daily_budget_units > 9007199254740991 then
    raise exception 'Spend limits exceed the application-safe integer bound';
  end if;

  if p_amount_units > p_daily_budget_units then
    raise exception 'Single call amount exceeds the daily budget';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('payproof:x402:' || current_date::text, 0));

  select *
    into v_existing
    from public.telegraph_calls
    where action_key = p_action_key
      and attempt_role = p_attempt_role;

  if found then
    return query select v_existing.id, false, v_existing.status;
    return;
  end if;

  select coalesce(sum(x402_amount_units), 0)::bigint
    into v_spent
    from public.telegraph_calls
    where created_at >= date_trunc('day', now())
      and created_at < date_trunc('day', now()) + interval '1 day'
      and status <> 'rejected_budget';

  if v_spent + p_amount_units > p_daily_budget_units then
    insert into public.telegraph_calls (
      action_key, invoice_id, quote_id, payment_id, intent, miner_id,
      miner_name, attempt_role, status, request_sanitized, x402_network,
      x402_amount_units, completed_at
    ) values (
      p_action_key, p_invoice_id, p_quote_id, p_payment_id, p_intent, p_miner_id,
      p_miner_name, p_attempt_role, 'rejected_budget',
      coalesce(p_request_sanitized, '{}'::jsonb), p_x402_network,
      p_amount_units, now()
    ) returning id into v_call_id;

    return query select v_call_id, false, 'rejected_budget'::text;
    return;
  end if;

  insert into public.telegraph_calls (
    action_key, invoice_id, quote_id, payment_id, intent, miner_id,
    miner_name, attempt_role, status, request_sanitized, x402_network,
    x402_amount_units
  ) values (
    p_action_key, p_invoice_id, p_quote_id, p_payment_id, p_intent, p_miner_id,
    p_miner_name, p_attempt_role, 'started',
    coalesce(p_request_sanitized, '{}'::jsonb), p_x402_network, p_amount_units
  ) returning id into v_call_id;

  return query select v_call_id, true, 'started'::text;
end;
$$;
