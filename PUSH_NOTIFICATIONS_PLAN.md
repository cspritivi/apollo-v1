# Plan: Push notifications for order status changes (#21)

## Implementation status

**Code lane — complete (14 atomic commits on `feat/push-notifications-21`):**

- [x] Migration SQL written (`supabase/migrations/create_push_tokens_table.sql`)
- [x] `expo-notifications` + `expo-device` installed, config plugin wired
- [x] `src/lib/notifications.ts` utilities + 11 unit tests
- [x] `src/features/notifications/{api,hooks}.ts` + 6 unit tests
- [x] `src/hooks/usePushNotifications.ts` orchestrator + 9 component tests
- [x] Root layout wiring (`app/_layout.tsx`)
- [x] Sign-out token cleanup (`src/features/auth/api.ts`)
- [x] Edge Function + README (`supabase/functions/notify-order-status/`)
- [x] `google-services.json` added + `googleServicesFile` reference in
      `app.config.ts` (required for FirebaseApp initialization)
- [x] `addPushTokenListener` filtered to skip raw FCM tokens — only
      upserts `ExponentPushToken[...]` format (raw platform tokens would
      create unusable rows; discovered during emulator testing)
- [x] Edge Function fetch wrapped in try/catch for network resilience
- [x] `tsc --noEmit` clean, `test:logic` 135/135, `test:components` 117/117

**Environment lane — completed:**

1. ~~Apply the migration~~ — done via Supabase SQL editor.
2. ~~Deploy the Edge Function~~ — done via `npx supabase functions deploy`.
3. ~~Configure the Database Webhook~~ — done in Supabase dashboard. Used
   "Supabase Edge Function" type (auto-includes `old_record` for UPDATEs).
4. ~~Firebase setup~~ — Firebase project created, `google-services.json`
   downloaded and committed, FCM V1 Service Account Key uploaded to Expo
   via `eas credentials`.

**Server-side verified (via Edge Function logs):**

- [x] Webhook fires on status change with correct `old_record`/`record`.
- [x] Status diff detection works (`READY_FOR_TRIAL → TRIAL_COMPLETE`, etc.).
- [x] Product + fabric enrichment works ("Your Black Wool Crepe Two-Piece Suit: ...").
- [x] Token fetch returns the correct `ExponentPushToken[...]`.
- [x] Expo Push API returns `status: "ok"` with a ticket ID — delivery
      accepted by Expo and forwarded to FCM.

**Remaining — device verification (two phases):**

The Android emulator (Pixel 9, API 36, Google Play image) successfully
registered an Expo push token and the server pipeline works end-to-end
(ticket `status: "ok"`), but FCM did not deliver the notification to
the emulator. This is a known emulator limitation — FCM delivery is
unreliable on some emulator images.

**Phase 1 — iOS simulator (requires MacBook + Xcode):**

Verifies notification *handling* logic without needing APNs or Apple
Developer enrollment. Use `xcrun simctl push` to inject notifications.

1. Build iOS dev client: `npm run build:dev:ios`.
2. Log in on simulator → confirm registration silently no-ops (no crash,
   no `push_tokens` row created).
3. Create `payload.apns` with the Edge Function's payload format
   (`data.url: "/order-detail?orderId=..."`) and push via
   `xcrun simctl push booted com.apollo.tailor payload.apns`.
4. **Warm-start tap routing:** app is open → send push → tap → verify
   navigation to order detail screen.
5. **Cold-start tap routing:** kill app → send push → tap → verify app
   launches and navigates to order detail screen.
6. Sign out → confirm no crash (no-op path, no token row to delete).

**Phase 2 — physical Android device (blocked until device available):**

Verifies the full end-to-end delivery pipeline (webhook → Edge Function
→ Expo Push API → FCM → device).

1. Install the dev client APK on a physical Android phone.
2. Log in → confirm `push_tokens` row appears in Supabase.
3. Change an order's `current_status` in the dashboard → notification
   should appear on the device.
4. Tap the notification (warm-start + cold-start) → app opens on the
   order detail screen.
5. Foreground notification: trigger status change while app is open →
   verify banner/list/sound matches `setNotificationHandler` config.
6. Sign out → confirm `push_tokens` row is deleted.
7. Point a stale token at a status change → confirm
   `DeviceNotRegistered` cleanup deletes the row.

**PR plan:** Open the PR against `main` with `Closes #21` after Phase 1
is complete. Phase 2 verification tracked as a follow-up GitHub issue
linked from the PR body.

Everything below this point is the original plan, preserved for reference.

---

## Context

Customers currently only learn that their order status has changed by
opening the app and looking at the order detail screen. The tailor wants
to proactively notify them ("Your suit is ready for trial", "Your order
has been delivered") so customers feel kept-in-the-loop and don't miss
critical lifecycle events (e.g. trial appointments).

Order status changes happen exclusively in the Supabase dashboard
(service role) — RLS blocks customer writes (`rls_policies.sql`) and
`src/features/orders/api.ts` has no `updateOrder` function. So the
notification trigger MUST be server-side: a Supabase database webhook on
`orders` UPDATE → Edge Function → Expo Push API → device.

## Decisions (already confirmed with user)

- **Platforms:** Android end-to-end. iOS handling-only — token
  registration safely no-ops without APNs creds, but notification tap →
  deep-link routing still works so iOS can be tested via
  `xcrun simctl push <device> com.apollo.tailor payload.apns`.
- **Token storage:** new `push_tokens` table (FK to `profiles`), one row
  per device, retire stale tokens.
- **Permission timing:** request on first authenticated session. Initial
  scope = direct OS prompt; in-app explainer is a follow-up.
- **Scope:** orders only this PR. Alteration notifications follow-up.

## Architecture

```
[Tailor moves status in Supabase dashboard]
          │
          ▼
    UPDATE on orders
          │
          ▼  (Supabase Database Webhook)
   Edge Function: notify-order-status
   ├─ diff record vs old_record on current_status
   ├─ build contextual message (status + product/fabric)
   ├─ fetch tokens for orders.profile_id
   ├─ POST batch to Expo Push API
   └─ on DeviceNotRegistered → delete dead token
          │
          ▼
   Expo Push relay → APNs/FCM → device
          │
          ▼
   Notification displayed (foreground / background)
   tap → app opens → router.push("/order-detail?orderId=…")
```

## Files to create / modify

### Dependencies (1)
- `package.json` — add `expo-notifications` + `expo-device` (matched to
  Expo SDK 54). `npx expo install` to pin compatible versions.

### App config (1)
- `app.config.ts` — add `expo-notifications` config plugin to `plugins`
  array with Android channel config (icon, color, sound). Bundle IDs and
  EAS projectId already present.

### Client code (5 new + 3 modified)
- `src/lib/notifications.ts` — pure utilities:
  - `setNotificationHandler()` — foreground display behaviour.
  - `ensureAndroidChannel()` — `Notifications.setNotificationChannelAsync("default", { ... })`
    on Android only; runs at hook init. Required for consistent Android
    behaviour — the config plugin alone is not sufficient (per Expo SDK
    54 docs).
  - `requestPermissionAndGetToken()` — guarded permission request +
    `Notifications.getExpoPushTokenAsync({ projectId })`. Returns
    `{ token, platform }` or `null` (denied / simulator / iOS without
    APNs). Uses `Device.isDevice` guard.
  - `parseDeepLinkFromNotification(response)` — returns a structured
    `{ pathname: "/order-detail", params: { orderId: string } } | null`
    rather than a raw path string. Validates against an allow-list of
    known pathnames; unknown / malformed payloads return `null` so the
    hook can simply skip routing. Eliminates stringly-typed
    `router.push("/some?garbage=...")` paths and makes the test surface
    obvious.
- `src/features/notifications/api.ts` — Supabase calls:
  - `upsertPushToken({ profileId, token, platform })` — insert or
    update by `(profile_id, token)` unique constraint, bumps
    `last_seen_at`. Idempotent — logging in twice on the same device
    must not create a duplicate row (relies on the `token UNIQUE`
    constraint and `ON CONFLICT (token) DO UPDATE`).
  - `deletePushToken(token)` — called from the auth layer on sign out.
- `src/features/notifications/hooks.ts` — React Query mutation hooks
  mirroring `useCreateOrder` style.
- `src/hooks/usePushNotifications.ts` — orchestrator:
  - On `session` becoming truthy: ensure Android channel, request
    permission, register token. Permission denied path is **silent and
    non-blocking** — never throws into the render tree.
  - Subscribes to `Notifications.addNotificationResponseReceivedListener`
    for warm-start tap routing.
  - **Cold-start handling:** on mount, calls
    `Notifications.getLastNotificationResponseAsync()` (or
    `useLastNotificationResponse()`) and routes once if present. Tracks a
    `handledRef` so the same response isn't re-routed on re-render.
  - **Token rolls during a session:** subscribes via
    `Notifications.addPushTokenListener()` and re-upserts on roll. A
    session-change-only trigger would miss tokens that change while the
    app is open.
  - Routes via `router.push("/order-detail?orderId=…")` — see the route
    decision below.
  - Returns nothing — pure side-effect hook.
- `app/_layout.tsx` (modify) — call `setNotificationHandler()` once at
  module top (before component fn), call `usePushNotifications()` after
  `useSession()` resolves.
- `src/features/auth/api.ts` (modify) — wrap the existing `signOut`
  call so it first **best-effort** deletes the current device's token
  (try/catch swallow — offline / 4xx must not block logout). The
  authoritative cleanup is server-side (Edge Function pruning of
  `DeviceNotRegistered` tokens + future `last_seen_at` pruning).
- `src/features/auth/hooks.ts` (modify only if signOut isn't already
  exported via this layer — confirm during impl). The screen at
  `app/(app)/(tabs)/(profile)/index.tsx` should NOT call
  `deletePushToken` directly — putting it behind the auth abstraction
  ensures any future second sign-out entrypoint inherits the cleanup.

### Supabase (3 new)
- `supabase/migrations/create_push_tokens_table.sql`:
  ```sql
  create table public.push_tokens (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    token text not null unique,
    platform text not null check (platform in ('ios', 'android')),
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now()
  );
  create index push_tokens_profile_id_idx on public.push_tokens(profile_id);

  alter table public.push_tokens enable row level security;

  create policy "Customers read own push tokens"
    on public.push_tokens for select using (auth.uid() = profile_id);
  create policy "Customers insert own push tokens"
    on public.push_tokens for insert with check (auth.uid() = profile_id);
  -- UPDATE has both USING (which row image is visible/affected) and
  -- WITH CHECK (what the new row image must satisfy) so a client can't
  -- update a row they own and silently re-parent it to another user.
  create policy "Customers update own push tokens"
    on public.push_tokens for update
    using (auth.uid() = profile_id)
    with check (auth.uid() = profile_id);
  create policy "Customers delete own push tokens"
    on public.push_tokens for delete using (auth.uid() = profile_id);
  ```
  (Service role — used by the Edge Function — bypasses RLS.)

  **Semantics note (intentional tradeoff):** the table is really
  "one row per push token / device installation", not "one row per
  physical device". Expo may reuse the same token across logins on the
  same device, so `ON CONFLICT (token) DO UPDATE` reassigns ownership to
  whichever user most recently registered. Acceptable for this PR — the
  expected case is one customer per device. If we ever need true device
  semantics (audit history, multi-user shared device), introduce a
  `device_id` and a composite uniqueness key in a later migration.

- `supabase/functions/notify-order-status/index.ts` — Deno Edge Function:
  - Receives webhook body `{ type: "UPDATE", record, old_record, ... }`.
  - Skip if `record.current_status === old_record.current_status`.
  - Build contextual message from status using a lookup map keyed on the
    `OrderStatus` literal values (duplicated as a small const map in the
    function — Deno can't import from `src/`). Joins `products` +
    `fabrics` via service-role Supabase client to enrich body
    (e.g. "Your Navy Wool Suit is ready for trial").
  - Fetches `push_tokens` for `record.profile_id`.
  - POSTs to `https://exp.host/--/api/v2/push/send` with batch payload.
    `data.url` uses the **stable public route** matching the existing
    profile screen route name (`/order-detail?orderId=...`) — NOT the
    full route-group path. The screen is registered as `order-detail` in
    `app/(app)/(tabs)/(profile)/_layout.tsx` and other call sites
    already use this short path; matching them keeps deep links robust
    to route-group reorganization.
    ```json
    [{ "to": "ExponentPushToken[…]", "title": "...", "body": "...",
       "data": { "url": "/order-detail?orderId=..." } }]
    ```
  - **Ticket-level cleanup (this PR):** when the Push API response
    contains a ticket with `status: "error"` and
    `details.error: "DeviceNotRegistered"`, delete that token row
    immediately. Receipt polling (the authoritative late-failure check
    documented by Expo) is a deliberate follow-up issue — note in the
    function README.

- `supabase/functions/notify-order-status/README.md` — deploy + webhook
  setup. **Be precise** — there is no `supabase/config.toml` or other
  function scaffolding in this repo today, so a fresh environment will
  not be reproducible from git alone. Document:
  - `npx supabase functions deploy notify-order-status`
  - Exact webhook config: Database → Webhooks → New webhook on
    `public.orders`, event = UPDATE, HTTP POST to function URL, header
    `Authorization: Bearer <service_role>`, **payload MUST include
    previous row** (Supabase webhook UI: "Send previous row data" /
    `old_record`). The function depends on `old_record.current_status`
    to detect a status change — without it, every UPDATE (including
    notes edits) would notify.
  - Required Edge Function env vars: `SUPABASE_URL`,
    `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase),
    `EXPO_ACCESS_TOKEN` (optional but recommended for higher rate limits).
  - Follow-up note: scaffolding `supabase/config.toml` for full
    reproducibility is tracked separately.

### Assets (1 new)
- `assets/notification-icon.png` — 96x96, all white on transparent
  background, per Expo notifications config plugin requirements. The
  current launcher icons (`adaptiveIcon`) are not suitable — Android
  silhouettes anything non-white-on-transparent. Reference path goes
  into the `expo-notifications` plugin entry in `app.config.ts`.

### Tests (4 new)
- `src/lib/__tests__/notifications.test.ts` (logic config) — unit tests
  for `parseDeepLinkFromNotification` (valid + malformed/unknown URL
  ignored), simulator/iOS guard returning null from
  `requestPermissionAndGetToken`.
- `src/features/notifications/__tests__/api.test.ts` (logic config) —
  mocked Supabase client tests for upsert (idempotent — same token twice
  doesn't duplicate), delete.
- `src/hooks/__tests__/usePushNotifications.test.tsx` (**components
  config** — `.tsx` because hooks under React Query render through a
  provider; mirrors `src/features/alterations/__tests__/hooks.test.tsx`).
  Asserts:
  - registration mutation fires when session arrives,
  - permission-denied path is silent (no thrown errors),
  - warm-start response listener is wired and routes via `router.push`,
  - cold-start: when `getLastNotificationResponseAsync` resolves with a
    response, route is fired once,
  - `addPushTokenListener` re-upserts on token roll,
  - listeners cleaned up on unmount.
- Edge Function: no Deno test suite in this repo. Verify manually
  (curl the deployed function with a fake webhook payload). Document
  this in the function's README. Follow-up issue if we want a Deno
  test runner added.

### Reuse from existing code
- `useSession` (`src/hooks/useSession.ts`) — drives the registration trigger.
- `OrderStatus` enum in `src/types` — keyed lookup for messages on both
  client (already used) and Edge Function (import from a small
  duplicated literal map; the function runs in Deno and can't import
  from `src/`).
- Mutation pattern from `src/features/orders/hooks.ts:useCreateOrder`.
- Toast / router patterns already wired in `app/(app)/_layout.tsx`.
- Migration naming convention matches existing files in
  `supabase/migrations/` (snake_case verb_noun).

## Permission flow (initial scope)

```
session arrives  →  Notifications.getPermissionsAsync()
  ├─ undetermined → requestPermissionsAsync() → OS prompt
  ├─ granted      → getExpoPushTokenAsync → upsertPushToken
  └─ denied       → no-op (user re-enables in OS settings)
```

Direct OS prompt only. In-app explainer (which lifts opt-in materially)
is a deliberate follow-up — keeps this PR focused.

## TDD order

1. Migration SQL — apply locally, verify table + RLS work.
2. `notifications.ts` utilities — write tests, implement, all green.
3. `api.ts` upsert/delete — write tests, implement.
4. `usePushNotifications` hook — write tests, implement.
5. Wire into `app/_layout.tsx`. Manual verify Android emulator: install
   dev client, log in → token row appears in `push_tokens`.
6. Edge Function — write, deploy to Supabase project, configure DB
   webhook in dashboard. Manual verify: change a test order's status
   in dashboard → notification arrives on Android emulator.
7. Sign-out token cleanup — wire + manual verify row is deleted.

## Verification

- Logic tests: `npm run test:logic` — all green, new tests included.
- Component tests: `npm run test:components` — green.
- Typecheck: `npx tsc --noEmit` clean.
- Manual Android (full E2E):
  - Build dev client: `npm run build:dev:android` (or use existing).
  - Log in fresh user → grant permission → confirm row in `push_tokens`.
  - Change order status in Supabase dashboard → notification appears.
  - **Foreground behaviour:** with the app open and visible, trigger
    another status change. Verify the foreground display matches what
    `setNotificationHandler` declares (banner + list + sound vs.
    suppressed). Document the chosen behaviour in
    `src/lib/notifications.ts`.
  - Tap notification (cold start AND warm start) → app opens to that
    order's detail screen.
  - Sign out → confirm `push_tokens` row deleted.
- Manual iOS (handling only, simulator):
  - `xcrun simctl push booted com.apollo.tailor payload.apns` with a
    payload whose `data.url` points to an order detail route.
  - Verify the tap routes correctly.
  - Confirm registration silently no-ops (no crash, no token row).

## Out of scope (follow-up issues)

- Alteration status notifications (same Edge Function pattern; new webhook).
- In-app permission explainer modal before OS prompt.
- iOS production delivery (blocked on Apple Developer Program enrollment).
- **Receipt polling for late-failure cleanup** — only ticket-level
  cleanup this PR. Document in function README.
- **`supabase/config.toml` + Supabase CLI scaffolding** for full
  reproducibility of the function + webhook from git. Tracked separately.
- **`last_seen_at`-based token pruning job** — bump the field on every
  upsert this PR; reaper job is a follow-up.
- **Webhook idempotency / duplicate-delivery dedup** — see acceptance
  criteria. Adding a short-lived dedup window is a follow-up.
- Universal links / `https://` deep linking (#40).
- Notification preferences UI (mute specific status types).
- Broadcast notifications (#10) — different pattern (admin pushes to
  all customers vs. webhook on row change).

## Acceptance criteria

Legend: **[code]** = satisfied by merged code (tests cover it).
**[phase1]** = verifiable on iOS simulator with `xcrun simctl push`.
**[phase2]** = requires physical Android device.

- [x] **[code]** `push_tokens` migration written with RLS policies. **[env]**
      Table actually created in Supabase.
- [ ] **[phase2]** On Android, fresh login triggers permission prompt and
      inserts a row.
- [x] **[code]** Logging in twice on the same device does not create
      duplicate token rows (test in `api.test.ts` asserts
      `onConflict: "token"`).
- [x] **[code]** Permission denied path is silent and non-blocking (tested
      in both `notifications.test.ts` and `usePushNotifications.test.tsx`).
- [ ] **[phase2]** Status change in Supabase dashboard delivers a contextual
      push notification on Android within seconds.
- [x] **[code]** Cold-start tap routing wired with a `handledRef` latch
      (tested). **[phase1]** Verify end-to-end via `xcrun simctl push`
      (kill app, tap notification).
- [x] **[code]** Unknown or malformed `data.url` is ignored safely
      (`parseDeepLinkFromNotification` returns null; tested).
- [ ] **[phase1]** On iOS simulator, registration silently no-ops and
      `xcrun simctl push` tap routes correctly (warm-start + cold-start).
- [x] **[code]** Edge Function deletes any token returning
      `DeviceNotRegistered` at the ticket level. **[phase2]** Verify once
      deployed by pointing a stale token at an order status change.
- [x] **[code]** Sign out removes the current device's token via the auth
      abstraction; failure does not block logout (try/catch swallow).
      **[phase1]** Verify no crash on simulator (no-op path).
      **[phase2]** Verify row is actually deleted from Supabase.
- [x] **[code]** In-session token roll re-upserts via
      `addPushTokenListener` (tested).
- [x] **[code]** Webhook duplicate-delivery dedup is out of scope this PR
      and documented in the function README as a follow-up.
- [x] **[code]** Foreground notification behaviour is declared in
      `setNotificationHandler` (banner + list + sound) and documented
      inline. **[phase2]** Verify the declared behaviour matches what the
      OS actually renders.
- [x] **[code]** Logic + component test suites pass; typecheck clean.
