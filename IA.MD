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
