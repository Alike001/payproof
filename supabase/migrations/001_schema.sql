create extension if not exists pgcrypto with schema extensions;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null unique default gen_random_uuid(),
  creator_user_id uuid not null references auth.users(id) on delete restrict,
  creator_wallet text not null,
  freelancer_name text not null check (char_length(freelancer_name) between 1 and 100),
  client_reference text check (client_reference is null or char_length(client_reference) between 1 and 100),
  description text not null check (char_length(description) between 1 and 500),
  currency text not null check (currency in ('NGN', 'USD', 'EUR', 'GBP')),
  amount_minor bigint not null check (amount_minor between 1 and 9007199254740991),
  minor_unit_decimals smallint not null default 2 check (minor_unit_decimals = 2),
  recipient_wallet text not null,
  due_date date not null,
  lifecycle text not null default 'open' check (lifecycle in ('open', 'cancelled', 'verified')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  verified_at timestamptz,
  constraint invoices_creator_wallet_format check (creator_wallet ~ '^0x[0-9a-fA-F]{40}$'),
  constraint invoices_recipient_wallet_format check (recipient_wallet ~ '^0x[0-9a-fA-F]{40}$'),
  constraint invoices_recipient_is_creator check (recipient_wallet = creator_wallet),
  constraint invoices_lifecycle_timestamps check (
    (lifecycle = 'open' and cancelled_at is null and verified_at is null)
    or (lifecycle = 'cancelled' and cancelled_at is not null and verified_at is null)
    or (lifecycle = 'verified' and cancelled_at is null and verified_at is not null)
  )
);

create index invoices_creator_created_idx
  on public.invoices (creator_user_id, created_at desc);
create index invoices_open_due_date_idx
  on public.invoices (due_date)
  where lifecycle = 'open';

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  source_kind text not null check (source_kind in ('telegraph_fx', 'usd_parity')),
  source_currency text not null check (source_currency in ('NGN', 'USD', 'EUR', 'GBP')),
  target_currency text not null default 'USD' check (target_currency = 'USD'),
  source_amount_minor bigint not null check (source_amount_minor between 1 and 9007199254740991),
  rate_decimal numeric(38, 18) not null check (rate_decimal > 0),
  usdc_amount_units bigint not null check (usdc_amount_units between 1 and 9007199254740991),
  quoted_at timestamptz not null,
  expires_at timestamptz not null,
  telegraph_call_id uuid,
  source_observed_at timestamptz,
  source_name text not null check (char_length(source_name) between 1 and 120),
  created_at timestamptz not null default now(),
  constraint quotes_expire_after_quote check (expires_at > quoted_at),
  constraint quotes_source_kind_shape check (
    (source_kind = 'usd_parity' and source_currency = 'USD' and rate_decimal = 1 and telegraph_call_id is null)
    or (source_kind = 'telegraph_fx' and source_currency <> 'USD' and telegraph_call_id is not null)
  ),
  unique (id, invoice_id)
);

create index quotes_invoice_created_idx
  on public.quotes (invoice_id, created_at desc);
create index quotes_current_idx
  on public.quotes (invoice_id, expires_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  quote_id uuid not null,
  tx_hash text not null unique,
  submitted_by_wallet text not null,
  verified_transfer_sender text,
  state text not null default 'submitted' check (state in ('submitted', 'unavailable', 'mismatch', 'verified')),
  mismatch_code text,
  mismatch_details jsonb,
  observed_chain_id bigint,
  observed_token text,
  observed_recipient text,
  observed_amount_units bigint check (
    observed_amount_units is null
    or observed_amount_units between 0 and 9007199254740991
  ),
  observed_tx_status text,
  verification_call_id uuid,
  submitted_at timestamptz not null default now(),
  last_checked_at timestamptz,
  verified_at timestamptz,
  constraint payments_quote_invoice_fk foreign key (quote_id, invoice_id)
    references public.quotes(id, invoice_id) on delete restrict,
  constraint payments_hash_lowercase check (tx_hash ~ '^0x[0-9a-f]{64}$'),
  constraint payments_submitter_format check (submitted_by_wallet ~ '^0x[0-9a-fA-F]{40}$'),
  constraint payments_sender_format check (
    verified_transfer_sender is null or verified_transfer_sender ~ '^0x[0-9a-fA-F]{40}$'
  ),
  constraint payments_token_format check (
    observed_token is null or observed_token ~ '^0x[0-9a-fA-F]{40}$'
  ),
  constraint payments_recipient_format check (
    observed_recipient is null or observed_recipient ~ '^0x[0-9a-fA-F]{40}$'
  ),
  constraint payments_state_shape check (
    (state = 'verified' and verified_at is not null and mismatch_code is null)
    or (state = 'mismatch' and verified_at is null and mismatch_code is not null)
    or (state in ('submitted', 'unavailable') and verified_at is null)
  )
);

create index payments_invoice_submitted_idx
  on public.payments (invoice_id, submitted_at desc);
create unique index payments_one_verified_per_invoice_idx
  on public.payments (invoice_id)
  where state = 'verified';

create table public.telegraph_calls (
  id uuid primary key default gen_random_uuid(),
  action_key text not null check (char_length(action_key) between 1 and 160),
  invoice_id uuid references public.invoices(id) on delete restrict,
  quote_id uuid references public.quotes(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  intent text not null check (intent in ('CURRENCY_EXCHANGE', 'ONCHAIN_TX_LOOKUP')),
  miner_id text not null check (char_length(miner_id) between 1 and 100),
  miner_name text not null check (char_length(miner_name) between 1 and 120),
  attempt_role text not null check (attempt_role in ('primary', 'backup')),
  status text not null check (
    status in ('started', 'rejected_budget', 'paid_success', 'paid_invalid', 'paid_error', 'unpaid_error')
  ),
  request_sanitized jsonb not null default '{}'::jsonb,
  response_raw jsonb,
  error_code text,
  error_message text,
  x402_network text,
  x402_amount_units bigint check (
    x402_amount_units is null
    or x402_amount_units between 0 and 9007199254740991
  ),
  x402_transaction text,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (action_key, attempt_role)
);

alter table public.quotes
  add constraint quotes_telegraph_call_fk
  foreign key (telegraph_call_id) references public.telegraph_calls(id) on delete restrict;

alter table public.payments
  add constraint payments_verification_call_fk
  foreign key (verification_call_id) references public.telegraph_calls(id) on delete restrict;

create index telegraph_calls_created_idx
  on public.telegraph_calls (created_at desc);
create index telegraph_calls_invoice_idx
  on public.telegraph_calls (invoice_id, created_at desc)
  where invoice_id is not null;
create index telegraph_calls_payment_idx
  on public.telegraph_calls (payment_id, created_at desc)
  where payment_id is not null;

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (
    event_name in (
      'landing_view',
      'creator_signed_in',
      'invoice_created',
      'invoice_viewed',
      'invoice_shared',
      'invoice_cancelled',
      'quote_requested',
      'quote_ready',
      'payment_started',
      'payment_submitted',
      'verification_requested',
      'payment_verified',
      'receipt_viewed'
    )
  ),
  invoice_id uuid references public.invoices(id) on delete restrict,
  creator_user_id uuid references auth.users(id) on delete set null,
  actor_wallet_hash text,
  anonymous_session_hash text,
  network_hash text,
  traffic_source text not null default 'unknown'
    check (traffic_source in ('internal', 'recruited', 'organic', 'unknown')),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index usage_events_name_occurred_idx
  on public.usage_events (event_name, occurred_at desc);
create index usage_events_invoice_idx
  on public.usage_events (invoice_id, occurred_at desc)
  where invoice_id is not null;

create function public.prevent_invoice_commercial_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if row(
    new.public_id,
    new.creator_user_id,
    new.creator_wallet,
    new.freelancer_name,
    new.client_reference,
    new.description,
    new.currency,
    new.amount_minor,
    new.minor_unit_decimals,
    new.recipient_wallet,
    new.due_date,
    new.created_at
  ) is distinct from row(
    old.public_id,
    old.creator_user_id,
    old.creator_wallet,
    old.freelancer_name,
    old.client_reference,
    old.description,
    old.currency,
    old.amount_minor,
    old.minor_unit_decimals,
    old.recipient_wallet,
    old.due_date,
    old.created_at
  ) then
    raise exception 'Published invoice commercial fields are immutable';
  end if;

  return new;
end;
$$;

create trigger invoices_preserve_commercial_fields
before update on public.invoices
for each row execute function public.prevent_invoice_commercial_update();

create function public.prevent_payment_identity_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if row(new.invoice_id, new.quote_id, new.tx_hash, new.submitted_by_wallet, new.submitted_at)
    is distinct from
    row(old.invoice_id, old.quote_id, old.tx_hash, old.submitted_by_wallet, old.submitted_at)
  then
    raise exception 'Payment identity fields are immutable';
  end if;

  return new;
end;
$$;

create trigger payments_preserve_identity
before update on public.payments
for each row execute function public.prevent_payment_identity_update();
