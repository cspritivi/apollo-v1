-- =============================================================================
-- SAVED FABRICS (Bookmarks / Favorites)
--
-- ARCHITECTURAL DECISION: Junction table (Option A) instead of:
-- - Array column on profiles: Can't enforce FK integrity, no timestamps on
--   individual saves, hard to query in reverse ("who saved this fabric?").
-- - Polymorphic bookmarks table: Can't use FK constraints when item_id points
--   to different tables depending on item_type. Loses referential integrity.
-- - Collections model (Instagram-style): Over-engineering for ~20 fabrics.
--   Customers are bookmarking a handful while deciding on a suit, not
--   curating hundreds of saves into folders.
--
-- The junction table is the standard relational answer to many-to-many
-- relationships. If collections are ever needed, this evolves naturally:
-- add a collections table and a nullable collection_id FK here.
--
-- Run this in the Supabase SQL Editor after init_schema.sql and rls_policies.sql.
-- =============================================================================

-- Junction table linking users to their saved/bookmarked fabrics.
-- The UNIQUE constraint prevents double-saves at the database level —
-- the app doesn't need to check "is this already saved?" before inserting.
create table public.saved_fabrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  fabric_id uuid not null references public.fabrics(id) on delete cascade,
  created_at timestamptz not null default now(),

  -- Composite unique constraint: a user can save a fabric only once.
  -- Named explicitly for clarity in error messages if violated.
  constraint unique_user_fabric unique (user_id, fabric_id)
);

-- Index for the most common query: "fetch all saved fabrics for this user".
-- The unique constraint already creates an index on (user_id, fabric_id),
-- but this single-column index is more efficient for the user-only lookup
-- since Postgres can use it without scanning the fabric_id portion.
create index idx_saved_fabrics_user_id on public.saved_fabrics(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- Users can only see and manage their own saved fabrics.
-- =============================================================================

alter table public.saved_fabrics enable row level security;

-- Users can read their own saved fabrics
create policy "Users can read own saved fabrics"
  on public.saved_fabrics for select
  using (auth.uid() = user_id);

-- Users can save fabrics (insert)
create policy "Users can insert own saved fabrics"
  on public.saved_fabrics for insert
  with check (auth.uid() = user_id);

-- Users can unsave fabrics (delete).
-- WHY DELETE AND NOT UPDATE: Saves are binary — a fabric is either saved or
-- not. There's no state to update. Removing a save means deleting the row,
-- which is cleaner than a soft-delete flag on a junction table.
create policy "Users can delete own saved fabrics"
  on public.saved_fabrics for delete
  using (auth.uid() = user_id);
