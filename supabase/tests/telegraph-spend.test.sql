begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(4);

-- Isolate the daily-budget assertions from legitimate live smoke records. The
-- surrounding transaction rolls these rows back after the test completes.
delete from public.telegraph_calls;

select is(
  (select reserved from public.reserve_telegraph_spend(
    'test-action', null, null, null, 'CURRENCY_EXCHANGE', 'miner-1',
    'Miner One', 'primary', '{}'::jsonb, 'eip155:84532', 10, 100
  )),
  true,
  'the first action-role reservation is granted'
);

select is(
  (select reserved from public.reserve_telegraph_spend(
    'test-action', null, null, null, 'CURRENCY_EXCHANGE', 'miner-1',
    'Miner One', 'primary', '{}'::jsonb, 'eip155:84532', 10, 100
  )),
  false,
  'a retry of the same action-role cannot reserve or sign again'
);

select is(
  (select reserved from public.reserve_telegraph_spend(
    'test-action', null, null, null, 'CURRENCY_EXCHANGE', 'miner-2',
    'Miner Two', 'backup', '{}'::jsonb, 'eip155:84532', 10, 100
  )),
  true,
  'the separately keyed backup role may reserve once'
);

select results_eq(
  $$select reserved, call_status from public.reserve_telegraph_spend(
    'over-budget-action', null, null, null, 'CURRENCY_EXCHANGE', 'miner-1',
    'Miner One', 'primary', '{}'::jsonb, 'eip155:84532', 81, 100
  )$$,
  $$values (false, 'rejected_budget'::text)$$,
  'daily budget exhaustion is recorded and rejected atomically'
);

select * from finish();
rollback;
