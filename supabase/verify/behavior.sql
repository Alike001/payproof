begin;

insert into auth.users (id) values
  ('10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002');

insert into public.invoices (
  id,
  public_id,
  creator_user_id,
  creator_wallet,
  freelancer_name,
  description,
  currency,
  amount_minor,
  recipient_wallet,
  due_date
) values
  (
    '11000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-9000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '0x1111111111111111111111111111111111111111',
    'Creator One',
    'Owner-visible invoice',
    'USD',
    12550,
    '0x1111111111111111111111111111111111111111',
    '2026-09-07'
  ),
  (
    '22000000-0000-4000-8000-000000000002',
    '22000000-0000-4000-9000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '0x2222222222222222222222222222222222222222',
    'Creator Two',
    'Cross-wallet hidden invoice',
    'EUR',
    8000,
    '0x2222222222222222222222222222222222222222',
    '2026-09-07'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

do $$
declare
  v_count integer;
  v_blocked boolean := false;
begin
  select count(*) into v_count from public.invoices;
  if v_count <> 1 then
    raise exception 'RLS owner read failed: expected 1 row, received %', v_count;
  end if;

  begin
    insert into public.invoices (
      creator_user_id,
      creator_wallet,
      freelancer_name,
      description,
      currency,
      amount_minor,
      recipient_wallet,
      due_date
    ) values (
      '20000000-0000-4000-8000-000000000002',
      '0x1111111111111111111111111111111111111111',
      'Forged owner',
      'Must not insert',
      'NGN',
      10000,
      '0x1111111111111111111111111111111111111111',
      '2026-09-07'
    );
  exception when insufficient_privilege then
    v_blocked := true;
  end;

  if not v_blocked then
    raise exception 'RLS allowed an invoice for another creator user';
  end if;
end;
$$;

reset role;

-- Isolate the transactional budget proof from legitimate same-day live calls.
-- The surrounding rollback restores every persisted Telegraph record.
delete from public.telegraph_calls;

do $$
declare
  v_blocked boolean := false;
begin
  begin
    update public.invoices
      set description = 'Mutated after publication'
      where id = '11000000-0000-4000-8000-000000000001';
  exception when others then
    v_blocked := sqlerrm = 'Published invoice commercial fields are immutable';
  end;

  if not v_blocked then
    raise exception 'Published invoice commercial fields were mutable';
  end if;
end;
$$;

do $$
declare
  v_first record;
  v_repeat record;
  v_rejected record;
begin
  select * into v_first from public.reserve_telegraph_spend(
    'fx:invoice-1',
    '11000000-0000-4000-8000-000000000001',
    null,
    null,
    'CURRENCY_EXCHANGE',
    '20260827',
    'FX Rate Mirror',
    'primary',
    '{"pair":"NGN/USD"}'::jsonb,
    'eip155:84532',
    300,
    500
  );

  select * into v_repeat from public.reserve_telegraph_spend(
    'fx:invoice-1',
    '11000000-0000-4000-8000-000000000001',
    null,
    null,
    'CURRENCY_EXCHANGE',
    '20260827',
    'FX Rate Mirror',
    'primary',
    '{"pair":"NGN/USD"}'::jsonb,
    'eip155:84532',
    300,
    500
  );

  select * into v_rejected from public.reserve_telegraph_spend(
    'fx:invoice-2',
    '22000000-0000-4000-8000-000000000002',
    null,
    null,
    'CURRENCY_EXCHANGE',
    '20260827',
    'FX Rate Mirror',
    'primary',
    '{"pair":"EUR/USD"}'::jsonb,
    'eip155:84532',
    300,
    500
  );

  if not v_first.reserved or v_first.call_status <> 'started' then
    raise exception 'First spend reservation was not accepted';
  end if;
  if v_repeat.call_id <> v_first.call_id then
    raise exception 'Spend reservation was not idempotent';
  end if;
  if v_rejected.reserved or v_rejected.call_status <> 'rejected_budget' then
    raise exception 'Daily spend limit did not reject the second action';
  end if;
end;
$$;

insert into public.telegraph_calls (
  id,
  action_key,
  invoice_id,
  intent,
  miner_id,
  miner_name,
  attempt_role,
  status,
  request_sanitized
) values (
  '31000000-0000-4000-8000-000000000001',
  'tx:payment-1',
  '11000000-0000-4000-8000-000000000001',
  'ONCHAIN_TX_LOOKUP',
  '8453',
  'Truvian',
  'primary',
  'paid_success',
  '{"chain":"base-sepolia"}'::jsonb
);

insert into public.quotes (
  id,
  invoice_id,
  source_kind,
  source_currency,
  source_amount_minor,
  rate_decimal,
  usdc_amount_units,
  quoted_at,
  expires_at,
  source_name
) values (
  '41000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  'usd_parity',
  'USD',
  12550,
  1,
  125500000,
  now(),
  now() + interval '15 minutes',
  'Nominal 1 USD = 1 test USDC'
);

insert into public.payments (
  id,
  invoice_id,
  quote_id,
  tx_hash,
  submitted_by_wallet
) values (
  '51000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000001',
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '0x3333333333333333333333333333333333333333'
);

update public.telegraph_calls
  set payment_id = '51000000-0000-4000-8000-000000000001'
  where id = '31000000-0000-4000-8000-000000000001';

select * from public.finalize_verified_payment(
  '51000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001',
  '0x3333333333333333333333333333333333333333',
  84532,
  '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  '0x1111111111111111111111111111111111111111',
  125500000,
  'success',
  now(),
  'Truvian receipt-derived facts'
);

do $$
begin
  if not exists (
    select 1 from public.invoices
    where id = '11000000-0000-4000-8000-000000000001'
      and lifecycle = 'verified'
      and verified_at is not null
  ) then
    raise exception 'Invoice and payment were not atomically finalized';
  end if;

  if not exists (
    select 1 from public.payments
    where id = '51000000-0000-4000-8000-000000000001'
      and state = 'verified'
      and verified_at is not null
  ) then
    raise exception 'Verified payment evidence was not persisted';
  end if;
end;
$$;

rollback;
