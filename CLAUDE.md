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

### Build & Development Setup

The project uses **EAS Build + expo-dev-client** (not Expo Go). The app
config lives in `app.config.ts` (dynamic, environment-aware) — there is
no `app.json`.

**Daily development:**
```bash
npm start              # Starts Metro with --dev-client flag
npm run ios            # Opens on iOS simulator (dev client must be installed)
npm run android        # Opens on Android emulator
```

**Building the dev client** (only needed when native deps change):
```bash
npm run build:dev:ios      # Cloud build for iOS simulator
npm run build:dev:android  # Cloud build for Android
```

**Other build profiles:**
```bash
npm run build:preview      # Internal testing (TestFlight / internal track)
npm run build:production   # Store submission
```

EAS CLI is installed as a dev dependency (`npx eas ...`), not globally.
Build profiles are defined in `eas.json`.

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
- **Document interview-worthy decisions in `IA.md`.** Whenever an
  implementation step, architectural decision, or technical tradeoff is
  worth discussing in a software engineering interview, add a section for
  it in `/IA.md` (Interview Artifacts). Each entry should include: the
  decision made, why it was chosen over alternatives, the tradeoffs
  involved, and what you would say if asked about it. This file is a
  living record of portfolio-grade talking points built up as the app
  evolves — not written after the fact.

## What Claude Should Never Do

- Install a new library without asking first and explaining the tradeoff
- Use `any` in TypeScript
- Put business logic directly in a component (extract to a hook or api.ts)
- Skip comments on architectural decisions
- Use `.then()` chains instead of `async/await`
- Deviate from the folder structure without flagging it and explaining why
- Duplicate state that already exists in a Zustand store or React Query cache
- Add `Co-Authored-By` lines to git commit messages

---

## Current Status

[x] Project initialized
[x] Supabase project created and schema defined
[x] Auth flow implemented
[x] Fabric catalog screen (data layer + UI + Maestro tests)
[x] Product catalog + configurator (data layer + UI + store with 30 tests)
[x] Configurator Maestro E2E tests
[x] Order placement flow (cart + express checkout + home orders + 67 tests)
[x] Order tracking / lifecycle screen
[x] Alterations flow (data layer + request UI + tracking UI + 62 tests + Maestro E2E)

[x] EAS Build + Dev Client migration (replaces Expo Go)

All core features complete. Update this checklist as new features are added.

---

## Maestro E2E Testing — Lessons Learned

Tests live in `.maestro/` organized by feature (e.g., `.maestro/catalog/`,
`.maestro/auth/`). After migrating to EAS Build / Dev Client, the app
runs in a custom dev client (`appId: com.apollo.tailor`) instead of
Expo Go (`host.exp.Exponent`). Maestro test `appId` values must use
the bundle identifier, not the Expo Go ID.

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

- Admin panel: currently using Supabase dashboard. Reassess if catalog
  management becomes complex. (#15)
- **Fabric color filtering is client-side.** The catalog screen fetches all
  available fabrics and filters in memory via `useMemo`. This works fine for
  ~20 fabrics but must move to server-side filtering (the `colorTag` param
  in `fetchFabrics` / Postgres `@>` containment) once the catalog grows to
  100+ items. The API and hook infrastructure already support this — the
  change is just passing `colorTag` to `useFabrics` instead of filtering
  the result in the component.

---

## Engineering Roadmap

All features and infrastructure work are tracked as GitHub issues.
This section provides the architectural context, implementation guidance,
and priority order that Claude needs when working on any of these issues.
Avoid building things that would make future items harder to add.

### Infrastructure Prerequisites (do these first)

These unblock the majority of the feature roadmap.

1. **Move to EAS Build / Dev Client (#41)** — Expo Go cannot run custom
   native modules (Stripe, Sentry), receive push notifications with custom
   config, or produce production binaries. This is the single biggest blocker.
   Use `expo-dev-client` for development builds that mirror production while
   retaining fast refresh. EAS Build profiles: `development`, `preview`
   (TestFlight/internal track), `production` (store submission).

2. **CI/CD Pipeline — GitHub Actions + EAS Build (#35)** — 160+ tests exist
   but no automated pipeline runs them on PRs. Pipeline: `tsc --noEmit` →
   `jest --coverage` → `eslint` on every push/PR. EAS Build triggers preview
   builds on merges to main. EAS Update for over-the-air JS bundle updates.
   Free tier: 30 EAS builds/month.

3. **Analytics (PostHog) + Crash Reporting (Sentry) (#36)** — No visibility
   into customer behavior or crashes. Sentry (`@sentry/react-native`) for
   crash reporting with source maps via EAS Build (free: 5K errors/month).
   PostHog (open-source, 1M free events/month) for product analytics:
   configurator completion rate, drop-off step, fabric popularity, order
   conversion funnel. Requires EAS Build for native module integration.

### Suggested Priority Order

**Quick wins (build momentum):**
1. Fit guarantee badge (#29) — pure UI, no backend
2. Recently viewed (#30) — small Zustand store
3. WhatsApp support (#27) — one component
4. Tab icons (#18) — quick visual fix

**Navigation restructure:**
5. Cart to header (#19) — navigation change
6. Home/Profile restructure (#20) — bigger refactor, sets up the stage

**Core features:**
7. Running price in configurator (#25) — schema change + UI
8. Push notifications (#21) — requires EAS Build
9. Guided measurements (#23) — important, larger effort
10. Save full configurations (#22) — extends existing patterns

**Medium effort:**
11. Post-delivery fit check (#24)
12. Appointment booking (#26)
13. Fabric swatch ordering (#28)
14. Customer reviews (#31)

**High effort:**
15. Wedding party / group orders (#32)
16. 3D garment configurator (#17)
17. Stripe payment integration (#33)
18. XState order lifecycle (#34)
19. i18n foundation (#38)
20. Accessibility audit (#39)

### Feature Implementation Context

This context informs architectural decisions when working on these issues.
Full implementation details live in the GitHub issue bodies.

**Stripe Payment Integration (#33)**
- Payment intents created server-side via Supabase Edge Functions (secret
  key never on client). Client only sees `pk_...` and `client_secret`.
- Deposit + balance model: pay 50% upfront, rest before delivery.
- `stripe_payment_intent_id` stored on orders/alterations table for
  reconciliation. Alteration charges create separate payment intents.
- India-specific: UPI support via Stripe's India payment methods.
- Requires EAS Build (#41). `@stripe/stripe-react-native` needs native modules.

**XState for Order Lifecycle (#34)**
- Formalize the order state machine (already in CLAUDE.md) with XState v5.
- Invalid transitions become impossible (can't go PLACED → DELIVERED).
- Guarded transitions: TRIAL_COMPLETE → ALTERATIONS only if `needsAlterations`.
- Visualizable at stately.ai/viz. Model-based testing generates all valid paths.
- `@xstate/react` provides `useMachine` hook. Works alongside Zustand
  (XState for order flow, Zustand for cart/UI).

**Offline Catalog Browsing (#37)**
- React Query persistence via `@tanstack/query-async-storage-persister`.
- Caches server responses to AsyncStorage, restores on restart.
- Not full offline-first — orders still require connectivity.
- Fabrics and products browsable offline from cache. Lightweight to implement.
- WatermelonDB is overkill here — it's for apps where offline creation is core.

**Internationalization (#38)**
- `react-i18next` with namespace-based translation files (`en/catalog.json`,
  `hi/catalog.json`). Multi-currency via `Intl.NumberFormat` (already in Hermes).
- RTL support via React Native's `I18nManager` for Middle East markets.
- Store language/currency preference in `profiles` table.
- Even if launching in one language, centralizing strings now prevents
  a painful retrofit later.

**Accessibility Audit (#39)**
- 44x44pt touch targets (iOS HIG) / 48x48dp (Material).
- Color contrast 4.5:1 for text. Test indigo `#4f46e5` on white/gray.
- `accessibilityRole`, `accessibilityLabel`, `accessibilityHint` on all
  interactive elements. Fabric colors must have text labels (color-blind users).
- Respect `useReducedMotion()` from Reanimated.
- Test with Xcode Accessibility Inspector / VoiceOver (iOS), TalkBack (Android).

**Deep Linking & Universal Links (#40)**
- Expo Router gives automatic deep linking from file structure.
- URL scheme: `tailor-app://order/123`. Universal links:
  `https://app.yourtailor.com/order/123` (app or web fallback).
- Needed for: push notification tap targets, group order invites, email
  links, QR codes in-store, share flows.
- Requires EAS Build + domain for hosting association files.

**Performance: expo-image + FlashList (#42)**
- `expo-image` (SDWebImage/Glide): blurhash placeholders, caching,
  progressive loading. Replace all `<Image>` across fabric/product cards.
- `@shopify/flash-list`: cell recycling like native list views. Drop-in
  replacement for FlatList. Prevents stutter on 100+ item catalogs.

### Supabase Edge Functions

Several features (Stripe, push notifications, scheduled jobs) require
server-side logic. Supabase Edge Functions are Deno-based serverless
functions on Supabase infrastructure.

```
/supabase
  /functions
    /notify-order-status    # Webhook on status change → push notification
      index.ts
    /process-payment        # Stripe payment intent creation
      index.ts
```

Deploy: `supabase functions deploy notify-order-status`

Key use cases: order status webhooks, payment processing (server-side
secret key), scheduled jobs via `pg_cron`, image processing on upload.

### Future Features (not yet issues — inform architecture only)

These are not in scope but should not be made harder to add later.

- **Curated style recommendations on product selection.** Pre-configured
  "recipes" (Classic Styles, New Arrivals, In Season, Event Based, Tailor's
  Picks) shown before the full configurator. Customer picks a preset as a
  starting point then customizes, or builds from scratch. Requires a
  `style_presets` table linking product → pre-selected options + fabric +
  display metadata.

- **Dynamic product catalog layout.** Editorial, storefront-style layout
  instead of uniform 2-column grid. Hero cards, horizontal scrolls, mixed
  card sizes (like ASOS/Zara/Nike). Requires section-based data model and
  flexible layout component (SectionList with mixed render items).

- **Fabric save + detail in configurator.** Add "Select this Fabric" button
  inside FabricDetailModal when in configurator context (pass `mode` or
  `onSelect` prop). Card's `onPress` opens modal as usual, modal has both
  "Save" and "Select" actions. Save hooks already exist.

- **Fabric–product compatibility.** `product_fabrics` junction table mapping
  valid fabrics per product. Configurator filters by
  `WHERE fabric_id IN (SELECT ... WHERE product_id = $1)`. Safe to defer —
  query change is minimal.

- **Swipe navigation between configurator steps.** Horizontal swipeable view
  (`react-native-pager-view` or FlatList with `pagingEnabled`). Progress bar
  and Next/Back buttons remain as alternative navigation.

- **One-tap option selection + auto-advance.** Tap option → select + auto-advance
  after ~300ms delay. Only for option group steps (not fabric or review).

- **Long-press / 3D Touch preview in configurator.** Peek preview via
  `onLongPress` with custom modal/tooltip, or `react-native-context-menu-view`
  for native 3D Touch / Haptic Touch feel.

### Experimental / Research Topics

Mention in interviews, keep an eye on. Not actionable yet.

- **AI Body Measurement Estimation** — MediaPipe for body landmarks from
  two photos (front + side). Accuracy within 1-2 inches — starting point,
  not replacement for tape. `react-native-mediapipe` bridge exists.
  Supabase `pgvector` for similar body type recommendations.

- **AR Fabric Preview** — ViroReact (most established but maintenance
  uncertain), expo-three/expo-gl (WebGL, no true AR), native ARKit/ARCore
  modules. Practical: 3D configurator (#17) achieves 80% of value without
  AR complexity. Be honest about the implementation gap in interviews.

- **Supabase Realtime for Live Order Tracking** — Subscribe to Postgres
  changes instead of polling. Customer opens order detail → status updates
  live. Already available in Supabase, no Edge Functions needed. Worth
  implementing alongside push notifications.

- **Monorepo (when admin panel comes)** — Turborepo with `/apps/mobile`,
  `/apps/admin`, `/packages/shared-types`, `/packages/supabase-client`.
  Current `/src/types` is already extraction-ready. Don't set up until
  there's a second app.

- **Animations & Micro-interactions** — Reanimated 3 (UI thread worklets),
  Moti (declarative API like Framer Motion), Lottie (After Effects JSON).
  Ideas: configurator step transitions, card selection spring, order
  timeline staggered reveal, cart badge bounce, branded pull-to-refresh.

- **Customer Loyalty / Rewards** — Points per purchase, tiered membership,
  referral bonuses, birthday perks. Schema: `loyalty_transactions` table
  or `loyalty_points` column on `profiles`. Not needed now but schema
  should not block it.

- **Social Features & Sharing** — Share configuration link/image, wedding
  party/group orders (#32), social media share, stylist-to-customer
  configuration sharing.

### Security Considerations

- Every table must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
  Use `auth.uid()` in policies. `service_role` key bypasses RLS — never
  expose to client. `.env.local` should only have the `anon` key.
- Token handling: Supabase JS stores session in AsyncStorage (acceptable).
  For high-security: `expo-secure-store` (Keychain/Keystore) with custom
  storage adapter. Token refresh is automatic.
- Input validation: client (UX) AND server (security). Measurement values
  need CHECK constraints (`chest_cm > 0 AND chest_cm < 200`). Deep links
  that modify state must verify authenticated user owns the resource.

### App Store Submission Checklist

Not immediate but worth knowing when preparing for production:

- **iOS**: 1024x1024 icon (no alpha), screenshots per device size, privacy
  nutrition labels, `NSCameraUsageDescription` if adding photos. Review: 24-48h.
  Common rejections: placeholder content, broken links, no demo account.
- **Android**: Feature graphic 1024x500, content rating questionnaire, data
  safety section. Review: hours to 1 day.
- **EAS Submit** automates uploads: `eas submit --platform ios|android`.
- For portfolio: TestFlight (iOS) + internal testing track (Android) for
  sharing with interviewers. Full publish not required.
