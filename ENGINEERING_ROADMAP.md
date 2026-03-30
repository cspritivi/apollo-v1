# Engineering Roadmap — Advanced Topics & Future Features

This document covers advanced software engineering topics, infrastructure improvements,
and future feature ideas for the Apollo tailoring app. It serves as a reference for
planning, interview preparation, and architectural decisions.

Last updated: 2026-03-30

---

## Table of Contents

- [Issues Worth Creating](#issues-worth-creating)
- [Engineering Infrastructure](#engineering-infrastructure)
- [Future / Experimental](#future--experimental)
- [Detailed Topic Research](#detailed-topic-research)
- [Suggested Priority Order](#suggested-priority-order)

---

## Issues Worth Creating

### Stripe Payment Integration

CLAUDE.md lists this as an open decision. You can't ship a real shopping app without it.

- Payment intents created server-side via Supabase Edge Functions (secret key never on client)
- `@stripe/stripe-react-native` requires moving from Expo Go to EAS Build
- Deposit + balance payment model fits bespoke tailoring (pay 50% upfront, rest before delivery)
- India-specific: UPI support via Stripe's India payment methods, RBI compliance for recurring payments
- This is a **prerequisite for going live** and a strong portfolio piece showing server/client payment architecture

**Architecture:**

```
Client (RN)                    Server (Edge Function)         Stripe
    |                                |                          |
    |-- Request payment intent ----->|                          |
    |                                |-- Create PaymentIntent ->|
    |                                |<- client_secret ---------|
    |<- Return client_secret --------|                          |
    |-- Confirm with PaymentSheet -------------------------------->|
    |<- Payment result -------------------------------------------|
```

The Stripe secret key (`sk_...`) lives only in the Supabase Edge Function. The client only
sees the publishable key (`pk_...`) and the `client_secret` for a specific payment intent.

For the app: order placement creates a payment intent via Edge Function, alteration charges
create a separate payment intent, and `stripe_payment_intent_id` is stored on the
orders/alterations table for reconciliation.

---

### XState for Order Lifecycle

CLAUDE.md already describes the order lifecycle as a state machine and notes it as an
interview talking point. Formalize it with XState v5.

- Replace manual status checks with XState machine definitions
- Invalid transitions become impossible (can't go PLACED -> DELIVERED)
- Guarded transitions (TRIAL_COMPLETE -> ALTERATIONS only if `needsAlterations` is true)
- Visualizable at stately.ai/viz — paste your machine definition and get a state diagram
- Model-based testing generates all valid state paths automatically
- Works alongside Zustand (XState for order flow, Zustand for cart/UI)

**Example:**

```typescript
import { setup } from 'xstate';

const orderMachine = setup({
  types: {
    context: {} as { orderId: string; statusHistory: StatusEntry[] },
    events: {} as
      | { type: 'START_PRODUCTION' }
      | { type: 'MARK_READY_FOR_TRIAL' }
      | { type: 'COMPLETE_TRIAL'; needsAlterations: boolean }
  },
}).createMachine({
  id: 'order',
  initial: 'placed',
  states: {
    placed: { on: { START_PRODUCTION: 'inProduction' } },
    inProduction: { on: { MARK_READY_FOR_TRIAL: 'readyForTrial' } },
    readyForTrial: {
      on: {
        COMPLETE_TRIAL: [
          { guard: ({ event }) => event.needsAlterations, target: 'alterations' },
          { target: 'readyForDelivery' },
        ],
      },
    },
    // ... etc
  },
});
```

**Benefits over manual state management:**

- Invalid transitions are impossible (compile-time safety)
- Visualizable (paste machine definition into stately.ai/viz)
- Testable (model-based testing generates all valid paths)
- Self-documenting (the machine IS the spec)

Integration: `@xstate/react` provides `useMachine` hook. Works alongside existing
Zustand stores (XState for order lifecycle, Zustand for cart/UI state).

---

### CI/CD Pipeline (GitHub Actions + EAS Build)

160+ tests exist but no automated pipeline runs them on PRs.

- GitHub Actions workflow: type-check (`tsc --noEmit`) + lint (`eslint`) + test (`jest --coverage`) on every push/PR
- EAS Build integration: trigger preview builds on merges to main
- EAS Update for over-the-air JS bundle updates (bug fixes without new binary)
- Free tier is sufficient (30 EAS builds/month)

**Recommended pipeline:**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
      - run: npm ci
      - run: npx tsc --noEmit          # Type check
      - run: npm test -- --coverage     # Jest tests
      - run: npx eslint src/            # Lint

  eas-build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform all --non-interactive --profile preview
```

**EAS Build profiles** (in `eas.json`):

- `development` — dev client with debug tools
- `preview` — internal testing (TestFlight/internal track)
- `production` — store submission

---

### Analytics and Crash Reporting

No visibility into how customers actually use the app.

- **Sentry** (`@sentry/react-native`) for crash reporting — automatic stack traces with source maps via EAS Build. Free tier: 5K errors/month, 10K performance transactions/month.
- **PostHog** (open-source, 1M free events/month) for product analytics: configurator completion rate, drop-off step, fabric popularity, order conversion funnel.
- **Mixpanel** alternative: more mature mobile analytics but proprietary. Free tier: 20M events/month.
- Track which configurator step has the highest abandonment — this directly informs UX priorities.

Recommendation: Sentry for crashes + PostHog for analytics. Both have generous free tiers
and the combination covers error monitoring, performance, and product analytics.

---

### Offline Catalog Browsing

Customers lose connectivity (subway, rural areas, in-flight).

- React Query persistence via `@tanstack/query-async-storage-persister` — caches server responses to AsyncStorage, restores on restart
- Not full offline-first (orders still require connectivity), but fabrics/products are browsable offline from cache
- Lightweight to implement, demonstrates understanding of the online/offline spectrum

---

### Internationalization (i18n) Foundation

Even if launching in one language, centralizing all strings now prevents a painful retrofit later.

- `react-i18next` with namespace-based translation files (`en/catalog.json`, `hi/catalog.json`)
- Interpolation: `t('order.status', { status: 'DELIVERED' })`
- Pluralization: `t('items', { count: 3 })` -> "3 items"
- Multi-currency via `Intl.NumberFormat` (already in Hermes)
- RTL support (React Native has built-in RTL via `I18nManager`) — important if serving Middle East markets
- Store currency preference in `profiles` table
- Interview talking point: "We architected for internationalization from day one"

---

### Accessibility Audit and WCAG Compliance

Often overlooked in portfolio projects but interviewers at serious companies notice.

- Minimum 44x44pt touch targets on all pressables (iOS HIG) / 48x48dp (Material)
- Color contrast ratio 4.5:1 for text, 3:1 for large text. Test your indigo `#4f46e5` on white/gray backgrounds
- `accessibilityRole`, `accessibilityLabel`, `accessibilityHint` on all interactive elements
- Respect `useReducedMotion()` from Reanimated for users who disable animations
- Fabric colors must have text labels, not just color circles (color-blind users)
- Screen reader flow through the configurator needs logical focus order
- Dynamic type: support system font scaling (`allowFontScaling` is default true in RN)

**Testing tools:**

- iOS: Xcode Accessibility Inspector, VoiceOver
- Android: Android Accessibility Scanner, TalkBack
- Automated: `@testing-library/react-native` queries by role/label mirror real accessibility tree

---

### Deep Linking and Universal Links

Required for push notifications (tap -> open specific order), group order invites, and share flows.

- Expo Router gives automatic deep linking from file structure
- URL scheme: `tailor-app://order/123` opens order detail
- Universal links: `https://app.yourtailor.com/order/123` opens the app or falls back to web
- Needed for: push notification tap targets, group order invite codes, email links, QR codes in-store

**Setup for universal links:**

1. iOS: Host `apple-app-site-association` file at `https://yourdomain.com/.well-known/apple-app-site-association`
2. Android: Host `assetlinks.json` at `https://yourdomain.com/.well-known/assetlinks.json`
3. Configure in `app.json` under `expo.ios.associatedDomains` and `expo.android.intentFilters`

---

## Engineering Infrastructure

These aren't feature issues but they'll make everything else easier. Do these before
tackling the 12 feature issues.

### 1. Move to EAS Build / Dev Client

Push notifications, Stripe, and several other issues require native builds. Do this first.

```bash
npx expo install expo-dev-client
eas build --profile development --platform ios
eas build --profile development --platform android
```

**Why:** Expo Go cannot receive push notifications with custom configuration, cannot run
custom native modules (Stripe, Sentry), and cannot produce production binaries.

**EAS Submit** automates store uploads:
- `eas submit --platform ios` — uploads to App Store Connect
- `eas submit --platform android` — uploads to Google Play Console

---

### 2. Set Up GitHub Actions CI

Wire your 160+ tests into GitHub Actions so PRs are automatically validated. This
protects you as the codebase grows with 12+ new features. See the pipeline YAML above.

---

### 3. Add Sentry Crash Reporting

Shows production readiness. Works with Expo via `@sentry/react-native` + Sentry
Expo plugin in `app.config.js`. EAS Build automatically uploads source maps for
readable stack traces.

---

### 4. Switch from `<Image>` to `expo-image`

Your fabric catalog will grow. `expo-image` (built on SDWebImage/Glide) gives you
blurhash placeholders, caching, and progressive loading. One find-and-replace now
saves performance issues later.

---

### 5. Consider FlashList over FlatList

Shopify's `@shopify/flash-list` recycles cells like native list views. When your
fabric catalog hits 100+ items, FlatList will stutter on mid-range Android. FlashList
is a drop-in replacement.

---

## Future / Experimental

These are things to mention in interviews and keep an eye on. Not issues yet.

### AI Body Measurement Estimation

- Google's **MediaPipe** can estimate body landmarks from two photos (front + side). Community RN bridge exists (`react-native-mediapipe`).
- Customer takes photos with a reference object (credit card for scale) -> pose estimation -> approximate measurements.
- Accuracy is within 1-2 inches — useful as a starting point, not a replacement for tape measurement. The tailor refines during trial.
- **Core ML / TensorFlow Lite** for custom models. Training a measurement estimation model requires a labeled dataset of photos + ground-truth measurements.
- **Supabase pgvector** can store body measurement embeddings for finding similar body types and recommending adjustments based on what worked for similar customers.
- This is a genuine portfolio differentiator. Even a prototype shows ML integration skills.

---

### AR Fabric Preview

- **ViroReact** — Most established AR library for React Native. Supports ARKit (iOS) and ARCore (Android). However, maintenance has been inconsistent; community-maintained. Compatibility with RN 0.76+ New Architecture is uncertain.
- **expo-three / expo-gl** — WebGL rendering in Expo. Can render 3D models but not true AR (no camera integration or surface detection).
- **Reality Kit (iOS)** — Apple's AR framework. No direct RN bridge; would require a native module or Swift UI bridge.
- **Native AR modules** — Most reliable approach is building a native Swift (ARKit) or Kotlin (ARCore) view and bridging to React Native via Fabric/Turbo Modules.

**Practical AR for a tailoring app:**

- Virtual fabric draping: show how a fabric looks on a mannequin/avatar. Requires 3D cloth simulation — complex but achievable with pre-rendered assets.
- Body scanning: Apple's LiDAR (iPhone 12 Pro+) can create a 3D body mesh. Most accurate consumer measurement tool but requires native iOS development.
- Simpler alternative: use the phone camera as a "mirror" with an overlay showing suit style outlines. Not true AR but visually effective and simpler.

**Recommendation:** The 3D configurator (issue #17) achieves 80% of the value without
AR complexity. Mention the AR vision in interviews, be honest about the implementation gap.

---

### React Native New Architecture (2025 Status)

If you're on Expo SDK 52+ (RN 0.76+), you're already on it by default.

**What's stable:**

- **JSI (JavaScript Interface)** — C++ bridge replacement. All major libraries have migrated.
- **Fabric Renderer** — Synchronous layout, concurrent features. Default since RN 0.76.
- **Turbo Modules** — Lazy-loaded native modules that initialize on first use (not at startup). Improves cold start time by 20-40%.
- **Bridgeless Mode** — Completely removes the legacy bridge. Default in RN 0.76+.
- **Codegen** — Generates C++ type-safe bindings from TypeScript specs.

**React Compiler (React 19):** Auto-memoizes components and hooks, reducing the need
for manual `useMemo`/`useCallback`. Expo SDK 52+ supports this.

Understanding what Fabric/JSI/Turbo Modules actually do (synchronous JS-native calls,
lazy module loading, C++ bindings) is a strong interview topic.

---

### Supabase Realtime for Live Order Tracking

Instead of polling or manual refresh, subscribe to Postgres changes:

```typescript
supabase.channel('orders')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders',
    filter: `customer_id=eq.${userId}`,
  }, (payload) => {
    // Order status updated in real-time
  })
  .subscribe();
```

Customer opens order detail -> status updates live without refresh. Already available
in Supabase, no Edge Functions needed. Worth implementing alongside push notifications.

---

### Monorepo (When Admin Panel Comes)

Relevant when adding a web-based admin panel alongside the mobile app.

**Turborepo structure:**

```
/apps
  /mobile          # Current Expo app
  /admin           # Future React web admin panel
/packages
  /shared-types    # TypeScript types (Order, Fabric, etc.)
  /supabase-client # Shared Supabase client configuration
  /ui              # Shared design tokens (colors, spacing)
```

Your clean `/src/types` folder is already extraction-ready. Don't set this up now —
the overhead isn't justified until you have a second app. But knowing the pattern is
valuable for interviews.

---

### Animations and Micro-interactions

- **Reanimated 3** — Runs animations on the UI thread via worklets. Zero bridge crossings. For: configurator step transitions, card selection animations, order status progress.
- **Moti** — Built on Reanimated, provides declarative API like Framer Motion. `<MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} />`. For: page transitions, list item enter animations.
- **Lottie** (`lottie-react-native`) — Renders After Effects animations as JSON. For: order placed celebration, delivery animation, branded loading states.
- A custom thread-and-needle pull-to-refresh animation would be a memorable touch.

**Practical animation ideas:**

- Configurator step transitions with horizontal slide + fade
- Fabric card selection with subtle scale + border color spring
- Order status timeline with staggered node reveal
- Cart badge bounce when item is added
- Pull-to-refresh with branded animation

---

### Offline-First Deep Dive

**WatermelonDB:**

- High-performance local SQLite database with lazy loading and sync capabilities.
- Models defined in JS, synced to a remote backend via push/pull protocol.
- **Tradeoff:** Adds significant complexity. Best for apps where offline creation is a core requirement (field service apps). Your app is primarily online (orders require server confirmation).

**React Query Persistence (recommended for your app):**

- `@tanstack/query-persist-client-core` + `@tanstack/query-async-storage-persister`
- Caches server responses to AsyncStorage and restores on restart
- Not true offline-first, but "stale data available offline"
- Your existing "no optimistic mutations" rule for financial transactions is correct

---

### Security Deep Dive

**Supabase RLS Patterns:**

- Ensure every table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- Use `auth.uid()` in policies to scope data to authenticated user
- The `service_role` key bypasses RLS — never expose it to the client
- `.env.local` should only have the `anon` key

**Token Handling:**

- Supabase JS client stores session in AsyncStorage by default — acceptable for most apps
- For high-security: use `expo-secure-store` (Keychain on iOS, Keystore on Android) with custom storage adapter
- Token refresh is automatic. Handle `TOKEN_REFRESHED` and `SIGNED_OUT` events.

**Input Validation:**

- Validate on client (UX) AND server (security)
- Measurement values should have CHECK constraints (e.g., `chest_cm > 0 AND chest_cm < 200`)
- Deep links that modify state must verify the authenticated user owns the resource

---

### App Store Submission Preparation

**iOS (App Store Connect):**

- App icons: 1024x1024 (no alpha, no rounded corners)
- Screenshots: required for each device size (6.7", 6.5", 5.5" minimum). Up to 10 per size.
- App Preview videos: optional but improve conversion. 15-30 seconds of key flows.
- Privacy Nutrition Labels: declare all data collection (email, measurements, analytics)
- `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` if adding photo features
- Review time: typically 24-48 hours. First submission may take longer.
- Common rejections: placeholder content, broken links, login required without demo account

**Android (Google Play Console):**

- Screenshots: minimum 2, maximum 8 per device type
- Feature graphic: 1024x500 (required)
- Content rating questionnaire: must complete
- Data safety section: similar to Apple's privacy labels
- Review time: usually a few hours to 1 day

**EAS Submit automates most of the upload:**
- `eas submit --platform ios` — App Store Connect
- `eas submit --platform android` — Google Play

For a portfolio project: you don't need to publish, but having screenshots, app preview,
and privacy declarations prepared demonstrates production readiness. Use TestFlight (iOS)
and internal testing track (Android) for sharing with interviewers.

---

## Detailed Topic Research

### Expo EAS Build vs Expo Go Limitations

**Features that require EAS Build or development builds:**

| Feature | Expo Go | EAS Build |
|---------|---------|-----------|
| Push notifications (custom config) | No | Yes |
| Custom native modules (Stripe, Sentry) | No | Yes |
| Background tasks (`expo-task-manager`) | No | Yes |
| In-app purchases | No | Yes |
| Custom app icons, splash, bundle ID | No | Yes |
| Hermes engine configuration | Fixed version | Configurable |
| Production binary | No | Yes |

Move to EAS Build when implementing push notifications. Use `npx expo install expo-dev-client`
to create a development build that mirrors production while retaining fast refresh.

---

### React Native Performance Optimization (2025)

**Practical optimizations for the tailoring app:**

- **FlashList over FlatList** — Shopify's `@shopify/flash-list` recycles cells like UICollectionView/RecyclerView. For fabric catalog (20 items now, 100+ later), FlashList provides consistent 60fps.
- **expo-image** — Built on SDWebImage/Glide. Blurhash placeholders, caching, progressive loading. Critical for fabric images from Supabase Storage.
- **Memoization** — Client-side fabric filtering with `useMemo` is correct. Use `React.memo()` on FabricCard and ProductCard to prevent re-renders.
- **Bundle size** — Use `npx expo export` with tree-shaking. Import specific functions, not entire libraries.
- **React Compiler (React 19)** — Auto-memoizes. Expo SDK 52+ supports it.

---

### React Native Testing Strategies

**E2E Comparison:**

| Tool | Pros | Cons | Best For |
|------|------|------|----------|
| Maestro | YAML-based, easy setup, good DX, works with Expo Go | Limited Windows support, less mature | Quick E2E for Expo |
| Detox | Fast, reliable, built for RN, gray-box testing | Requires native builds, complex setup | Production-grade E2E |
| Appium | Cross-platform, language-agnostic, large ecosystem | Slow, heavy, complex config | Enterprise apps |

**Component/Unit Testing:**

- **React Native Testing Library (RNTL)** — Tests behavior, not implementation.
- **Jest** — Already the test runner (160+ tests).
- **MSW (Mock Service Worker)** — For mocking Supabase API calls without hitting real backend.

When moving to EAS builds, consider adding Detox for reliable CI-based E2E tests.

---

### Supabase Edge Functions

Deno-based serverless functions running on Supabase's infrastructure.

**Key use cases:**

- Order status change webhooks (send push notification on status update)
- Payment processing (Stripe payment intents with server-side secret key)
- Scheduled jobs via `pg_cron` (daily order summaries)
- Image processing (resize fabric images on upload)

**Structure:**

```
/supabase
  /functions
    /notify-order-status
      index.ts    # Deno TypeScript
    /process-payment
      index.ts
```

**Deployment:** `supabase functions deploy notify-order-status`

---

### Customer Loyalty / Rewards Programs

Not immediately needed but the schema should not make it hard to add later.

- Points per purchase: `loyalty_points` column on `profiles` or separate `loyalty_transactions` table
- Tiered membership (Bronze/Silver/Gold) with escalating perks
- Referral bonuses ("Refer a friend, both get $X off")
- Birthday/anniversary perks
- Repeat customer discounts after N orders

---

### Social Features and Sharing

- **Share configuration** — Generate a shareable link or image of a configured garment
- **Wedding party / group orders** (issue #32) — Major revenue driver
- **Social media share** — Share completed order or review to Instagram/Facebook
- **Stylist sharing** — Tailor creates configuration and sends to customer for approval

---

## Suggested Priority Order

### Before starting the 12 feature issues:

1. Move to EAS Build / dev client
2. Set up GitHub Actions CI
3. Add Sentry crash reporting

### Then tackle issues roughly in this order:

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

**Medium effort features:**

11. Post-delivery fit check (#24)
12. Appointment booking (#26)
13. Fabric swatch ordering (#28)
14. Customer reviews (#31)

**High effort features:**

15. Wedding party / group orders (#32)
16. 3D garment configurator (#17)
17. Stripe payment integration
18. XState order lifecycle
19. i18n foundation
20. Accessibility audit
