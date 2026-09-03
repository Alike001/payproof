alter table public.usage_events
  drop constraint if exists usage_events_event_name_check;

alter table public.usage_events
  add constraint usage_events_event_name_check check (
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
      'payment_mismatch',
      'verification_unavailable',
      'receipt_viewed'
    )
  );

alter table public.usage_events
  add column dedupe_key text,
  add constraint usage_events_dedupe_key_format_check check (
    dedupe_key is null or dedupe_key ~ '^[0-9a-f]{64}$'
  );

alter table public.usage_events
  add constraint usage_events_dedupe_key_unique unique (dedupe_key);

create index usage_events_source_occurred_idx
  on public.usage_events (traffic_source, occurred_at desc);

comment on column public.usage_events.dedupe_key is
  'One-way server-generated key used to prevent refreshes/retries from inflating usage.';
