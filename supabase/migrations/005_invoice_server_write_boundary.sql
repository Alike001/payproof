revoke insert, update on table public.invoices from authenticated;

drop policy if exists invoices_creator_insert on public.invoices;
drop policy if exists invoices_creator_cancel on public.invoices;
