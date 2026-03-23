# CLAUDE.md — Tailor App Project Bible

This file is read by Claude Code at the start of every session.
Keep it updated as the project evolves. It is the single source of truth
for architecture, conventions, and developer intent.

---

## What This App Is

A customer-facing mobile application for a custom tailoring business.
Customers can browse fabric and product catalogs, configure bespoke items
(suits, shirts, pants) with style choices (collar type, fabric, color, lining, etc.),
place orders, and track their order through the full tailoring lifecycle including
trials, alterations, and delivery. Post-delivery alterations are supported as
a separate chargeable workflow.

Target platforms: iOS and Android.
Primary users: Customers of the tailoring business.
Admin: The tailor manages all catalog data (fabrics, products, images) via
the Supabase dashboard directly — no custom admin panel is needed at this stage.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React Native + Expo (Expo Router) | Cross-platform iOS + Android, file-based routing, large job market |
| Language | TypeScript (strict mode) | Type safety, better tooling, industry standard at mid-level+ |
| Backend | Supabase | PostgreSQL + Auth + Storage + Realtime, less vendor lock-in than Firebase |
| Server State | TanStack React Query | Caching, deduplication, stale-while-revalidate for all server data |
| Client State | Zustand | Lightweight global state for cart, UI state — distinct from server state |
| Navigation | Expo Router | File-based routing (like Next.js), deeply integrated with React Native |
| Styling | NativeWind (Tailwind for React Native) | Utility-first, consistent design system |
| Version Control | Git + GitHub (GitHub Flow) | Feature branches, PRs, conventional commits |

**Node version:** See `.nvmrc` in repo root. Always use this version.

---

## Project Structure

```
/src
  /features               # Feature-based organization (not layer-based)
    /catalog              # Fabric and product browsing
    /configurator         # Style/option selection when building an order
    /orders               # Order placement, lifecycle tracking
    /measurements         # Customer measurement profiles
    /alterations          # Post-delivery alteration requests
    /auth                 # Login, profile, account
  /components             # Shared, reusable UI components (no business logic)
  /hooks                  # Shared custom hooks (e.g., useSupabaseQuery)
  /lib                    # Supabase client, utility functions, constants
  /types                  # Shared TypeScript interfaces and enums
  /stores                 # Zustand stores (cart, UI state)
```

**Why feature-based, not layer-based?**
Layer-based organisation (/screens, /services, /models) forces you to touch
4+ folders to add a single feature. Feature-based co-locates everything related
to "orders" in one place, making the codebase easier to navigate as it grows.
This is a deliberate architectural decision worth explaining in interviews.

---

## Data Model Overview

These are the core entities. Full SQL schema lives in `/supabase` (reference
copies — not managed by the Supabase CLI). TypeScript types live in `/src/types`.

SQL files in `/supabase` (run in this order):
1. `init_schema.sql` — All tables, indexes, `updated_at` trigger
2. `new_auths.sql` — Auto-create profile on auth signup trigger
3. `rls_policies.sql` — Row Level Security for all tables
4. `measurement_history.sql` — Audit trail table + trigger for measurements
5. `seed_fabrics.sql` — Synthetic fabric catalog data (20 entries)

### `profiles`
Customer account linked to Supabase Auth. Stores name, contact, and preferences.

### `measurements`
A customer's body measurements. A customer can have multiple saved measurement
sets (e.g., "current" vs "from 2023"). Always store the measurement snapshot
on the order itself at time of placement — measurements change over time.

### `fabrics`
Catalog of available fabrics. Includes name, description, image URL (from
Supabase Storage), price per meter, color tags, availability flag.

### `products`
Types of items that can be ordered: suits, shirts, pants, etc.
Each product has a list of configurable option groups (e.g., collar_style,
lining_color, button_type).

### `product_options`
The specific choices within each option group. E.g., collar_style has options:
spread, mandarin, button-down. Each option may have an image for visual reference.

### `orders`
The core transaction entity. Captures:
- Customer reference
- Product reference
- Chosen options (stored as a JSON snapshot — not live foreign keys —
  because options may change in the catalog over time but the order must
  be immutable)
- Fabric reference
- Measurement snapshot at time of order
- Current status (see Order Lifecycle below)
- Status history (array of {status, timestamp, note})

### `measurement_history`
Automatic audit trail for measurements. A trigger snapshots the old row
into this table before every update to `measurements`. Customers can view
their own history (via RLS); only the trigger and service role can write.

### `alterations`
Post-delivery alteration requests. Linked to a parent order. Has its own
description, status, charge amount, and timestamps. Modeled as a separate
table rather than reusing order states because the business logic and
charge model are distinct.

---

## Order Lifecycle

```
PLACED
  → IN_PRODUCTION
    → READY_FOR_TRIAL
      → TRIAL_COMPLETE
        → ALTERATIONS (if changes needed)
          → READY_FOR_DELIVERY
        → READY_FOR_DELIVERY (if no changes needed)
          → DELIVERED
            → (customer may initiate) ALTERATION_REQUESTED
              (handled via alterations table, not order status)
```

Every status transition must record: new status, timestamp, optional note.
This creates a full audit trail — customers can see exactly where their
order is and when it moved. This is modeled as a `status_history` JSONB
column on the orders table.

**Interview talking point:** This is a state machine. At scale you would
enforce valid transitions server-side (e.g., you cannot go from PLACED
directly to DELIVERED). Consider documenting valid transitions explicitly
in `/src/types/order.ts`.

---

## State Management Philosophy

This project draws a hard line between three types of state:

1. **Server state** (React Query) — anything that lives in Supabase.
   Orders, fabrics, products, measurements. Async, potentially stale,
   needs caching and invalidation.

2. **Global client state** (Zustand) — data the app owns locally that
   multiple components share. The active cart/configurator session,
   authentication state, UI flags.

3. **Local component state** (useState) — ephemeral UI state owned by
   a single component. Dropdown open/closed, form field values, etc.

Never use Zustand for data that should come from the server.
Never use React Query for purely local UI state.
Being able to explain this distinction clearly is a strong interview signal.

---

## Coding Conventions

### General
- All files in TypeScript. No `.js` files.
- Strict mode enabled in `tsconfig.json`. Fix type errors; do not use `any`.
- Functional components only. No class components.
- All async operations use `async/await`, not `.then()` chains.

### Comments — IMPORTANT
This project is being built as a learning exercise alongside professional
development. Comments serve two purposes: explaining *what* the code does,
and explaining *why* architectural or technical decisions were made.

**Every non-obvious piece of code must have a comment explaining:**
- What it does (briefly)
- Why this approach was chosen over alternatives
- Any tradeoffs the developer should understand

Examples of what should be commented:
- Why a Zustand store is used instead of passing props
- Why a measurement snapshot is stored on the order instead of a FK
- Why React Query's `staleTime` is set to a specific value
- Why a state machine transition is explicitly guarded

Comments are not optional boilerplate — they are a core part of this
codebase's purpose.

### Naming
- Components: `PascalCase.tsx` (e.g., `FabricCard.tsx`)
- Hooks: `useCamelCase.ts` (e.g., `useOrderStatus.ts`)
- Stores: `camelCaseStore.ts` (e.g., `cartStore.ts`)
- Types/interfaces: `PascalCase`, prefix interfaces with nothing (no `I`)
- Database query functions: `fetchX`, `createX`, `updateX`
- Enum values: `SCREAMING_SNAKE_CASE`

### Component structure (in order)
1. Imports
2. Type definitions local to this file
3. Component function
4. Styles (if using StyleSheet)
Each section separated by a single blank line.

### Supabase queries
All Supabase calls live in `/src/features/[feature]/api.ts` files.
Components never call Supabase directly — they use React Query hooks
that call these api files. This separation makes the data layer testable
and replaceable.

---

## Environment Variables

Stored in `.env.local` (never committed).
Types declared in `src/types/env.d.ts`.
Required variables:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Git Conventions

### Branch naming
```
feature/fabric-catalog-screen
feature/order-status-types
fix/measurement-form-validation
chore/setup-supabase-client
refactor/extract-order-state-machine
```

### Commit messages (Conventional Commits)
```
feat: add fabric detail modal
fix: correct measurement unit conversion
chore: set up React Query provider
refactor: extract order status logic into hook
docs: update CLAUDE.md with alteration workflow
```

The format is: `type: short description (imperative, lowercase)`
This makes the git log readable as documentation and enables
automated changelog generation. Interviewers recognise this pattern.

---

## What Claude Should Always Do

- **Follow TDD (Test-Driven Development) for all new features.** Write failing
  tests first, then implement the minimum code to make them pass, then refactor.
  This applies to stores, hooks, utilities, and any testable logic. Tests live
  co-located with the feature in a `__tests__/` directory (e.g.,
  `src/stores/__tests__/configuratorStore.test.ts`).
- Add comments explaining *why*, not just *what*, for every non-trivial decision
- Follow the feature-based folder structure without exception
- Use the TypeScript types in `/src/types` rather than defining inline types
- Put all Supabase queries in the appropriate `api.ts` file, never in components
- Use React Query for any data that comes from or goes to Supabase
- Follow the naming conventions above
- When implementing a state transition, reference the Order Lifecycle section
- After generating any non-trivial code, add a brief inline comment
  explaining the architectural choice made

## What Claude Should Never Do

- Install a new library without asking first and explaining the tradeoff
- Use `any` in TypeScript
- Put business logic directly in a component (extract to a hook or api.ts)
- Skip comments on architectural decisions
- Use `.then()` chains instead of `async/await`
- Deviate from the folder structure without flagging it and explaining why
- Duplicate state that already exists in a Zustand store or React Query cache

---

## Current Status

[x] Project initialized
[x] Supabase project created and schema defined
[x] Auth flow implemented
[x] Fabric catalog screen (data layer + UI + Maestro tests)
[x] Product catalog + configurator (data layer + UI + store with 30 tests)
[x] Configurator Maestro E2E tests
[x] Order placement flow (cart + express checkout + home orders + 67 tests)
[ ] Order tracking / lifecycle screen
[ ] Alterations flow

Update this checklist as features are completed.

---

## Maestro E2E Testing — Lessons Learned

Tests live in `.maestro/` organized by feature (e.g., `.maestro/catalog/`,
`.maestro/auth/`). App runs in Expo Go (`appId: host.exp.Exponent`).

### iOS Accessibility Grouping (Critical)

React Native's `Pressable`, `TouchableOpacity`, etc. set `accessible={true}`
by default on iOS. This groups ALL child elements into one atomic accessible
node. Consequences for Maestro:

- **Child `<Text>` nodes become invisible** to Maestro's text matcher. If a
  `Pressable` contains `<Text>Name</Text>` and `<Text>$45.00</Text>`, Maestro
  cannot find "Name" as a standalone element.
- **The grouped element's text** is either the explicit `accessibilityLabel`
  (if set) or the concatenation of all child text content.
- **Solution for assertions:** Use regex in Maestro to match the beginning
  of the accessibility label: `text: "Black Wool Crepe.*"` matches
  `"Black Wool Crepe, $45.00/m"`.
- **Solution for targeting specific elements:** Add `testID` to child elements
  and use Maestro's `id:` selector. `testID` works even inside grouped
  accessible parents.
- **Never use `accessible={false}`** just to make tests pass — it breaks
  screen reader UX for real users. Adapt test selectors instead.

### React Navigation Tab Bars

React Navigation wraps tab labels with platform-specific accessibility
metadata (e.g., `"Fabrics, tab, 2 of 2"` on iOS). Plain text matching
for `"Fabrics"` will fail.

- **Fix:** Set `tabBarAccessibilityLabel: "Fabrics"` on the tab screen
  options to override the compound label with a clean string.
- `tabBarTestID` does NOT work reliably in Expo Go for Maestro's `id:`
  selector. Use `tabBarAccessibilityLabel` + text matching instead.

### Test Isolation

Each Maestro test must leave the app in a clean state for the next test.
Every test should end with:
```yaml
# Navigate home and log out
- tapOn: "Home"
- tapOn: "Sign Out"
- extendedWaitUntil:
    visible:
      text: "Welcome Back"
    timeout: 10000
```

This ensures the next test starts from the login screen with no active session.

### Test File Conventions
- File names: `kebab-case.yaml` (e.g., `browse-fabrics.yaml`)
- Each test authenticates from scratch (login → action → logout)
- Use `extendedWaitUntil` with timeouts for async operations (auth, data loading)
- Use `optional: true` for dismissing system prompts (e.g., iOS keychain)

---

## Open Decisions (revisit as project grows)

- Payment processing: intentionally deferred. Will need research into
  Stripe India vs US when the time comes.
- Push notifications for order status changes: not yet scoped.
- Admin panel: currently using Supabase dashboard. Reassess if catalog
  management becomes complex.
- **Fabric color filtering is client-side.** The catalog screen fetches all
  available fabrics and filters in memory via `useMemo`. This works fine for
  ~20 fabrics but must move to server-side filtering (the `colorTag` param
  in `fetchFabrics` / Postgres `@>` containment) once the catalog grows to
  100+ items. The API and hook infrastructure already support this — the
  change is just passing `colorTag` to `useFabrics` instead of filtering
  the result in the component.

---

## Future Features & Improvements

A running list of ideas and planned enhancements. These are not currently
in scope but should inform architectural decisions — avoid building things
that would make these harder to add later.

- **Curated style recommendations on product selection.** When a customer
  selects a product (e.g., Suit), show a menu of pre-configured "recipes"
  before they enter the full configurator. Sections could include:
  - *Classic Styles* — timeless combinations (e.g., navy suit, spread collar, two-button)
  - *New Arrivals* — recently added fabric + style combos
  - *In Season* — styles curated for the current season (summer linens, winter wools)
  - *Event Based* — wedding suits, business formal, casual weekend
  - *Tailor's Picks* — staff favourites or bestsellers

  The customer can pick a preset as a starting point and then customize
  individual options in the configurator, or skip presets and build from
  scratch. This would require a `style_presets` table linking a product to
  a set of pre-selected options + fabric + display metadata (name, image,
  tags/categories).

- **Dynamic product catalog layout.** The products screen currently uses a
  uniform 2-column grid (same as fabrics), but the final design should be
  more editorial and dynamic — like a curated storefront, not a spreadsheet.
  Examples: a hero card for suits spanning full width, a row of shirt
  variations in a horizontal scroll, a "New Styles" section with different
  card sizes. Think of how apps like ASOS, Zara, or Nike mix card sizes,
  carousels, and section headers to create a browsing experience that
  guides the customer rather than just listing items. This requires a
  section-based data model (not just a flat product list) and a more
  flexible layout component (e.g., SectionList with mixed render items).

- **Fabric save + detail in configurator.** The configurator's fabric
  selection step currently uses a simplified card (tap to select). It
  should also support saving/bookmarking fabrics and viewing the full
  detail modal (FabricDetailModal). The challenge: FabricCard's `onPress`
  opens the detail modal, but in the configurator `onPress` needs to
  select the fabric. The cleanest approach is to add a "Select this
  Fabric" button inside FabricDetailModal when used in configurator
  context (pass a `mode` or `onSelect` prop). Then the card's `onPress`
  opens the modal as usual, and the modal has both "Save" and "Select"
  actions. The save hooks (useSaveFabric, useUnsaveFabric) already exist
  and just need the user session wired in.

- **Fabric–product compatibility.** Not all fabrics are suitable for every
  product type (e.g., a heavy wool tweed shouldn't be offered for a summer
  shirt). Currently all fabrics are shown for all products. The future fix
  is a `product_fabrics` junction table that maps which fabrics are valid
  for which products. The configurator's fabric selection step would then
  filter by `WHERE fabric_id IN (SELECT fabric_id FROM product_fabrics
  WHERE product_id = $1)`. The UI stays the same — it just shows fewer
  fabrics. This is safe to defer because the query change is minimal and
  doesn't require any architectural rework.

- **Swipe navigation between configurator steps.** Replace the current
  static step rendering with a horizontal swipeable view (e.g.,
  `react-native-pager-view` or a FlatList with `pagingEnabled`). The
  customer can swipe left/right to move between option steps, making
  the configurator feel more fluid and native. The bottom progress bar
  and Next/Back buttons remain as alternative navigation — swiping is
  an addition, not a replacement.

- **One-tap option selection + auto-advance.** Currently selecting an
  option requires two taps: tap the option card, then tap Next. For a
  faster flow, tapping an option should select it AND auto-advance to
  the next step after a brief delay (~300ms, enough to show the
  selection animation). A "selected" state still shows visually so the
  customer sees their choice registered before the transition. This
  does not apply to the fabric step (which has filters and more
  browsing) or the review step — only to the option group steps where
  the interaction is simply "pick one."

- **Long-press / 3D Touch preview in configurator.** On the fabric
  selection step, long-pressing a fabric card should show a peek preview
  with full fabric details (description, color tags, price) — similar to
  the FabricDetailModal but as a lightweight overlay. On option group
  steps, long-pressing an option card should show the full description
  text and a larger image. This gives customers quick access to details
  without leaving the selection flow. Implementation options: React
  Native's `onLongPress` with a custom modal/tooltip, or iOS-native
  context menus via `react-native-context-menu-view` for a truly native
  3D Touch / Haptic Touch feel.

- **Maestro E2E tests for configurator.** Deferred because Maestro
  doesn't work well on Windows. Write tests covering: product
  selection → full configurator flow (fabric + all option steps +
  review) → verify review shows correct selections → tap review items
  to jump back and change. See `.maestro/` for existing patterns.
