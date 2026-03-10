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

These are the core entities. Full schema lives in Supabase. TypeScript types
live in `/src/types`.

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
[ ] Auth flow implemented
[ ] Fabric catalog screen
[ ] Product catalog + configurator
[ ] Order placement flow
[ ] Order tracking / lifecycle screen
[ ] Alterations flow

Update this checklist as features are completed.

---

## Open Decisions (revisit as project grows)

- Payment processing: intentionally deferred. Will need research into
  Stripe India vs US when the time comes.
- Push notifications for order status changes: not yet scoped.
- Admin panel: currently using Supabase dashboard. Reassess if catalog
  management becomes complex.
