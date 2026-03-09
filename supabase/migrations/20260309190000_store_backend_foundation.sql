begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'product_status') then
    create type public.product_status as enum ('draft', 'active', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled'
    );
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'user',
  telegram_user_id bigint unique,
  display_name text,
  username text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_slug_format_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  slug text not null unique,
  title text not null,
  short_description text,
  description text,
  price numeric(12, 2) not null,
  compare_at_price numeric(12, 2),
  currency char(3) not null default 'USD',
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  stock_quantity integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_price_non_negative_chk check (price >= 0),
  constraint products_compare_price_chk check (
    compare_at_price is null or compare_at_price >= price
  ),
  constraint products_stock_quantity_non_negative_chk check (stock_quantity >= 0),
  constraint products_slug_format_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_images_sort_non_negative_chk check (sort_order >= 0)
);

create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint collection_items_unique_collection_product unique (collection_id, product_id),
  constraint collection_items_sort_non_negative_chk check (sort_order >= 0)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorites_unique_user_product unique (user_id, product_id)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_items_unique_user_product unique (user_id, product_id),
  constraint cart_items_quantity_positive_chk check (quantity > 0)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  status public.order_status not null default 'pending',
  subtotal_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  shipping_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  currency char(3) not null default 'USD',
  customer_display_name text,
  customer_username text,
  customer_phone text,
  shipping_address jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_subtotal_non_negative_chk check (subtotal_amount >= 0),
  constraint orders_discount_non_negative_chk check (discount_amount >= 0),
  constraint orders_shipping_non_negative_chk check (shipping_amount >= 0),
  constraint orders_total_non_negative_chk check (total_amount >= 0)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  quantity integer not null,
  product_title text not null,
  product_slug text,
  product_image_url text,
  unit_price numeric(12, 2) not null,
  line_total numeric(12, 2) generated always as (round(unit_price * quantity, 2)) stored,
  currency char(3) not null default 'USD',
  created_at timestamptz not null default now(),
  constraint order_items_quantity_positive_chk check (quantity > 0),
  constraint order_items_unit_price_non_negative_chk check (unit_price >= 0)
);

create index if not exists idx_profiles_telegram_user_id
  on public.profiles (telegram_user_id);

create index if not exists idx_categories_is_active
  on public.categories (is_active);

create index if not exists idx_collections_is_active
  on public.collections (is_active);

create index if not exists idx_products_status
  on public.products (status);

create index if not exists idx_products_category_id
  on public.products (category_id);

create index if not exists idx_products_is_featured_active
  on public.products (is_featured)
  where status = 'active';

create index if not exists idx_product_images_product_sort
  on public.product_images (product_id, sort_order, created_at);

create unique index if not exists idx_product_images_primary_per_product
  on public.product_images (product_id)
  where is_primary = true;

create index if not exists idx_collection_items_collection_sort
  on public.collection_items (collection_id, sort_order);

create index if not exists idx_collection_items_product_id
  on public.collection_items (product_id);

create index if not exists idx_favorites_user_id
  on public.favorites (user_id, created_at desc);

create index if not exists idx_favorites_product_id
  on public.favorites (product_id);

create index if not exists idx_cart_items_user_id
  on public.cart_items (user_id, updated_at desc);

create index if not exists idx_cart_items_product_id
  on public.cart_items (product_id);

create index if not exists idx_orders_user_id_created_at
  on public.orders (user_id, created_at desc);

create index if not exists idx_orders_status
  on public.orders (status);

create index if not exists idx_order_items_order_id
  on public.order_items (order_id);

create index if not exists idx_order_items_product_id
  on public.order_items (product_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_set_updated_at on public.categories;
create trigger trg_categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_collections_set_updated_at on public.collections;
create trigger trg_collections_set_updated_at
before update on public.collections
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_set_updated_at on public.products;
create trigger trg_products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_product_images_set_updated_at on public.product_images;
create trigger trg_product_images_set_updated_at
before update on public.product_images
for each row execute function public.set_updated_at();

drop trigger if exists trg_cart_items_set_updated_at on public.cart_items;
create trigger trg_cart_items_set_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.collection_items enable row level security;
alter table public.favorites enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_insert_self_or_admin on public.profiles;
create policy profiles_insert_self_or_admin
on public.profiles
for insert
to authenticated
with check (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists profiles_delete_admin_only on public.profiles;
create policy profiles_delete_admin_only
on public.profiles
for delete
to authenticated
using (public.is_admin());

drop policy if exists categories_public_read_active on public.categories;
create policy categories_public_read_active
on public.categories
for select
to anon, authenticated
using (is_active = true);

drop policy if exists categories_admin_manage on public.categories;
create policy categories_admin_manage
on public.categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists collections_public_read_active on public.collections;
create policy collections_public_read_active
on public.collections
for select
to anon, authenticated
using (is_active = true);

drop policy if exists collections_admin_manage on public.collections;
create policy collections_admin_manage
on public.collections
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists products_public_read_active on public.products;
create policy products_public_read_active
on public.products
for select
to anon, authenticated
using (status = 'active');

drop policy if exists products_admin_manage on public.products;
create policy products_admin_manage
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists product_images_public_read_for_active_products on public.product_images;
create policy product_images_public_read_for_active_products
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.status = 'active'
  )
);

drop policy if exists product_images_admin_manage on public.product_images;
create policy product_images_admin_manage
on public.product_images
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists collection_items_public_read_active on public.collection_items;
create policy collection_items_public_read_active
on public.collection_items
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.collections c
    where c.id = collection_id
      and c.is_active = true
  )
  and exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.status = 'active'
  )
);

drop policy if exists collection_items_admin_manage on public.collection_items;
create policy collection_items_admin_manage
on public.collection_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists favorites_select_own_or_admin on public.favorites;
create policy favorites_select_own_or_admin
on public.favorites
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists favorites_insert_own_or_admin on public.favorites;
create policy favorites_insert_own_or_admin
on public.favorites
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists favorites_update_own_or_admin on public.favorites;
create policy favorites_update_own_or_admin
on public.favorites
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists favorites_delete_own_or_admin on public.favorites;
create policy favorites_delete_own_or_admin
on public.favorites
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists cart_items_select_own_or_admin on public.cart_items;
create policy cart_items_select_own_or_admin
on public.cart_items
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists cart_items_insert_own_or_admin on public.cart_items;
create policy cart_items_insert_own_or_admin
on public.cart_items
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists cart_items_update_own_or_admin on public.cart_items;
create policy cart_items_update_own_or_admin
on public.cart_items
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists cart_items_delete_own_or_admin on public.cart_items;
create policy cart_items_delete_own_or_admin
on public.cart_items
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists orders_select_own_or_admin on public.orders;
create policy orders_select_own_or_admin
on public.orders
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists orders_insert_own_or_admin on public.orders;
create policy orders_insert_own_or_admin
on public.orders
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists orders_update_own_or_admin on public.orders;
create policy orders_update_own_or_admin
on public.orders
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists orders_delete_own_or_admin on public.orders;
create policy orders_delete_own_or_admin
on public.orders
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists order_items_select_own_or_admin on public.order_items;
create policy order_items_select_own_or_admin
on public.order_items
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists order_items_insert_own_or_admin on public.order_items;
create policy order_items_insert_own_or_admin
on public.order_items
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists order_items_update_own_or_admin on public.order_items;
create policy order_items_update_own_or_admin
on public.order_items
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists order_items_delete_own_or_admin on public.order_items;
create policy order_items_delete_own_or_admin
on public.order_items
for delete
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.user_id = auth.uid()
  )
);

commit;
