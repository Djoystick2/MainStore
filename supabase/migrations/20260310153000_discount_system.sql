begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'discount_scope') then
    create type public.discount_scope as enum ('product', 'category', 'collection');
  end if;

  if not exists (select 1 from pg_type where typname = 'discount_type') then
    create type public.discount_type as enum ('fixed', 'percentage');
  end if;
end
$$;

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  scope public.discount_scope not null,
  target_id uuid not null,
  type public.discount_type not null,
  title text not null,
  value numeric(12, 2) not null,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discounts_unique_scope_target unique (scope, target_id),
  constraint discounts_value_non_negative_chk check (value >= 0),
  constraint discounts_percentage_value_chk check (
    type <> 'percentage' or value <= 100
  ),
  constraint discounts_schedule_chk check (
    starts_at is null or ends_at is null or starts_at <= ends_at
  )
);

create index if not exists idx_discounts_scope_target
  on public.discounts (scope, target_id);

create index if not exists idx_discounts_active_window
  on public.discounts (is_active, starts_at, ends_at);

drop trigger if exists trg_discounts_set_updated_at on public.discounts;
create trigger trg_discounts_set_updated_at
before update on public.discounts
for each row execute function public.set_updated_at();

alter table public.discounts enable row level security;

drop policy if exists discounts_public_read_active on public.discounts;
create policy discounts_public_read_active
on public.discounts
for select
to anon, authenticated
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

drop policy if exists discounts_admin_manage on public.discounts;
create policy discounts_admin_manage
on public.discounts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;
