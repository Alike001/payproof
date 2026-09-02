begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(44);

select has_table('public', 'invoices', 'invoices table exists');
select has_table('public', 'quotes', 'quotes table exists');
select has_table('public', 'payments', 'payments table exists');
select has_table('public', 'telegraph_calls', 'telegraph_calls table exists');
select has_table('public', 'usage_events', 'usage_events table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.invoices'::regclass),
  'invoices has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.quotes'::regclass),
  'quotes has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.payments'::regclass),
  'payments has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.telegraph_calls'::regclass),
  'telegraph_calls has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.usage_events'::regclass),
  'usage_events has RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.invoices', 'select'),
  'anonymous users cannot enumerate invoices'
);
select ok(
  not has_table_privilege('authenticated', 'public.telegraph_calls', 'select'),
  'authenticated users cannot read raw Telegraph calls'
);
select ok(
  not has_table_privilege('authenticated', 'public.usage_events', 'select'),
  'authenticated users cannot read internal usage events'
);
select ok(
  has_table_privilege('authenticated', 'public.quotes', 'select'),
  'authenticated creators may read owner-filtered quotes'
);
select ok(
  has_table_privilege('authenticated', 'public.payments', 'select'),
  'authenticated creators may read owner-filtered payments'
);
select ok(
  not has_table_privilege('authenticated', 'public.invoices', 'insert'),
  'authenticated browsers cannot bypass server-only invoice publication'
);
select ok(
  not has_table_privilege('authenticated', 'public.invoices', 'update'),
  'authenticated browsers cannot bypass server-only invoice cancellation'
);
select has_function(
  'public',
  'read_current_quote',
  array['uuid', 'timestamp with time zone'],
  'exact current-quote reader exists'
);
select has_function(
  'public',
  'consume_quote_rate_limit',
  array['uuid', 'text', 'integer', 'integer'],
  'atomic quote endpoint rate limiter exists'
);
select ok(
  not has_function_privilege('anon', 'public.read_current_quote(uuid,timestamp with time zone)', 'execute'),
  'anonymous browsers cannot call the privileged quote reader'
);
select ok(
  not has_function_privilege('authenticated', 'public.consume_quote_rate_limit(uuid,text,integer,integer)', 'execute'),
  'authenticated browsers cannot forge quote rate-limit events'
);
select has_function(
  'public',
  'submit_payment_attempt',
  array['uuid', 'uuid', 'text', 'text', 'text', 'timestamp with time zone', 'integer', 'integer'],
  'atomic payment-attempt submission exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.submit_payment_attempt(uuid,uuid,text,text,text,timestamp with time zone,integer,integer)',
    'execute'
  ),
  'anonymous browsers cannot bypass the payment service'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.submit_payment_attempt(uuid,uuid,text,text,text,timestamp with time zone,integer,integer)',
    'execute'
  ),
  'service role can submit a validated payment attempt'
);
select ok(
  to_regclass('public.payments_one_pending_per_invoice_idx') is not null,
  'only one pending payment is permitted per invoice'
);

select ok(
  to_regclass('public.payments_one_verified_per_invoice_idx') is not null,
  'only one verified payment is permitted per invoice'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'payments'
      and indexdef ilike '%unique%tx_hash%'
  ),
  'transaction hashes are globally unique'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.invoices'::regclass
      and tgname = 'invoices_preserve_commercial_fields'
      and not tgisinternal
  ),
  'published invoice commercial fields are immutable'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.payments'::regclass
      and tgname = 'payments_preserve_identity'
      and not tgisinternal
  ),
  'payment identity fields are immutable'
);

select ok(
  to_regprocedure(
    'public.reserve_telegraph_spend(text,uuid,uuid,uuid,text,text,text,text,jsonb,text,bigint,bigint)'
  ) is not null,
  'atomic Telegraph spend reservation exists'
);
select ok(
  to_regprocedure(
    'public.finalize_verified_payment(uuid,uuid,text,bigint,text,text,bigint,text,timestamp with time zone,text)'
  ) is not null,
  'atomic payment finalization exists'
);
select has_column(
  'public',
  'payments',
  'verification_observed_at',
  'normalized verification observation time is persisted'
);
select has_column(
  'public',
  'payments',
  'verification_source',
  'sanitized verification source is persisted'
);
select ok(
  to_regprocedure(
    'public.record_payment_verification_result(uuid,uuid,text,text,jsonb,bigint,text,text,bigint,text,timestamp with time zone,text)'
  ) is not null,
  'atomic mismatch and unavailable recorder exists'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.record_payment_verification_result(uuid,uuid,text,text,jsonb,bigint,text,text,bigint,text,timestamp with time zone,text)',
    'execute'
  ),
  'authenticated callers cannot record verification outcomes'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.record_payment_verification_result(uuid,uuid,text,text,jsonb,bigint,text,text,bigint,text,timestamp with time zone,text)',
    'execute'
  ),
  'service role can record verification outcomes'
);
select has_function(
  'public',
  'consume_verification_rate_limit',
  array['uuid', 'text', 'integer', 'integer'],
  'atomic verification endpoint rate limiter exists'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.consume_verification_rate_limit(uuid,text,integer,integer)',
    'execute'
  ),
  'authenticated browsers cannot forge verification request events'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.consume_verification_rate_limit(uuid,text,integer,integer)',
    'execute'
  ),
  'service role can consume the verification rate limit'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.reserve_telegraph_spend(text,uuid,uuid,uuid,text,text,text,text,jsonb,text,bigint,bigint)',
    'execute'
  ),
  'authenticated callers cannot reserve service-wallet spend'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.reserve_telegraph_spend(text,uuid,uuid,uuid,text,text,text,text,jsonb,text,bigint,bigint)',
    'execute'
  ),
  'service role can reserve service-wallet spend'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.finalize_verified_payment(uuid,uuid,text,bigint,text,text,bigint,text,timestamp with time zone,text)',
    'execute'
  ),
  'authenticated callers cannot finalize a verified payment'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.finalize_verified_payment(uuid,uuid,text,bigint,text,text,bigint,text,timestamp with time zone,text)',
    'execute'
  ),
  'service role can finalize a verified payment'
);

select ok(
  (select count(*) = 5 from pg_tables where schemaname = 'public'
    and tablename in ('invoices', 'quotes', 'payments', 'telegraph_calls', 'usage_events')),
  'the application adds exactly five public tables'
);

select * from finish();
rollback;
