-- Push tokens: one row per Expo push token registered on a device.
--
-- WHY A SEPARATE TABLE (not a column on profiles):
-- A single customer can install the app on multiple devices (phone, tablet).
-- We need a contextual push to reach every device the customer is logged in
-- on, so we store N tokens per profile in their own table.
--
-- SEMANTICS TRADEOFF:
-- The unique constraint is on `token`, not on `(profile_id, token)`. An Expo
-- token is bound to a device installation; if two different profiles log in
-- on the same device, the second login reassigns ownership via ON CONFLICT.
-- Acceptable for a single-customer-per-device assumption. True device-level
-- semantics would require a `device_id` column and composite uniqueness.

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for the Edge Function's hot path: fetch all tokens for a profile_id
-- when an order status change fires the webhook.
create index push_tokens_profile_id_idx on public.push_tokens(profile_id);

alter table public.push_tokens enable row level security;

-- RLS: customer can only see/manage their own tokens. The Edge Function uses
-- the service_role key which bypasses RLS for server-side pruning.
create policy "Customers read own push tokens"
  on public.push_tokens for select
  using (auth.uid() = profile_id);

create policy "Customers insert own push tokens"
  on public.push_tokens for insert
  with check (auth.uid() = profile_id);

-- UPDATE uses BOTH USING (which existing rows are visible/affected) and
-- WITH CHECK (what the resulting row image must satisfy). Without WITH CHECK,
-- a client could own a row then re-parent it to another user via UPDATE.
create policy "Customers update own push tokens"
  on public.push_tokens for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Customers delete own push tokens"
  on public.push_tokens for delete
  using (auth.uid() = profile_id);
