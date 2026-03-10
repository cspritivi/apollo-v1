
  -- ============================================================================
  -- ROW LEVEL SECURITY POLICIES
  --
  -- These policies ensure customers can only access their own data.
  -- The tailor/admin uses the Supabase dashboard (service role key) which
  -- bypasses RLS entirely, so no admin policies are needed.
  --
  -- IMPORTANT: Supabase disables RLS by default on new tables. We must
  -- explicitly enable it — without this, any authenticated user can read
  -- and modify ALL rows in the table.
  -- ============================================================================

  -- ============================================================================
  -- 1. PROFILES
  -- Customers can read and update only their own profile.
  -- Insert happens automatically via a trigger (or during sign-up flow).
  -- ============================================================================

  alter table public.profiles enable row level security;

  -- Users can read their own profile
  create policy "Users can read own profile"
    on public.profiles for select
    using (auth.uid() = id);

  -- Users can update their own profile (name, phone, preferred_unit)
  create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

  -- Users can insert their own profile (during sign-up)
  create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

  -- ============================================================================
  -- 2. MEASUREMENTS
  -- Customers can CRUD only their own measurement sets.
  -- ============================================================================

  alter table public.measurements enable row level security;

  create policy "Users can read own measurements"
    on public.measurements for select
    using (auth.uid() = profile_id);

  create policy "Users can insert own measurements"
    on public.measurements for insert
    with check (auth.uid() = profile_id);

  create policy "Users can update own measurements"
    on public.measurements for update
    using (auth.uid() = profile_id);

  create policy "Users can delete own measurements"
    on public.measurements for delete
    using (auth.uid() = profile_id);

  -- ============================================================================
  -- 3. FABRICS (Catalog — read-only for customers)
  -- All authenticated users can browse. Only admin (via dashboard) can modify.
  -- ============================================================================

  alter table public.fabrics enable row level security;

  create policy "Authenticated users can read fabrics"
    on public.fabrics for select
    using (auth.role() = 'authenticated');

  -- ============================================================================
  -- 4. PRODUCTS (Catalog — read-only for customers)
  -- ============================================================================

  alter table public.products enable row level security;

  create policy "Authenticated users can read products"
    on public.products for select
    using (auth.role() = 'authenticated');

  -- ============================================================================
  -- 5. PRODUCT_OPTIONS (Catalog — read-only for customers)
  -- ============================================================================

  alter table public.product_options enable row level security;

  create policy "Authenticated users can read product options"
    on public.product_options for select
    using (auth.role() = 'authenticated');

  -- ============================================================================
  -- 6. ORDERS
  -- Customers can read their own orders and place new ones.
  -- Only the tailor (via dashboard) can update order status.
  -- Customers should NOT be able to update or delete orders.
  -- ============================================================================

  alter table public.orders enable row level security;

  create policy "Users can read own orders"
    on public.orders for select
    using (auth.uid() = profile_id);

  -- Customers can place orders. The with check ensures they can only
  -- create orders under their own profile_id.
  create policy "Users can insert own orders"
    on public.orders for insert
    with check (auth.uid() = profile_id);

  -- No update/delete policies for customers — status transitions are
  -- handled by the tailor via the Supabase dashboard (service role).

  -- ============================================================================
  -- 7. ALTERATIONS
  -- Customers can read their own alterations and request new ones.
  -- Status updates are handled by the tailor via dashboard.
  -- ============================================================================

  alter table public.alterations enable row level security;

  create policy "Users can read own alterations"
    on public.alterations for select
    using (auth.uid() = profile_id);

  -- Customers can request alterations on their own orders
  create policy "Users can insert own alterations"
    on public.alterations for insert
    with check (auth.uid() = profile_id);

  -- No update/delete policies for customers.
