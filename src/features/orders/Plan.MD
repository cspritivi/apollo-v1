# Order Placement Flow — Implementation Plan

## User Journey

There are two paths to placing an order. Both start from the configurator
review screen after the customer has configured a product.

### Path A — Express Checkout (single item)

```
Configurator Review → "Place Order Now" → Order Success Screen
```

### Path B — Cart Checkout (one or more items)

```
Configurator Review → "Add to Cart" → Continue Shopping
                                          ↓
                                    (repeat for more items)
                                          ↓
                                    Cart Tab → Review items
                                          ↓
                                    "Place Order" → Order Success Screen
```

Both paths end at the same Order Success screen.

---

## Key Decisions

### 1. Multi-Item Orders via Cart

A customer should be able to configure multiple items (e.g., a suit AND
two shirts) before placing a single order. Each configured item is a
**cart item** stored client-side in a Zustand cart store. When the customer
checks out, each cart item becomes a separate `orders` row in Supabase.

**Why separate order rows per item (not an order_items table):**
In bespoke tailoring, each garment is produced independently — a suit and
a shirt are cut, sewn, and fitted on separate timelines. Each garment
needs its own status tracking (the suit might be in ALTERATIONS while the
shirt is already DELIVERED). The existing `orders` table with per-item
status tracking models this correctly. Adding a parent `order_group` table
would add complexity without business value at this scale.

**How items are grouped visually:** Orders placed together share the same
`created_at` timestamp (within seconds). The "My Orders" view can group
by date to show "3 items ordered on March 20" as a visual cluster. If
explicit grouping becomes important, we can add a `batch_id` UUID column
later — the schema change is trivial.

### 2. No Customer-Entered Measurements

Customers do NOT enter their own measurements in this version. Measurements
are taken in-person at the shop by the tailor, who enters them via the
Supabase dashboard. This prevents incorrect self-measurements that lead to
poor fit, excessive alterations, and customer frustration.

**Impact on order flow:** The `measurement_snapshot` column on `orders`
must be made nullable. Orders are placed without measurements. The tailor
attaches measurements when the customer visits. The order lifecycle becomes:

```
PLACED (no measurements) → Customer visits shop → Tailor takes measurements
  → Tailor attaches to order via dashboard → IN_PRODUCTION → ...
```

**Deferred to measurements feature:** A dedicated measurements management
screen where customers can view (but not edit) their measurement profiles
taken by the tailor. For now, measurements are backend-only data.

### 3. Pricing — Base + Fabric + Option Modifiers

```
total = product.base_price
      + (fabric.price_per_meter × product.fabric_meters)
      + Σ(option.price_modifier)
```

- **Base price** is a static number set by the tailor per product type
  (covers labour, overheads, standard materials)
- **Fabric cost** is calculated per product: each product defines how many
  meters of fabric it requires (`fabric_meters` column). A suit needs ~3.5m,
  a shirt ~2.5m, trousers ~1.8m. This is multiplied by the selected fabric's
  `price_per_meter` to give the customer a transparent fabric line item
- **Option modifiers** are nominal markups for options that require more
  effort (e.g., French Cuff +$15, Double Vent +$15)

**Schema change required:** Add `fabric_meters numeric NOT NULL DEFAULT 2.5`
to the `products` table. Backfill seed data with product-specific values.
Add `fabric_meters: number` to the `Product` TypeScript type.

**Why a naive constant per product (not per-customer):** True fabric usage
depends on body size, cutting efficiency, and fabric width. A constant is
a reasonable approximation for pricing — the tailor adjusts if needed. When
measurement-based yardage calculation is added later, only the
`fabric_meters` value changes; the pricing formula stays the same.

**Interview talking point:** The pricing formula is extracted into a shared
`calculatePrice()` utility used by ReviewSummary, the cart, and order
creation. This single source of truth prevents the displayed price from
drifting from the stored `final_price`. The formula is simple now but the
architecture supports adding tax, discounts, or dynamic fabric yardage
without changing callers.

### 4. View My Orders on Home Screen

The home screen gets a "My Orders" section showing recent orders with
status badges. This gives customers at-a-glance order tracking without
a dedicated tracking screen (deferred to next feature). Tapping an order
is a no-op for now — full order detail view comes with the tracking feature.

---

## Screens & What the Customer Sees

### 1. Configurator Review — Updated Buttons

The review step's bottom navigation changes from a single "Place Order"
button to two actions:

- **"Add to Cart"** — primary button (solid indigo). Adds the configured
  item to the cart Zustand store. Shows a brief confirmation (toast or
  inline message), then navigates back to the Products tab so the customer
  can configure more items.
- **"Place Order Now"** — secondary text link below the button. Express
  single-item checkout that creates the order immediately and navigates
  to the Order Success screen.

**Why "Add to Cart" is primary:** The app is designed for bespoke orders
where customers often order multiple items together (e.g., a suit + shirts
for a wedding). Making cart the default flow encourages this. Express
checkout is available for customers who want just one item.

### 2. Cart Tab (new tab)

New tab added to the bottom navigation bar alongside Home, Fabrics, Products.

**Empty state:**
- Illustration or icon
- "Your cart is empty"
- "Browse Products" button → navigates to Products tab

**With items:**
- Scrollable list of cart items. Each item card shows:
  - Product image (or letter fallback)
  - Product name (e.g., "Two-Piece Suit")
  - Fabric name (e.g., "Black Wool Crepe")
  - Number of customizations (e.g., "5 options selected")
  - Item price (base + option modifiers)
  - Remove button (trash icon or swipe-to-delete)
- **Order Summary section** at the bottom:
  - Item count (e.g., "3 items")
  - Total price (sum of all item prices)
  - "Place Order" button (disabled if cart is empty)
- Pull-to-refresh (not needed for cart since it's local state, but
  consistency with other screens)

**Why no "edit item" button:** Editing a configured item is complex — it
means re-entering the configurator with pre-filled state, which requires
the configurator store to support initialization from a cart item. This
is deferred. For now, the customer removes the item and re-configures.
This is the same pattern used by Nike By You and Indochino.

### 3. Order Success Screen

Shown after successful order creation (both express and cart checkout).

- Large checkmark icon
- **"Order Placed!"** heading (or "Orders Placed!" for multi-item)
- Summary card(s):
  - For single item: product name, fabric, option count, price
  - For multi-item: list of items with names and prices, total at bottom
- Status badge: **PLACED**
- Note: "Visit the shop to get measured. We'll start production once
  your measurements are on file."
  (Reminds the customer of the in-person measurement requirement)
- **"View My Orders"** button → navigates to Home (where orders are listed)
- **"Continue Shopping"** button → navigates to Products tab

### 4. Home Screen — My Orders Section

The home screen (currently just "You are logged in!" + Sign Out) gets
a new section:

- **"My Orders"** section header
- List of recent orders (most recent first, limited to 5)
- Each order row shows:
  - Product name
  - Fabric name
  - Status badge (color-coded: PLACED = blue, IN_PRODUCTION = amber, etc.)
  - Date placed
- "View All Orders" link if more than 5 orders exist → navigates to a
  dedicated orders list screen (hidden tab, `href: null`)
- Empty state: "No orders yet. Start by browsing our products."

---

## Implementation Steps

| # | Step | Files | Status |
|---|---|---|---|
| 1 | Schema: add `fabric_meters` to products + nullable `measurement_snapshot` | `supabase/migrations/add_fabric_meters.sql`, `supabase/migrations/nullable_measurement_snapshot.sql`, `src/types/index.ts` | [ ] |
| 2 | Price calculation utility + tests (TDD) | `src/features/orders/utils/calculatePrice.ts`, `src/features/orders/__tests__/calculatePrice.test.ts` | [ ] |
| 3 | Update ReviewSummary to use `calculatePrice` | `ReviewSummary.tsx` | [ ] |
| 4 | Cart Zustand store + tests (TDD) | `src/stores/cartStore.ts`, `src/stores/__tests__/cartStore.test.ts` | [ ] |
| 5 | Orders data layer — API + hooks | `src/features/orders/api.ts`, `src/features/orders/hooks.ts` | [ ] |
| 6 | Update configurator review — "Add to Cart" + "Place Order Now" | `app/(app)/configurator.tsx`, `ReviewSummary.tsx` | [ ] |
| 7 | Cart tab — UI + layout | `app/(app)/cart.tsx`, `app/(app)/_layout.tsx` | [ ] |
| 8 | Cart item card component | `src/features/orders/components/CartItemCard.tsx` | [ ] |
| 9 | Cart checkout → order creation | `app/(app)/cart.tsx` (Place Order button logic) | [ ] |
| 10 | Order success screen | `app/(app)/order-success.tsx`, `app/(app)/_layout.tsx` | [ ] |
| 11 | Home screen — My Orders section | `app/(app)/index.tsx`, `src/features/orders/components/OrderRow.tsx` | [ ] |
| 12 | Orders list screen (View All) | `app/(app)/orders.tsx`, `app/(app)/_layout.tsx` | [ ] |
| 13 | Maestro E2E tests | `.maestro/orders/` | [ ] |

---

## Data Layer

### Schema Migration: Nullable `measurement_snapshot`

```sql
-- Measurements are taken in-person by the tailor, not entered by the customer.
-- Orders are placed before measurements are taken, so this must be nullable.
ALTER TABLE public.orders
  ALTER COLUMN measurement_snapshot DROP NOT NULL;
```

### Schema Migration: `fabric_meters` on Products

```sql
ALTER TABLE public.products ADD COLUMN fabric_meters numeric NOT NULL DEFAULT 2.5;

-- Backfill seed data with product-specific values
UPDATE public.products SET fabric_meters = 3.5 WHERE name = 'Two-Piece Suit';
UPDATE public.products SET fabric_meters = 2.5 WHERE name = 'Dress Shirt';
UPDATE public.products SET fabric_meters = 1.8 WHERE name = 'Trousers';
```

The `Product` TypeScript type gets `fabric_meters: number`.

### Price Calculation Utility (`src/features/orders/utils/calculatePrice.ts`)

Extracted to a shared function used by ReviewSummary, cart, and order creation:

```typescript
/**
 * Calculates total order price for a configured item.
 *
 * Formula: base_price + (fabric.price_per_meter × product.fabric_meters)
 *          + Σ(option.price_modifier)
 */
function calculatePrice(
  basePrice: number,
  fabricPricePerMeter: number,
  fabricMeters: number,
  selectedOptions: Record<string, ProductOption>,
): number {
  const fabricCost = fabricPricePerMeter * fabricMeters;
  const optionModifiers = Object.values(selectedOptions).reduce(
    (sum, opt) => sum + opt.price_modifier,
    0,
  );
  return basePrice + fabricCost + optionModifiers;
}
```

### Orders API (`src/features/orders/api.ts`)

- `createOrder(data)` — insert a single order row, returns created order
- `createOrders(items[])` — insert multiple order rows (cart checkout),
  returns array of created orders
- `fetchOrders(profileId)` — all orders for a customer, ordered by
  `created_at DESC`
- `fetchOrderById(orderId)` — single order with full details (future use)

### Orders Hooks (`src/features/orders/hooks.ts`)

- `useCreateOrder()` — mutation for single-item express checkout
- `useCreateOrders()` — mutation for cart checkout (batch insert)
- `useOrders()` — cached order list for home screen + orders list screen
- `useOrder(id)` — single order (future use for detail view)

### Order Payload

When creating an order (from either flow), the payload is:

```typescript
{
  profile_id: session.user.id,
  product_id: product.id,
  fabric_id: fabric.id,

  // JSONB snapshot of all selected options — immutable record of what
  // the customer chose, decoupled from future catalog changes
  chosen_options: selectedOptions,

  // Null for now — tailor attaches measurements after in-person visit
  measurement_snapshot: null,

  current_status: "PLACED",
  status_history: [{
    status: "PLACED",
    timestamp: new Date().toISOString(),
    note: null,
  }],

  // Base + fabric (price_per_meter × fabric_meters) + option modifiers
  final_price: calculatePrice(
    product.base_price, fabric.price_per_meter,
    product.fabric_meters, selectedOptions
  ),

  customer_notes: customerNotes || null,
  internal_notes: null,
}
```

---

## Cart Zustand Store (`src/stores/cartStore.ts`)

```typescript
interface CartItem {
  id: string;               // Client-side UUID for identification
  product: Product;         // Full product object (for display)
  fabric: Fabric;           // Full fabric object (for display)
  selectedOptions: Record<string, ProductOption>;
  customerNotes: string;
  price: number;            // Pre-calculated: base + option modifiers
  addedAt: string;          // ISO timestamp
}

interface CartStore {
  // State
  items: CartItem[];

  // Actions
  addItem: (item: Omit<CartItem, 'id' | 'addedAt' | 'price'>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;

  // Computed
  totalPrice: () => number;
  itemCount: () => number;
}
```

**Why store full Product/Fabric objects (not just IDs):**
Cart items need to display product name, fabric name, images, and prices
without re-fetching from Supabase. Storing the full objects at add-time
also acts as a snapshot — if the catalog changes while items are in the
cart, the customer sees what they selected, not the updated catalog.

**Why `price` is pre-calculated at add-time:**
The price shown in the cart must exactly match what was shown on the
configurator review screen. The price is calculated via `calculatePrice(
product.base_price, fabric.price_per_meter, product.fabric_meters,
selectedOptions)` at add-time. Recalculating from stored objects should
give the same result, but pre-calculating eliminates any risk of drift.

**Why no persistence (AsyncStorage):**
Cart data lives only in memory for now. If the app is killed, the cart is
lost. This is acceptable for MVP — bespoke orders are considered purchases,
not casual browsing. Persistence can be added later by wrapping the store
with `zustand/middleware/persist`. The store API stays the same.

---

## Navigation Changes

### Tab Bar Update

```
Home | Fabrics | Products | Cart
```

Cart tab shows a badge with the item count when > 0.

### New Screens in `_layout.tsx`

```tsx
<Tabs.Screen name="cart" options={{
  title: "Cart",
  tabBarLabel: "Cart",
  tabBarAccessibilityLabel: "Cart",
  // tabBarBadge: itemCount > 0 ? itemCount : undefined
}} />

<Tabs.Screen name="order-success" options={{
  title: "Order Placed",
  href: null,  // Hidden from tab bar
}} />

<Tabs.Screen name="orders" options={{
  title: "My Orders",
  href: null,  // Hidden from tab bar, accessed from Home
}} />
```

### Navigation Flow

**Express checkout:**
```
Configurator → "Place Order Now"
  → createOrder() mutation
  → on success: reset configurator store
  → router.replace("/order-success")
```

**Cart checkout:**
```
Configurator → "Add to Cart"
  → addItem to cart store
  → reset configurator store
  → router.replace("/products") + show confirmation toast

Cart tab → "Place Order"
  → createOrders() mutation (one order per cart item)
  → on success: clearCart()
  → router.replace("/order-success")
```

**Why `router.replace` for success screen:**
After an order is placed, going "back" to the configurator or cart would
show empty/stale state (stores are cleared). `replace` prevents this by
removing the previous screen from the navigation stack.

---

## Status Badge Colors

Used on the home screen order rows and order success screen:

| Status | Color | Label |
|---|---|---|
| PLACED | Blue (#3b82f6) | Placed |
| IN_PRODUCTION | Amber (#f59e0b) | In Production |
| READY_FOR_TRIAL | Purple (#8b5cf6) | Ready for Trial |
| TRIAL_COMPLETE | Indigo (#6366f1) | Trial Complete |
| ALTERATIONS | Orange (#f97316) | Alterations |
| READY_FOR_DELIVERY | Emerald (#10b981) | Ready for Delivery |
| DELIVERED | Green (#22c55e) | Delivered |

---

## TDD Test Plan

### Cart Store Tests (`src/stores/__tests__/cartStore.test.ts`)

**Initial state:**
- Cart starts empty (items = [])
- totalPrice() returns 0
- itemCount() returns 0

**addItem:**
- Adds item with auto-generated id and addedAt timestamp
- Calculates price from base_price + option modifiers
- Multiple items accumulate in the array
- Adding same product+fabric+options creates a separate cart item
  (not merged — each configured item is unique in bespoke tailoring)

**removeItem:**
- Removes item by id
- No-op if id doesn't exist
- Other items are unaffected

**clearCart:**
- Empties the items array
- totalPrice() returns 0 after clear

**totalPrice:**
- Returns sum of all item prices
- Correct with mixed positive and negative option modifiers

**itemCount:**
- Returns items.length

### Price Calculation Tests (`src/features/orders/__tests__/calculatePrice.test.ts`)

- Base price only (no fabric cost, empty options) → returns base_price
- Base + fabric cost (price_per_meter × fabric_meters) → correct total
- Base + single positive option modifier → base + modifier
- Base + single negative option modifier → base - modifier
- Base + fabric + multiple mixed modifiers → correct total
- Different fabric_meters values (suit=3.5, shirt=2.5, trousers=1.8)
- Zero fabric price → base + modifiers only
- Zero base price → fabric + modifiers only
- All zero modifiers → base + fabric only

### Order Creation Tests (`src/features/orders/__tests__/orderCreation.test.ts`)

- Order payload has correct profile_id
- chosen_options is a snapshot (not reference)
- measurement_snapshot is null
- status_history has exactly one PLACED entry with timestamp
- final_price matches calculatePrice output
- customer_notes passed through (or null if empty)

---

## Maestro E2E Tests

### `.maestro/orders/express-checkout.yaml`
Login → Products → configure a product (fabric + all options) →
Review → "Place Order Now" → verify Order Success screen →
verify "Order Placed!" message → "Continue Shopping" → verify
on Products tab → cleanup (logout)

### `.maestro/orders/add-to-cart.yaml`
Login → Products → configure a product → Review → "Add to Cart" →
verify confirmation → verify back on Products tab → navigate to
Cart tab → verify item appears in cart with correct product name
and price → cleanup (logout)

### `.maestro/orders/cart-checkout.yaml`
Login → Products → configure first product → "Add to Cart" →
configure second product → "Add to Cart" → Cart tab → verify
2 items → verify total price → "Place Order" → verify Order
Success screen shows both items → cleanup (logout)

### `.maestro/orders/cart-remove-item.yaml`
Login → Products → configure product → "Add to Cart" → Cart tab →
verify item present → remove item → verify empty cart state →
cleanup (logout)

### `.maestro/orders/home-my-orders.yaml`
Login → Products → configure product → "Place Order Now" →
Order Success → "View My Orders" → verify Home screen shows
the order with PLACED badge → cleanup (logout)

---

## Files Created / Modified Summary

### New Files

| File | Purpose |
|---|---|
| `src/features/orders/Plan.MD` | This plan |
| `src/features/orders/utils/calculatePrice.ts` | Shared price calculation |
| `src/features/orders/__tests__/calculatePrice.test.ts` | TDD price tests |
| `src/features/orders/components/CartItemCard.tsx` | Cart item display card |
| `src/features/orders/api.ts` | Supabase order queries |
| `src/features/orders/hooks.ts` | React Query order hooks |
| `src/features/orders/__tests__/orderCreation.test.ts` | TDD order payload tests |
| `src/features/orders/components/OrderRow.tsx` | Order list row with status badge |
| `src/features/orders/components/StatusBadge.tsx` | Color-coded status pill |
| `src/stores/cartStore.ts` | Cart Zustand store |
| `src/stores/__tests__/cartStore.test.ts` | TDD cart store tests |
| `app/(app)/cart.tsx` | Cart tab screen |
| `app/(app)/order-success.tsx` | Order success screen |
| `app/(app)/orders.tsx` | Full orders list screen |
| `supabase/migrations/add_fabric_meters.sql` | Add fabric_meters to products |
| `supabase/migrations/nullable_measurement_snapshot.sql` | Make measurement_snapshot nullable |
| `.maestro/orders/*.yaml` | E2E tests |

### Modified Files

| File | Change |
|---|---|
| `app/(app)/_layout.tsx` | Add Cart tab + hidden order-success, orders screens |
| `app/(app)/configurator.tsx` | Replace "Place Order" with "Add to Cart" + "Place Order Now" |
| `src/features/configurator/components/ReviewSummary.tsx` | Use `calculatePrice`, show fabric cost as `price_per_meter × fabric_meters` |
| `app/(app)/index.tsx` | Add My Orders section with order rows |
| `src/types/index.ts` | Add `fabric_meters: number` to `Product` interface |
| `CLAUDE.md` | Update current status checklist |

---

## Open Questions (Discuss Before Implementing)

1. **Cart badge on tab bar.** Should the Cart tab icon show a numeric badge
   (e.g., "3") when items are in the cart? This is standard e-commerce UX
   but requires dynamically updating the tab bar options from the cart store.
   Expo Router supports `tabBarBadge` — the question is just whether we
   wire it up now or later.

2. **Toast library for "Added to Cart" confirmation.** When the customer
   taps "Add to Cart", they need visual confirmation before being navigated
   away. Options: (a) simple `Alert.alert()`, (b) a toast/snackbar library
   like `react-native-toast-message` or `burnt`, (c) inline confirmation
   text on the review screen before navigating. Which approach?

3. **Cart persistence.** Should the cart survive app restarts? If yes, we
   add `zustand/middleware/persist` with `AsyncStorage`. If no, cart is
   lost when the app is killed. For MVP, no persistence is simpler — but
   losing a carefully configured suit because the app was backgrounded
   too long could frustrate customers.

4. **Order success screen — navigate to orders list or home?** The "View
   My Orders" button could go to the Home screen (which now shows orders)
   or to the dedicated orders list screen. Home is more discoverable but
   orders are mixed with other content. Dedicated screen is cleaner but
   adds another screen to maintain.

5. **Express checkout confirmation.** Should "Place Order Now" show a
   confirmation dialog ("Place order for $X?") before creating the order?
   Cart checkout has the cart screen as a natural confirmation step, but
   express checkout goes straight from review to order creation. A dialog
   prevents accidental orders.
