-- 1. PROFILES
  -- Links 1:1 with Supabase Auth. The id IS the auth user's UUID.
  create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    full_name text not null,
    phone text,
    preferred_unit text not null default 'INCHES'
      check (preferred_unit in ('INCHES', 'CENTIMETERS')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  -- 2. MEASUREMENTS
  -- A customer can have multiple saved measurement sets.
  create table public.measurements (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    label text not null,
    unit text not null default 'INCHES'
      check (unit in ('INCHES', 'CENTIMETERS')),
    chest numeric not null,
    waist numeric not null,
    hips numeric not null,
    shoulder_width numeric not null,
    sleeve_length numeric not null,
    shirt_length numeric not null,
    inseam numeric not null,
    outseam numeric not null,
    thigh numeric not null,
    neck numeric not null,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  -- 3. FABRICS
  -- Catalog of available fabrics. color_tags uses native Postgres text array
  -- for efficient @> containment queries (e.g., WHERE color_tags @> '{navy}').
  create table public.fabrics (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    image_url text not null,
    price_per_meter integer not null,
    color_tags text[] not null default '{}',
    available boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  -- 4. PRODUCTS
  -- Product types (Suit, Shirt, Pants). option_groups lists which configuration
  -- groups apply to this product (e.g., collar_style, cuff_style).
  create table public.products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    base_price integer not null,
    image_url text,
    option_groups text[] not null default '{}',
    available boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  -- 5. PRODUCT_OPTIONS
  -- Individual options within an option group (e.g., "Spread Collar" in collar_style).
  -- price_modifier allows premium options to add cost on top of the base price.
  create table public.product_options (
    id uuid primary key default gen_random_uuid(),
    option_group text not null,
    name text not null,
    description text,
    image_url text,
    price_modifier integer not null default 0,
    available boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  -- 6. ORDERS
  -- Core transaction entity. chosen_options and measurement_snapshot are JSONB
  -- snapshots to ensure order immutability — catalog changes won't alter history.
  -- product_id and fabric_id use RESTRICT to prevent accidental deletion of
  -- referenced catalog items that have existing orders.
  create table public.orders (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete restrict,
    fabric_id uuid not null references public.fabrics(id) on delete restrict,
    chosen_options jsonb not null,
    measurement_snapshot jsonb not null,
    current_status text not null default 'PLACED'
      check (current_status in (
        'PLACED', 'IN_PRODUCTION', 'READY_FOR_TRIAL',
        'TRIAL_COMPLETE', 'ALTERATIONS',
        'READY_FOR_DELIVERY', 'DELIVERED'
      )),
    status_history jsonb not null default '[]',
    final_price integer not null,
    customer_notes text,
    internal_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  -- 7. ALTERATIONS
  -- Post-delivery alteration requests. Separate from orders because the business
  -- logic, charge model, and lifecycle are distinct.
  create table public.alterations (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    profile_id uuid not null references public.profiles(id) on delete cascade,
    description text not null,
    status text not null default 'REQUESTED'
      check (status in (
        'REQUESTED', 'IN_PROGRESS', 'READY_FOR_PICKUP',
        'COMPLETED', 'CANCELLED'
      )),
    charge_amount integer not null,
    image_urls text[],
    customer_notes text,
    internal_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz
  );

  -- ============================================================================
  -- INDEXES
  -- These speed up the most common query patterns in the app.
  -- ============================================================================

  -- Lookup measurements by customer
  create index idx_measurements_profile_id on public.measurements(profile_id);

  -- Filter fabrics by availability (catalog browsing)
  create index idx_fabrics_available on public.fabrics(available);

  -- Filter products by availability
  create index idx_products_available on public.products(available);

  -- Filter product options by group (configurator screen loads one group at a time)
  create index idx_product_options_group on public.product_options(option_group);

  -- Lookup orders by customer (order history screen)
  create index idx_orders_profile_id on public.orders(profile_id);

  -- Filter orders by status (tailor dashboard filtering)
  create index idx_orders_current_status on public.orders(current_status);

  -- Lookup alterations by order and by customer
  create index idx_alterations_order_id on public.alterations(order_id);
  create index idx_alterations_profile_id on public.alterations(profile_id);

  -- ============================================================================
  -- UPDATED_AT TRIGGER
  -- Automatically sets updated_at to now() on every row update, so the app
  -- never needs to manually pass this value.
  -- ============================================================================

  create or replace function public.handle_updated_at()
  returns trigger as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$ language plpgsql;

  -- Apply the trigger to every table with an updated_at column
  create trigger set_updated_at before update on public.profiles
    for each row execute function public.handle_updated_at();

  create trigger set_updated_at before update on public.measurements
    for each row execute function public.handle_updated_at();

  create trigger set_updated_at before update on public.fabrics
    for each row execute function public.handle_updated_at();

  create trigger set_updated_at before update on public.products
    for each row execute function public.handle_updated_at();

  create trigger set_updated_at before update on public.product_options
    for each row execute function public.handle_updated_at();

  create trigger set_updated_at before update on public.orders
    for each row execute function public.handle_updated_at();

  create trigger set_updated_at before update on public.alterations
    for each row execute function public.handle_updated_at();
