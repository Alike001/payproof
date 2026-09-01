create function public.reserve_telegraph_spend(
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
    return query select v_existing.id, v_existing.status <> 'rejected_budget', v_existing.status;
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
      action_key,
      invoice_id,
      quote_id,
      payment_id,
      intent,
      miner_id,
      miner_name,
      attempt_role,
      status,
      request_sanitized,
      x402_network,
      x402_amount_units,
      completed_at
    ) values (
      p_action_key,
      p_invoice_id,
      p_quote_id,
      p_payment_id,
      p_intent,
      p_miner_id,
      p_miner_name,
      p_attempt_role,
      'rejected_budget',
      coalesce(p_request_sanitized, '{}'::jsonb),
      p_x402_network,
      p_amount_units,
      now()
    ) returning id into v_call_id;

    return query select v_call_id, false, 'rejected_budget'::text;
    return;
  end if;

  insert into public.telegraph_calls (
    action_key,
    invoice_id,
    quote_id,
    payment_id,
    intent,
    miner_id,
    miner_name,
    attempt_role,
    status,
    request_sanitized,
    x402_network,
    x402_amount_units
  ) values (
    p_action_key,
    p_invoice_id,
    p_quote_id,
    p_payment_id,
    p_intent,
    p_miner_id,
    p_miner_name,
    p_attempt_role,
    'started',
    coalesce(p_request_sanitized, '{}'::jsonb),
    p_x402_network,
    p_amount_units
  ) returning id into v_call_id;

  return query select v_call_id, true, 'started'::text;
end;
$$;

create function public.finalize_verified_payment(
  p_payment_id uuid,
  p_verification_call_id uuid,
  p_verified_transfer_sender text,
  p_observed_chain_id bigint,
  p_observed_token text,
  p_observed_recipient text,
  p_observed_amount_units bigint,
  p_observed_tx_status text
)
returns table(payment_id uuid, invoice_id uuid, outcome text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_invoice public.invoices%rowtype;
begin
  select *
    into v_payment
    from public.payments
    where id = p_payment_id
    for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  select *
    into v_invoice
    from public.invoices
    where id = v_payment.invoice_id
    for update;

  if v_payment.state = 'verified' then
    return query select v_payment.id, v_invoice.id, 'already_verified'::text;
    return;
  end if;

  if v_invoice.lifecycle = 'verified' then
    update public.payments
      set state = 'mismatch',
          mismatch_code = 'INVOICE_ALREADY_VERIFIED',
          mismatch_details = jsonb_build_object('reason', 'Another payment already verified this invoice'),
          verification_call_id = p_verification_call_id,
          last_checked_at = now()
      where id = v_payment.id;

    return query select v_payment.id, v_invoice.id, 'invoice_already_verified'::text;
    return;
  end if;

  if v_invoice.lifecycle = 'cancelled' then
    raise exception 'Cancelled invoice cannot be verified';
  end if;

  if not exists (
    select 1
    from public.telegraph_calls as tc
    where tc.id = p_verification_call_id
      and tc.intent = 'ONCHAIN_TX_LOOKUP'
      and tc.status = 'paid_success'
      and (tc.payment_id is null or tc.payment_id = p_payment_id)
  ) then
    raise exception 'A successful Telegraph verification call is required';
  end if;

  update public.payments
    set state = 'verified',
        mismatch_code = null,
        mismatch_details = null,
        verified_transfer_sender = p_verified_transfer_sender,
        observed_chain_id = p_observed_chain_id,
        observed_token = p_observed_token,
        observed_recipient = p_observed_recipient,
        observed_amount_units = p_observed_amount_units,
        observed_tx_status = p_observed_tx_status,
        verification_call_id = p_verification_call_id,
        last_checked_at = now(),
        verified_at = now()
    where id = v_payment.id;

  update public.invoices
    set lifecycle = 'verified',
        verified_at = now(),
        cancelled_at = null
    where id = v_invoice.id;

  return query select v_payment.id, v_invoice.id, 'verified'::text;
end;
$$;

revoke execute on function public.reserve_telegraph_spend(
  text, uuid, uuid, uuid, text, text, text, text, jsonb, text, bigint, bigint
) from public, anon, authenticated;
grant execute on function public.reserve_telegraph_spend(
  text, uuid, uuid, uuid, text, text, text, text, jsonb, text, bigint, bigint
) to service_role;

revoke execute on function public.finalize_verified_payment(
  uuid, uuid, text, bigint, text, text, bigint, text
) from public, anon, authenticated;
grant execute on function public.finalize_verified_payment(
  uuid, uuid, text, bigint, text, text, bigint, text
) to service_role;
