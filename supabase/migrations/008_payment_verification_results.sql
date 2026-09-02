alter table public.payments
  add column if not exists verification_observed_at timestamptz,
  add column if not exists verification_source text
    check (verification_source is null or char_length(verification_source) between 1 and 200);

alter table public.payments drop constraint if exists payments_state_shape;
alter table public.payments add constraint payments_state_shape check (
  (
    state = 'submitted'
    and verified_at is null
    and mismatch_code is null
    and verification_call_id is null
  )
  or (
    state = 'unavailable'
    and verified_at is null
    and mismatch_code is not null
    and (
      (
        verification_call_id is null
        and verification_observed_at is null
        and verification_source is null
      )
      or (
        verification_call_id is not null
        and verification_observed_at is not null
        and verification_source is not null
      )
    )
  )
  or (
    state = 'mismatch'
    and verified_at is null
    and mismatch_code is not null
    and verification_call_id is not null
    and verification_observed_at is not null
    and verification_source is not null
  )
  or (
    state = 'verified'
    and verified_at is not null
    and mismatch_code is null
    and verification_call_id is not null
    and verified_transfer_sender is not null
    and observed_chain_id is not null
    and observed_token is not null
    and observed_recipient is not null
    and observed_amount_units is not null
    and observed_tx_status = 'success'
    and verification_observed_at is not null
    and verification_source is not null
  )
);

drop function if exists public.finalize_verified_payment(
  uuid, uuid, text, bigint, text, text, bigint, text
);

create or replace function public.finalize_verified_payment(
  p_payment_id uuid,
  p_verification_call_id uuid,
  p_verified_transfer_sender text,
  p_observed_chain_id bigint,
  p_observed_token text,
  p_observed_recipient text,
  p_observed_amount_units bigint,
  p_observed_tx_status text,
  p_verification_observed_at timestamptz,
  p_verification_source text
)
returns table(payment_id uuid, invoice_id uuid, outcome text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_invoice public.invoices%rowtype;
  v_quote public.quotes%rowtype;
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

  select *
    into v_quote
    from public.quotes as q
    where q.id = v_payment.quote_id
      and q.invoice_id = v_payment.invoice_id;

  if not found then
    raise exception 'Payment quote not found';
  end if;

  if v_payment.state = 'verified' then
    return query select v_payment.id, v_invoice.id, 'already_verified'::text;
    return;
  end if;

  if v_payment.state = 'mismatch' then
    return query select v_payment.id, v_invoice.id, 'already_final'::text;
    return;
  end if;

  if not exists (
    select 1
    from public.telegraph_calls as tc
    where tc.id = p_verification_call_id
      and tc.intent = 'ONCHAIN_TX_LOOKUP'
      and tc.status = 'paid_success'
      and tc.payment_id = p_payment_id
      and tc.invoice_id = v_payment.invoice_id
  ) then
    raise exception 'An exact successful Telegraph verification call is required';
  end if;

  if v_invoice.lifecycle = 'verified' then
    update public.payments
      set state = 'mismatch',
          mismatch_code = 'INVOICE_ALREADY_VERIFIED',
          mismatch_details = jsonb_build_object(
            'reason', 'Another payment already verified this invoice'
          ),
          verification_call_id = p_verification_call_id,
          verification_observed_at = p_verification_observed_at,
          verification_source = p_verification_source,
          last_checked_at = now()
      where id = v_payment.id;

    return query select
      v_payment.id, v_invoice.id, 'invoice_already_verified'::text;
    return;
  end if;

  if v_invoice.lifecycle = 'cancelled' then
    raise exception 'Cancelled invoice cannot be verified';
  end if;

  if p_verified_transfer_sender !~ '^0x[0-9a-fA-F]{40}$'
    or p_observed_chain_id <> 84532
    or lower(p_observed_token) <> lower('0x036CbD53842c5426634e7929541eC2318f3dCF7e')
    or lower(p_observed_recipient) <> lower(v_invoice.recipient_wallet)
    or p_observed_amount_units <> v_quote.usdc_amount_units
    or p_observed_tx_status <> 'success'
    or p_verification_observed_at is null
    or p_verification_source is null
    or char_length(p_verification_source) not between 1 and 200
  then
    raise exception 'Observed payment facts do not match the locked invoice';
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
        verification_observed_at = p_verification_observed_at,
        verification_source = p_verification_source,
        last_checked_at = now(),
        verified_at = now()
    where id = v_payment.id;

  update public.invoices
    set lifecycle = 'verified',
        verified_at = now(),
        cancelled_at = null
    where id = v_invoice.id;

  insert into public.usage_events (
    event_name,
    invoice_id,
    metadata
  ) values (
    'payment_verified',
    v_invoice.id,
    jsonb_build_object('paymentId', v_payment.id)
  );

  return query select v_payment.id, v_invoice.id, 'verified'::text;
end;
$$;

create or replace function public.record_payment_verification_result(
  p_payment_id uuid,
  p_verification_call_id uuid,
  p_state text,
  p_code text,
  p_details jsonb,
  p_observed_chain_id bigint,
  p_observed_token text,
  p_observed_recipient text,
  p_observed_amount_units bigint,
  p_observed_tx_status text,
  p_verification_observed_at timestamptz,
  p_verification_source text
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
  if p_state not in ('mismatch', 'unavailable') then
    raise exception 'Invalid verification result state';
  end if;
  if p_code is null or char_length(p_code) not between 1 and 80 then
    raise exception 'A bounded verification result code is required';
  end if;

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

  if v_payment.state in ('verified', 'mismatch') then
    return query select v_payment.id, v_invoice.id, 'already_final'::text;
    return;
  end if;

  if v_invoice.lifecycle = 'verified' then
    p_state := 'mismatch';
    p_code := 'INVOICE_ALREADY_VERIFIED';
    p_details := jsonb_build_object(
      'reason', 'Another payment already verified this invoice'
    );
  elsif v_invoice.lifecycle = 'cancelled' then
    p_state := 'mismatch';
    p_code := 'INVOICE_NOT_PAYABLE';
    p_details := jsonb_build_object('reason', 'The invoice was cancelled');
  end if;

  if p_verification_call_id is not null and not exists (
      select 1
      from public.telegraph_calls as tc
      where tc.id = p_verification_call_id
        and tc.intent = 'ONCHAIN_TX_LOOKUP'
        and tc.status = 'paid_success'
        and tc.payment_id = p_payment_id
        and tc.invoice_id = v_payment.invoice_id
    )
  then
    raise exception 'Verification provenance does not belong to this payment';
  end if;

  if p_state = 'mismatch' and p_verification_call_id is null then
    raise exception 'A successful Telegraph call is required for a mismatch';
  end if;

  update public.payments
    set state = p_state,
        mismatch_code = p_code,
        mismatch_details = coalesce(p_details, '{}'::jsonb),
        observed_chain_id = p_observed_chain_id,
        observed_token = p_observed_token,
        observed_recipient = p_observed_recipient,
        observed_amount_units = p_observed_amount_units,
        observed_tx_status = p_observed_tx_status,
        verification_call_id = p_verification_call_id,
        verification_observed_at = p_verification_observed_at,
        verification_source = p_verification_source,
        last_checked_at = now(),
        verified_at = null,
        verified_transfer_sender = null
    where id = v_payment.id;

  return query select v_payment.id, v_invoice.id, p_state;
end;
$$;

create or replace function public.consume_verification_rate_limit(
  p_payment_id uuid,
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
  v_invoice_id uuid;
  v_count integer;
  v_oldest timestamptz;
  v_retry integer;
begin
  if p_network_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid network hash';
  end if;
  if p_limit < 1 or p_limit > 60 or p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'Invalid verification rate limit';
  end if;

  select payments.invoice_id
    into v_invoice_id
    from public.payments
    where payments.id = p_payment_id;

  if not found then
    raise exception 'Payment not found';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'payproof:verification-rate:' || p_payment_id::text || ':' || p_network_hash,
      0
    )
  );

  select count(*)::integer, min(occurred_at)
    into v_count, v_oldest
    from public.usage_events
    where event_name = 'verification_requested'
      and invoice_id = v_invoice_id
      and network_hash = p_network_hash
      and metadata @> jsonb_build_object('paymentId', p_payment_id)
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
    'verification_requested',
    v_invoice_id,
    p_network_hash,
    jsonb_build_object('paymentId', p_payment_id)
  );

  return query select true, 0;
end;
$$;

revoke all on function public.finalize_verified_payment(
  uuid, uuid, text, bigint, text, text, bigint, text, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.finalize_verified_payment(
  uuid, uuid, text, bigint, text, text, bigint, text, timestamptz, text
) to service_role;

revoke all on function public.record_payment_verification_result(
  uuid, uuid, text, text, jsonb, bigint, text, text, bigint, text,
  timestamptz, text
) from public, anon, authenticated;
grant execute on function public.record_payment_verification_result(
  uuid, uuid, text, text, jsonb, bigint, text, text, bigint, text,
  timestamptz, text
) to service_role;

revoke all on function public.consume_verification_rate_limit(
  uuid, text, integer, integer
) from public, anon, authenticated;
grant execute on function public.consume_verification_rate_limit(
  uuid, text, integer, integer
) to service_role;
