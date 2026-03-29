# Alterations Flow — Implementation Plan

## Overview

Allow customers to request post-delivery alterations on completed orders,
track alteration status, and view alteration history. This is the final
core feature completing the customer journey:
**browse → configure → order → track → request alterations**.

---

## Architecture Decisions

- **Separate table, not order statuses.** Alterations have distinct business
  logic (chargeable, repeatable per order, different lifecycle). Already
  modeled this way in the schema.
- **Follow the orders feature pattern exactly:** `api.ts` → `hooks.ts` →
  components. All Supabase calls in `api.ts`, React Query in `hooks.ts`.
- **TDD throughout.** Failing tests first, then implementation.
- **No new libraries.** Everything needed already exists in the stack.

---

## Phases

### Phase 1: Data Layer (api.ts + hooks.ts) ← START HERE
Write the Supabase query functions and React Query hooks.

**API functions:**
- `fetchAlterationsByOrder(orderId)` — get all alterations for an order
- `fetchAlterationsByProfile(profileId)` — get all alterations for a customer
- `createAlteration(input)` — submit a new alteration request
- `fetchAlterationById(alterationId)` — get single alteration detail

**React Query hooks:**
- `useAlterationsByOrder(orderId)` — list alterations on order detail screen
- `useAlterationsByProfile(profileId)` — list all customer's alterations
- `useAlteration(alterationId)` — single alteration detail
- `useCreateAlteration()` — mutation with cache invalidation

**Tests (write first):**
- [x] `api.test.ts` — 27 tests: payload construction, Supabase mock calls, error handling
- [x] `hooks.test.tsx` — 13 tests: query keys, enabled flags, cache invalidation on create

### Phase 2: Request Alteration UI
- Alteration request form (description, charge amount display, optional notes)
- "Request Alteration" CTA on order detail screen (only when status = DELIVERED)
- Form validation (description required, min length)
- Navigation: order detail → alteration request screen

**Tests:**
- [x] Form validation logic (description required, min 10 chars, trim whitespace)
- [x] CTA visibility based on order status (DELIVERED only)
- [x] Form submission calls onSubmit with correct data
- [x] Pending state (loading text, disabled button)

### Phase 3: Alteration Tracking UI
- `AlterationStatusBadge` component (reuse pattern from `StatusBadge`)
- Alteration detail screen (description, status, charge, timestamps)
- Alteration list on order detail screen (show all alterations for that order)
- "My Alterations" section accessible from orders/home

**Tests:**
- [x] AlterationStatusBadge renders correct label for all 5 statuses (5 tests)
- [x] AlterationRow renders description, status, date, chevron + onPress (6 tests)
- [x] Detail screen built with status badge, charge, timestamps, notes, guidance

### Phase 4: Integration & Polish
- Wire alteration list into order detail screen
- Add alteration count/indicator to OrderRow
- Navigation between order detail ↔ alteration detail ↔ request form
- Error states and loading skeletons

---

## Progress

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Data Layer | ✅ Complete | 40 tests passing (27 api + 13 hooks) |
| Phase 2: Request UI | ✅ Complete | 11 form tests + screen + CTA on order detail |
| Phase 3: Tracking UI | ✅ Complete | 11 component tests + detail screen + alteration list on order detail |
| Phase 4: Integration | ✅ Complete | Alteration list wired into order detail, navigation connected |

---

### Phase 5: Maestro E2E Tests
- [x] `request-alteration.yaml` — full flow: find DELIVERED order → request alteration → verify it appears
- [x] `alteration-detail.yaml` — navigate to alteration detail screen → verify content
- [x] `all.yaml` — suite runner (request first, then detail)

---

## Key Files (will be created)

```
src/features/alterations/
  api.ts                    — Supabase query functions
  hooks.ts                  — React Query hooks
  components/
    AlterationStatusBadge.tsx
    AlterationRow.tsx
    AlterationRequestForm.tsx
  __tests__/
    api.test.ts
    hooks.test.ts
    AlterationStatusBadge.test.tsx
    AlterationRow.test.tsx

app/(app)/(home)/
  alteration-request.tsx    — Request form screen
  alteration-detail.tsx     — Alteration detail screen
```

## Reference

- Alteration type: `/src/types/index.ts` (lines 287-329)
- AlterationStatus enum: `/src/types/index.ts` (lines 42-48)
- Schema: `/supabase/init_schema.sql` (lines 116-136)
- RLS: `/supabase/rls_policies.sql` (lines 114-131)
- Orders pattern to follow: `/src/features/orders/api.ts`, `hooks.ts`
