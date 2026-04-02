# Interview Answers — Apollo Tailor App

A reference sheet of architectural decisions and talking points from this project.

---

## Why Zustand for the Configurator Store

### The Context

The product configurator is a multi-step wizard. When a customer taps a product
(e.g., Dress Shirt), they walk through several screens: pick a fabric, then
choose options for each option group (collar style, cuff style, pocket style, etc.),
then review their selections. All of these selections need to be shared across
multiple step components.

### The Three Options We Considered

**Option 1: Navigation Params**
Pass selections through Expo Router params as the user moves between steps.

- Problem: Fragile. You'd need to serialize complex objects (Fabric, ProductOption)
  into URL params. Going backwards means reconstructing state from params. It's
  essentially prop drilling through the routing layer. Any refactor to the step
  order breaks the param chain.

**Option 2: React Context**
Wrap the configurator in a `ConfiguratorProvider` with `useReducer` or `useState`.

- It works, but Context has a re-render problem — any state change re-renders
  every component subscribed to that context. If the user picks a fabric on step 1,
  the review component on step 5 re-renders even though it's not visible. You'd
  need to split into multiple contexts or use `useMemo` hacks to work around it.
- Also requires a Provider wrapper component in the component tree.

**Option 3: Zustand (what we chose)**
A lightweight singleton store where each step component subscribes to only the
slice of state it needs.

- `useConfiguratorStore(state => state.fabric)` — only re-renders when `fabric`
  changes, not when `currentStep` or `selectedOptions` change.
- Zustand uses reference equality per-selector, giving surgical re-renders
  out of the box.
- No Provider wrapper needed. No serialization. No prop drilling.
- The store is a plain JavaScript module — easy to test, easy to reset, easy
  to use from anywhere in the app.

### The Deeper Point: Server State vs. Client State

This is the real signal in an interview. We use two different state management
tools in this app, and the choice is intentional:

| | React Query | Zustand |
|---|---|---|
| **What it manages** | Server state — data from Supabase | Client state — data the app owns locally |
| **Examples** | Fabrics, products, orders, measurements | Configurator selections, cart, UI flags |
| **Lifecycle** | Persistent — exists in the database | Ephemeral — exists only during the session |
| **Concerns** | Caching, background refetching, stale-while-revalidate, cache invalidation | Immediate reads/writes, surgical re-renders |

The configurator selections don't exist in the database until the customer
places the order. They're ephemeral client state — created during the
configuration session and discarded on cancel or reset. Putting this in
React Query would be a category error: there's no server to sync with,
no cache to invalidate, no stale data to refetch.

### How to Say It

> "We separate server state from client state because they have fundamentally
> different lifecycles. Server state needs caching, invalidation, and background
> refetching — that's React Query's job. Client state like the configurator
> is ephemeral — it exists only during the configuration session and is
> discarded when the customer finishes or cancels. Zustand gives us a
> lightweight store with selector-based subscriptions, so each wizard step
> only re-renders when its specific slice of state changes. We considered
> React Context but it re-renders all subscribers on any change, and
> navigation params would require serializing complex objects through the
> routing layer."

---

## Why a Generic OptionStep Component (Open-Closed Principle)

### The Context

The configurator has multiple option selection steps — lapel style, button count,
collar style, cuff style, hem style, etc. Across three products (Suit, Shirt,
Trousers), there are 15 option groups total. Each group has the same UI pattern:
show images in a grid, let the customer pick one.

### The Decision

We built a single generic `OptionStep` component that works for ANY option group,
rather than creating `CollarStep`, `LapelStep`, `CuffStep`, etc.

The configurator is **data-driven**: the product's `option_groups` array (stored
in the database) defines how many steps there are and in what order. The `OptionStep`
component receives the group's options as props and renders them generically. It
doesn't know or care whether it's showing lapel styles or hem styles.

### Why This Matters

Adding a new customization option to a product (e.g., adding "button_style" to
Dress Shirts) requires **zero UI code changes**:

1. Add the options to the `product_options` table
2. Add `"button_style"` to the product's `option_groups` array

The configurator automatically picks up the new step because:
- The store's `totalSteps()` is derived from `product.option_groups.length`
- The wizard shell maps each step index to an option group name
- `OptionStep` renders whatever options it receives

This is the **Open-Closed Principle** in practice — the system is open for
extension (new option groups) but closed for modification (no component changes).

### How to Say It

> "The configurator is data-driven. The product's option_groups array in the
> database defines the wizard steps. A single generic OptionStep component
> renders any option group. Adding a new customization option is a database
> change, not a code change. This is the Open-Closed Principle — the system
> is extensible without modifying existing code."

---

## Presentational vs Container Components

### The Context

OrderRow displays an order's price, date, and status badge. When we added
tappable navigation to order details, we had to decide: should OrderRow know
about the router and navigate directly, or should it just call a callback?

### The Two Approaches

**Approach 1: Smart Component (navigation inside)**
OrderRow imports the router and calls `router.push(/order-detail?orderId=...)` on tap.

- Tight coupling. The component now depends on Expo Router, making it
  impossible to test without mocking the router. If the route path changes,
  you fix it inside a component file instead of a screen file.
- Reuse breaks. If you want OrderRow in a different context (e.g., an admin
  view that navigates to a different detail screen), you need a second
  component or conditional routing logic inside OrderRow.

**Approach 2: Presentational Component (what we chose)**
OrderRow accepts an optional `onPress?: (order: Order) => void` prop. It
renders the order data and calls `onPress(order)` when tapped. It has no
idea what happens next — the *screen* (the container) wires the navigation.

- **Testable** — OrderRow tests just check if `onPress` was called with the
  right argument. No router mocks needed.
- **Reusable** — the same component works on the home screen, the orders
  list, and any future screen, each wiring different behavior.
- **Separation of concerns** — rendering logic and app-level wiring don't mix.
  The component's job is to display data and signal user intent via callbacks.

### The Broader Pattern

Presentational (or "dumb") components only handle rendering. They receive data
and callbacks via props. Container components (typically screens in React Native)
handle data fetching, state management, and navigation, then pass results down.

In this codebase:
- **Presentational:** OrderRow, StatusBadge, CartItemCard, FabricCard, OptionCard
- **Containers:** `index.tsx` (Home), `orders.tsx`, `cart.tsx`, `configurator.tsx`

This isn't a rigid rule — it's a spectrum. The key is that components with
complex rendering logic shouldn't also own routing, data fetching, or business
logic. When they do, they become hard to test and impossible to reuse.

### How to Say It

> "We keep components like OrderRow presentational — they receive data and
> callbacks via props but don't know about the router or data layer. The screen
> wires the navigation. This means OrderRow tests don't need router mocks —
> we just check that onPress was called with the right order. And the same
> component works on the home screen and the orders list, each wiring different
> navigation. It's a small decision but it compounds — every presentational
> component in the app is independently testable and reusable without mocking
> framework internals."

---

## Why Three Levels of Testing (The Testing Pyramid)

### The Context

This app has business-critical flows — order placement involves pricing
calculations, multi-step configuration state, and database writes. A bug
in any layer (logic, UI rendering, or integration) could result in wrong
prices, lost orders, or broken navigation. A single testing approach can't
catch all of these reliably.

### The Three Levels We Implemented

**Level 1: Unit Tests (Pure Logic)**
Tools: Jest. Files: `.test.ts` in `__tests__/` directories.
Examples: `calculatePrice.test.ts`, `formatDate.test.ts`, `cartStore.test.ts`,
`configuratorStore.test.ts`.

Tests pure functions and Zustand stores with no rendering or DOM. The fastest
tests (~50ms each), fully deterministic, and the easiest to write. These
verify *logic contracts*: does the pricing formula handle negative option
modifiers? Does the configurator store clamp step index to bounds?

Limitation: a unit test can pass even if the component never renders the
calculated value. It only tests the data, not the UI.

**Level 2: Component Tests (Rendering + Interaction)**
Tools: Jest + `@testing-library/react-native`. Files: `.test.tsx`.
Examples: `StatusTimeline.test.tsx`, `OrderRow.test.tsx`.

Renders a single component in isolation with mock data and asserts on what
appears on screen. No simulator, no network — runs in Node. These verify
*UI contracts*: does the timeline actually display the note text? Does
tapping OrderRow fire the onPress callback? Does conditional rendering
work (show notes when present, hide when null)?

Limitation: can't catch issues that only appear when components are composed
together in a real navigation stack, or when real API data differs from mocks.

**Level 3: E2E Tests (Full Integration)**
Tools: Maestro (YAML-based, runs against real app in simulator).
Files: `.maestro/` directory.
Examples: `browse-fabrics.yaml`, `order-placement.yaml`.

Runs the real app end-to-end: Supabase auth, real API calls, real navigation,
real rendering on a device. These verify *integration contracts*: does the
full flow from login → browse → configure → checkout actually create an
order in the database?

Limitation: slow (~10-30s per test), can be flaky (network, simulator state),
and when a test fails it's hard to pinpoint which layer caused it.

### Why Not Just E2E?

If you only write E2E tests and one fails, you have to debug through every
layer: was it a pricing calculation bug? A rendering bug where the button
wasn't visible? An API contract change? A navigation misconfiguration?

Unit and component tests isolate the layer so failures are immediately
actionable. E2E tests then only need to verify the layers work *together*.

### The Pyramid Shape

Many fast unit tests at the base (cover every edge case cheaply), moderate
component tests in the middle (cover every UI behavior), few slow E2E tests
at the top (cover critical user journeys only). Each level has diminishing
returns alone but together they provide high confidence with fast feedback.

### How to Say It

> "We implement three testing levels that each verify a different contract.
> Unit tests cover logic — pricing, state machines, formatting — and run in
> milliseconds. Component tests render individual components with mock data
> to verify UI behavior — does the timeline show notes, does tapping a row
> fire the callback. E2E tests via Maestro run the real app against real
> Supabase to verify full user journeys. The key insight is that each level
> catches bugs the others miss: a unit test won't catch a forgotten render,
> a component test won't catch an API contract change, and an E2E test
> won't tell you which layer broke. Together they give us high confidence
> with fast feedback loops."

---

## Why Tabs + Nested Stacks (Not Flat Hidden Tabs)

### The Context

As the app grew, we added screens that aren't top-level tabs but are navigated
to via `router.push()` — order detail, orders list, saved fabrics, the
configurator. Initially, these were registered as hidden tab siblings
(`href: null` in the Tabs layout). This is Expo Router's simplest pattern for
"non-tab screens inside a Tabs layout."

### The Problem We Hit

Hidden tab screens are siblings, not a stack. When a customer navigated
Home → Orders → Order Detail → Back, `router.back()` skipped the Orders
screen and went straight to Home. The Tabs navigator doesn't maintain a
per-screen back stack — it only knows which tab was active before.

We patched this with a `from` search param: the pushing screen passes its
route name (`from=orders`), and the detail screen uses `router.navigate()`
to go back explicitly. This works but it's fragile — every new pushed screen
needs to thread this param, and it fights the framework instead of using it.

### The Right Architecture: Tabs + Nested Stacks

The standard React Native pattern is to nest a Stack navigator inside each
tab that has push/pop flows:

```
app/(app)/
  _layout.tsx              ← Tabs (Home, Fabrics, Products, Cart)
  (home)/
    _layout.tsx            ← Stack
    index.tsx              ← Home screen
    orders.tsx             ← pushed from Home
    order-detail.tsx       ← pushed from Home or Orders
    saved-fabrics.tsx      ← pushed from Home
  fabrics.tsx              ← tab screen (no nested stack needed)
  (products)/
    _layout.tsx            ← Stack
    index.tsx              ← Products list
    configurator.tsx       ← pushed from Products
  cart.tsx                 ← tab screen
```

Each tab's Stack is independent — navigating within the Home stack doesn't
affect the Products tab's state. Back buttons work automatically because
React Navigation's Stack navigator tracks push history. No `from` params,
no manual `headerLeft` back buttons.

### Why This Matters Beyond Navigation

- **Each tab preserves its own navigation history.** Switching from Home
  (deep in Orders → Detail) to Products and back returns you exactly
  where you were in the Home stack. Flat hidden tabs lose this context.
- **Scales without workarounds.** Adding the alterations detail screen
  is just adding a file to the `(home)/` folder. No `from` param, no
  manual back button wiring.
- **Standard pattern.** Every major RN app (Airbnb, Instagram, Uber)
  uses this architecture. Interviewers expect it and will notice if
  you can explain the tradeoff vs flat tabs.

### How to Say It

---

## Why `profile_id` Is Denormalized on the Alterations Table

### The Context

An alteration request is always linked to an order (`order_id` FK), and every
order already has a `profile_id`. So technically, the customer who owns an
alteration can always be derived via `alterations → orders → profile_id`.
Despite this, we store `profile_id` directly on the `alterations` table as well.

### Why We Denormalized

**1. Simpler RLS policies.**
Supabase Row Level Security evaluates per-row. With `profile_id` on the
alterations table, the policy is a direct comparison:
```sql
CREATE POLICY "Users can read own alterations"
  ON public.alterations FOR SELECT
  USING (auth.uid() = profile_id);
```
Without it, the policy would need a subquery through orders:
```sql
USING (auth.uid() = (SELECT profile_id FROM orders WHERE id = order_id))
```
Subqueries in RLS policies are evaluated for every row scan. At scale, this
adds measurable overhead — and more importantly, it's harder to reason about
and audit.

**2. Single-table "My Alterations" query.**
The customer overview screen (`fetchAlterationsByProfile`) becomes a simple
`WHERE profile_id = ?` instead of a join through orders. At this app's scale
the join is negligible, but the simpler query is easier to read, test, and
cache with React Query.

**3. No real consistency risk.**
The denormalization would be dangerous if `profile_id` on orders could change
after creation — then the alteration's `profile_id` could become stale. But
orders are immutable in this regard: a customer's order never transfers to a
different profile. So the duplicated `profile_id` will always match the source.

### The Tradeoff

It's a second source of truth. If the data model ever allowed order ownership
transfers (unlikely but possible), you'd need to update both tables. For this
app, that scenario doesn't exist, so the simplicity benefits outweigh the
duplication cost.

### How to Say It

> "We denormalized `profile_id` onto the alterations table even though it's
> derivable through orders. This simplifies RLS policies from a subquery to
> a direct comparison, and it makes the 'My Alterations' query a single-table
> scan instead of a join. The tradeoff is data duplication, but since order
> ownership is immutable — a customer's order never transfers to a different
> profile — there's no consistency risk. It's a deliberate denormalization
> for query simplicity, not an accidental one."

---

> "We initially used flat hidden tabs for non-tab screens — it's quick to
> set up but it broke back navigation because tab siblings don't form a
> stack. Pressing back skipped intermediate screens. The fix is Tabs with
> nested Stacks — each tab that has push/pop flows gets its own Stack
> navigator. Back buttons work automatically, each tab preserves its own
> navigation history, and adding new pushed screens is just creating a
> file in the right folder. It's more files (one `_layout.tsx` per stack)
> but the navigation behavior is correct by default instead of patched
> with workarounds."

---

## Why We Migrated from Expo Go to EAS Build / Dev Client

### The Context

During initial development, we used Expo Go — a pre-built app published by
Expo that runs your JavaScript code inside a generic native container. It's
the fastest way to start: install the app, scan a QR code, and your code
runs instantly. No Xcode, no Android Studio, no native compilation.

But Expo Go has a hard ceiling: you cannot add native modules that aren't
already bundled into it. The container is fixed.

### The Problem

Our roadmap required features that all depend on custom native code:

- **Stripe** (`@stripe/stripe-react-native`) — links native iOS/Android
  payment SDKs for card entry, Apple Pay, Google Pay, and UPI
- **Sentry** (`@sentry/react-native`) — hooks into the native crash
  reporting pipeline with source maps
- **Push Notifications** — requires native entitlements and custom
  configuration that Expo Go's generic setup doesn't support
- **App Store / Play Store submission** — Expo Go can't produce
  production binaries (`.ipa`, `.aab`)

None of these can work in Expo Go. This single infrastructure constraint
blocked the majority of the feature roadmap.

### The Solution: EAS Build + expo-dev-client

**`expo-dev-client`** replaces Expo Go with a custom-built development app.
It's functionally identical to Expo Go — fast refresh, same developer UX —
but the native layer is yours. Any native module you install gets compiled
into your custom dev client.

**EAS Build** is Expo's cloud build service. Instead of needing Xcode locally
(or a Mac at all for iOS builds), Expo's servers compile the native project.
You run `eas build`, wait a few minutes, and download the result. This is
important because:

- iOS builds require macOS + Xcode. Cloud builds eliminate this dependency
  for team members on Windows/Linux
- Native compilation is slow and resource-intensive. Offloading it means
  your local machine only runs Metro (the JavaScript bundler), which is
  lightweight

**Three build profiles** serve different purposes:

| Profile | Purpose | Distribution |
|---|---|---|
| `development` | Dev client — replaces Expo Go | Install on your device |
| `preview` | Internal testing builds | TestFlight (iOS) / Internal track (Android) |
| `production` | Store submission | App Store / Play Store |

### The Key Insight: When to Migrate

We didn't start with EAS Build. We started with Expo Go and built all core
features — auth, catalog, configurator, orders, alterations — without needing
custom native modules. This was deliberate:

- **Too early** = unnecessary complexity. Expo Go is faster for prototyping
  and has zero build configuration. If we'd set up EAS Build on day one,
  we'd have spent time on build infrastructure instead of building features.
- **Too late** = blocked roadmap. If we'd tried to add Stripe or Sentry
  first and then realized we needed EAS Build, we'd be doing infrastructure
  work under pressure with a feature deadline.
- **Right time** = when the next batch of features all require native modules.
  The core app is stable, tested (160+ tests), and working. Now we invest
  in the infrastructure that unblocks everything ahead.

This is a general principle: defer infrastructure investment until it's
actually needed, but do it *before* it becomes urgent.

### How to Say It

> "We started with Expo Go for rapid prototyping — it's zero-config and
> let us build the entire core app without touching native code. But our
> roadmap required Stripe payments, Sentry crash reporting, and push
> notifications, all of which need custom native modules that Expo Go
> can't include. So we migrated to EAS Build with expo-dev-client. The
> dev client gives us the same developer experience — fast refresh, Metro
> bundler — but with a custom native container that includes whatever
> modules we need. EAS Build compiles in the cloud, so we don't need
> Xcode locally, and we set up three build profiles: development for
> day-to-day work, preview for TestFlight and internal testing, and
> production for store submission. The timing was deliberate — we didn't
> do it on day one because Expo Go was faster for prototyping, and we
> didn't wait until we were blocked on a feature. We did it exactly when
> the next wave of features all required native modules."

---

## CI/CD Pipeline Architecture

### The Context

With 149 tests, a TypeScript strict-mode codebase, and ESLint, we needed
automated validation to prevent regressions as the feature set grows. The
challenge was designing a pipeline that's fast on PRs (developer experience)
but smart about expensive native builds (cost control).

### The Decision

Split into two workflows with fundamentally different triggers and goals:

**CI (pull requests only):** Three parallel jobs — typecheck, lint, test.
Each runs independently so a type error doesn't block the lint result.
Coverage comments post directly to the PR via `jest-coverage-report-action`
(no external Codecov service needed). Concurrency groups cancel stale runs
when new commits are pushed to the same PR.

**CD (push to main/release + manual trigger):** Uses `dorny/paths-filter`
to detect whether changes are JS-only or touch native code. JS-only changes
trigger an EAS Update (OTA) — fast, no build credits consumed. Native changes
trigger a full EAS Build with a platform matrix (`ios` + `android`, `fail-fast: false`).
Branch determines the profile: `main` → preview, `release/*` → production.

### Why This Over Alternatives

- **Why not one workflow?** CI and CD have different triggers, different costs,
  and different failure modes. Separating them keeps each workflow simple and
  avoids accidental EAS builds on every PR.
- **Why conditional builds?** EAS Build credits are limited (30/month free tier).
  Most PRs are JS-only — shipping those as OTA updates saves build credits
  for when native code actually changes.
- **Why fingerprint runtime versioning?** OTA updates are dangerous if they
  assume native code that the installed binary doesn't have. Expo's fingerprint
  policy auto-hashes all native dependencies. If the fingerprint changes, old
  binaries won't receive the incompatible update — they stay on their last
  compatible version until the user installs a new binary.
- **Why `fail-fast: false` on the platform matrix?** An iOS signing issue
  shouldn't cancel the Android build. Both platforms should complete independently
  so you get full signal from one even if the other fails.

### What I'd Say in an Interview

> "We split CI and CD into separate workflows because they serve different
> purposes. CI is cheap and fast — three parallel jobs on every PR that give
> immediate feedback. CD is expensive and deliberate — it detects whether
> changes touch native code and chooses between a full EAS Build or a
> lightweight OTA update accordingly. This saved us from burning through
> our 30 monthly build credits on JS-only changes.
>
> The most important safety mechanism is fingerprint-based runtime versioning.
> Without it, an OTA update could depend on a native module that doesn't exist
> in the user's installed binary, causing a crash. The fingerprint is an
> auto-computed hash of all native dependencies — when it changes, old binaries
> are automatically excluded from receiving the update.
>
> We also set up branch protection requiring all three CI checks plus a PR
> review before any merge to main. Combined with concurrency groups that
> cancel stale runs, this gives us a pipeline that's both safe and efficient."

---

## Trust Signals Placement Strategy (FitGuaranteeBadge)

### The Decision

We built a `FitGuaranteeBadge` component with two variants — `compact` (icon + text
for product cards) and `full` (banner with description for checkout/review screens).
The full variant is placed right before the price breakdown on the configurator review
and directly above the "Place Order" button on the cart screen.

### Why This Matters

Custom clothing is a $200-800+ commitment where customers can't try before buying.
Research on conversion optimization shows that trust signals have measurably higher
impact when placed near high-friction actions (checkout, configure) versus browse
screens. We use two variants to balance visibility with screen real estate.

### The Tradeoff

Adding the badge to product cards slightly increases visual density. We chose a compact
variant (just icon + text) to minimize noise while still planting the trust signal
early in the discovery journey. The full banner is reserved for moments of decision.

### What I'd Say in an Interview

> "I designed the trust signal as a two-variant component placed at different
> friction points. Compact badges on product cards plant the guarantee early
> in the customer journey. Full banners on the review and checkout screens
> reinforce it at the moment of highest purchase anxiety — right before they
> commit money. The component includes a tappable modal with full policy details
> so the signal doesn't feel like empty marketing."

---

## Recently Viewed Store Design (LRU with Deduplication)

### The Decision

We built a Zustand store with AsyncStorage persistence that tracks recently viewed
fabrics and products. Items are ordered by most recently viewed, duplicates update
the timestamp and move to front (dedup), and the list caps at 20 items with LRU
eviction.

### Why Zustand (Not React Query)

Recently viewed is client-owned browsing history, not server data. It doesn't need
caching, revalidation, or synchronization — just a local ordered list that persists
across app restarts. This follows our state management philosophy: React Query for
server state, Zustand for client state.

### Why Store Display Data (Not Just IDs)

We store enough to render a card (name, image, price) without re-fetching. Full
Fabric/Product objects would bloat storage. If we stored only IDs, we'd need
a query waterfall on every home screen render — fetch IDs, then batch-fetch items.
The snapshot approach means the recently viewed row renders instantly from cache.

### What I'd Say in an Interview

> "The recently viewed store is an LRU cache with deduplication — viewing an item
> moves it to the front instead of creating a duplicate. We store just enough
> display data (name, image, price) to render cards without re-fetching, which
> means the section loads instantly from AsyncStorage. The 20-item cap keeps
> storage lean while covering the typical browsing session."

---

## WhatsApp Support FAB with Contextual Deep Links

### The Decision

We added a floating action button on the configurator and order detail screens
that opens WhatsApp with a pre-filled message containing screen-specific context
(product name, order ID, order status).

### Why WhatsApp (Not a Custom Chat)

For a small tailoring business, WhatsApp is the highest-impact, lowest-effort
support channel. No chatbot infrastructure, no ticket system, no maintenance cost.
Customers already use WhatsApp daily, and the tailor likely already uses it for
business communication. The implementation is just `Linking.openURL` with a
pre-filled `wa.me` URL.

### Why Contextual Prefill

Context-aware prefill saves the customer from explaining their situation. Instead
of "Hi, I have a question" → "What's your order number?" → "What's the issue?",
the tailor immediately sees "question about order #ABC123 (status: IN_PRODUCTION)"
and can respond with relevant information.

### What I'd Say in an Interview

> "We chose WhatsApp because building a custom support system for a small business
> would be over-engineering — the tailor already uses WhatsApp with customers.
> The interesting part is the contextual deep link. Each screen passes its own
> context (product being configured, order ID and status) so the pre-filled
> message includes everything the tailor needs to help without back-and-forth.
> We also handle the fallback gracefully — if WhatsApp isn't installed, we show
> the phone number in an alert."
