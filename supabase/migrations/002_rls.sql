alter table public.invoices enable row level security;
alter table public.quotes enable row level security;
alter table public.payments enable row level security;
alter table public.telegraph_calls enable row level security;
alter table public.usage_events enable row level security;

revoke all on table public.invoices from anon, authenticated;
revoke all on table public.quotes from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.telegraph_calls from anon, authenticated;
revoke all on table public.usage_events from anon, authenticated;

grant select, insert, update on table public.invoices to authenticated;
grant select on table public.quotes to authenticated;
grant select on table public.payments to authenticated;

create policy invoices_creator_select
on public.invoices
for select
to authenticated
using ((select auth.uid()) = creator_user_id);

create policy invoices_creator_insert
on public.invoices
for insert
to authenticated
with check (
  (select auth.uid()) = creator_user_id
  and creator_wallet = recipient_wallet
  and lifecycle = 'open'
  and cancelled_at is null
  and verified_at is null
);

create policy invoices_creator_cancel
on public.invoices
for update
to authenticated
using (
  (select auth.uid()) = creator_user_id
  and lifecycle = 'open'
)
with check (
  (select auth.uid()) = creator_user_id
  and lifecycle = 'cancelled'
  and cancelled_at is not null
  and verified_at is null
);

create policy quotes_creator_select
on public.quotes
for select
to authenticated
using (
  exists (
    select 1
    from public.invoices
    where invoices.id = quotes.invoice_id
      and invoices.creator_user_id = (select auth.uid())
  )
);

create policy payments_creator_select
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.invoices
    where invoices.id = payments.invoice_id
      and invoices.creator_user_id = (select auth.uid())
  )
);

revoke execute on function public.prevent_invoice_commercial_update() from public, anon, authenticated;
revoke execute on function public.prevent_payment_identity_update() from public, anon, authenticated;
