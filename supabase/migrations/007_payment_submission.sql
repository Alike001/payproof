create unique index if not exists payments_one_pending_per_invoice_idx
  on public.payments (invoice_id)
  where state in ('submitted', 'unavailable');

create or replace function public.submit_payment_attempt(
  p_public_id uuid,
  p_quote_id uuid,
  p_tx_hash text,
  p_submitted_by_wallet text,
  p_network_hash text,
  p_now timestamptz,
  p_limit integer default 6,
  p_window_seconds integer default 60
)
returns table(
  payment_id uuid,
  quote_id uuid,
  tx_hash text,
  submitted_by_wallet text,
  payment_state text,
  submitted_at timestamptz,
  outcome text,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice public.invoices%rowtype;
  v_quote public.quotes%rowtype;
  v_existing public.payments%rowtype;
  v_payment public.payments%rowtype;
  v_count integer;
  v_oldest timestamptz;
  v_retry integer;
begin
  if p_now is null then
    raise exception 'Payment submission time is required';
  end if;
  if p_tx_hash !~ '^0x[0-9a-f]{64}$' then
    raise exception 'Invalid transaction hash';
  end if;
  if p_submitted_by_wallet !~ '^0x[0-9a-fA-F]{40}$' then
    raise exception 'Invalid submitting wallet';
  end if;
  if p_network_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid network hash';
  end if;
  if p_limit < 1 or p_limit > 60 or p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'Invalid payment rate limit';
  end if;

  select *
    into v_invoice
    from public.invoices
    where public_id = p_public_id
    for update;

  if not found then
    return query select
      null::uuid, null::uuid, null::text, null::text, null::text,
      null::timestamptz, 'invoice_not_found'::text, 0;
    return;
  end if;

  select *
    into v_existing
    from public.payments
    where payments.tx_hash = p_tx_hash;

  if found then
    if v_existing.invoice_id = v_invoice.id
      and v_existing.quote_id = p_quote_id
      and lower(v_existing.submitted_by_wallet) = lower(p_submitted_by_wallet)
    then
      return query select
        v_existing.id,
        v_existing.quote_id,
        v_existing.tx_hash,
        v_existing.submitted_by_wallet,
        v_existing.state,
        v_existing.submitted_at,
        'idempotent'::text,
        0;
    else
      return query select
        null::uuid, null::uuid, null::text, null::text, null::text,
        null::timestamptz, 'transaction_already_used'::text, 0;
    end if;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'payproof:payment-rate:' || v_invoice.id::text || ':' || p_network_hash,
      0
    )
  );

  select count(*)::integer, min(occurred_at)
    into v_count, v_oldest
    from public.usage_events
    where event_name = 'payment_started'
      and invoice_id = v_invoice.id
      and network_hash = p_network_hash
      and metadata @> '{"endpoint":"payment_submission"}'::jsonb
      and occurred_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    v_retry := greatest(
      1,
      ceil(extract(epoch from (v_oldest + make_interval(secs => p_window_seconds) - now())))::integer
    );
    return query select
      null::uuid, null::uuid, null::text, null::text, null::text,
      null::timestamptz, 'rate_limited'::text, v_retry;
    return;
  end if;

  insert into public.usage_events (
    event_name,
    invoice_id,
    network_hash,
    metadata
  ) values (
    'payment_started',
    v_invoice.id,
    p_network_hash,
    jsonb_build_object('endpoint', 'payment_submission')
  );

  if v_invoice.lifecycle <> 'open' then
    return query select
      null::uuid, null::uuid, null::text, null::text, null::text,
      null::timestamptz, 'invoice_not_payable'::text, 0;
    return;
  end if;

  select *
    into v_quote
    from public.quotes
    where id = p_quote_id
      and invoice_id = v_invoice.id;

  if not found then
    return query select
      null::uuid, null::uuid, null::text, null::text, null::text,
      null::timestamptz, 'quote_not_found'::text, 0;
    return;
  end if;

  if v_quote.quoted_at > p_now or v_quote.expires_at <= p_now then
    return query select
      null::uuid, null::uuid, null::text, null::text, null::text,
      null::timestamptz, 'quote_expired'::text, 0;
    return;
  end if;

  select *
    into v_existing
    from public.payments
    where invoice_id = v_invoice.id
      and state in ('submitted', 'unavailable')
    limit 1;

  if found then
    return query select
      null::uuid, null::uuid, null::text, null::text, null::text,
      null::timestamptz, 'payment_in_progress'::text, 0;
    return;
  end if;

  insert into public.payments (
    invoice_id,
    quote_id,
    tx_hash,
    submitted_by_wallet,
    submitted_at
  ) values (
    v_invoice.id,
    v_quote.id,
    p_tx_hash,
    p_submitted_by_wallet,
    p_now
  )
  on conflict on constraint payments_tx_hash_key do nothing
  returning * into v_payment;

  if not found then
    select *
      into v_existing
      from public.payments
      where payments.tx_hash = p_tx_hash;

    if found
      and v_existing.invoice_id = v_invoice.id
      and v_existing.quote_id = p_quote_id
      and lower(v_existing.submitted_by_wallet) = lower(p_submitted_by_wallet)
    then
      return query select
        v_existing.id,
        v_existing.quote_id,
        v_existing.tx_hash,
        v_existing.submitted_by_wallet,
        v_existing.state,
        v_existing.submitted_at,
        'idempotent'::text,
        0;
    end if;

    return query select
      null::uuid, null::uuid, null::text, null::text, null::text,
      null::timestamptz, 'transaction_already_used'::text, 0;
    return;
  end if;

  insert into public.usage_events (
    event_name,
    invoice_id,
    network_hash,
    metadata
  ) values (
    'payment_submitted',
    v_invoice.id,
    p_network_hash,
    jsonb_build_object('paymentId', v_payment.id)
  );

  return query select
    v_payment.id,
    v_payment.quote_id,
    v_payment.tx_hash,
    v_payment.submitted_by_wallet,
    v_payment.state,
    v_payment.submitted_at,
    'created'::text,
    0;
end;
$$;

revoke all on function public.submit_payment_attempt(
  uuid, uuid, text, text, text, timestamptz, integer, integer
) from public, anon, authenticated;
grant execute on function public.submit_payment_attempt(
  uuid, uuid, text, text, text, timestamptz, integer, integer
) to service_role;
