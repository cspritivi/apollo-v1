# notify-order-status

Supabase Edge Function that fans out a push notification to every
registered device when an order's `current_status` changes.

## Deploy

```bash
npx supabase functions deploy notify-order-status --project-ref <your-ref>
```

This repo does NOT currently include `supabase/config.toml` or other CLI
scaffolding, so a fresh environment will not be reproducible from git
alone. Adding the scaffolding is tracked as a follow-up.

## Required environment variables

Set in the Supabase dashboard (Project → Edge Functions → Secrets):

| Name                         | Source                                  |
| ---------------------------- | --------------------------------------- |
| `SUPABASE_URL`               | Auto-injected by Supabase — no action   |
| `SUPABASE_SERVICE_ROLE_KEY`  | Auto-injected by Supabase — no action   |
| `EXPO_ACCESS_TOKEN`          | Optional, from expo.dev → Access Tokens |

`EXPO_ACCESS_TOKEN` is optional but strongly recommended for production —
it raises Expo's Push API rate limits from anonymous to authenticated tier.

## Database webhook configuration

Supabase dashboard → Database → Webhooks → **Create a new webhook**:

| Field                       | Value                                                      |
| --------------------------- | ---------------------------------------------------------- |
| Name                        | `notify-order-status`                                      |
| Table                       | `public.orders`                                            |
| Events                      | `UPDATE`                                                   |
| Method                      | HTTP POST                                                  |
| URL                         | `https://<project-ref>.supabase.co/functions/v1/notify-order-status` |
| HTTP Headers                | `Authorization: Bearer <service_role_key>`                 |
| HTTP Headers                | `Content-Type: application/json`                           |
| **Send previous row data**  | **MUST be enabled** — the function compares `record.current_status` against `old_record.current_status`. Without this, every UPDATE (including notes edits, internal-only changes) would notify. |

## Manual verification

1. Deploy the function.
2. In the Supabase dashboard, open a real order row and change
   `current_status` to the next valid transition.
3. On a registered Android device, the notification should arrive within
   a few seconds. Tap it → app opens on the order detail screen.

Run directly with curl for payload debugging:

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/notify-order-status \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "UPDATE",
    "table": "orders",
    "record":     { "id": "<order-uuid>", "profile_id": "<profile-uuid>", "current_status": "READY_FOR_TRIAL" },
    "old_record": { "id": "<order-uuid>", "profile_id": "<profile-uuid>", "current_status": "IN_PRODUCTION" }
  }'
```

## Known limitations

- **Receipt polling is not implemented.** Only ticket-level
  `DeviceNotRegistered` errors trigger token cleanup. Late failures
  (surfaced via Expo receipts) will leak stale tokens until a future
  reaper job is added.
- **No dedup on duplicate webhook deliveries.** Supabase may retry on
  transient failure, which can produce duplicate pushes for the same
  status change. Known limitation; a short-lived `(order_id, new_status)`
  dedup window is a planned follow-up.
- **No Deno test suite.** Verify manually via the curl command above.

## Status copy

`STATUS_COPY` in `index.ts` duplicates the `OrderStatus` enum from
`src/types/index.ts`. Deno can't import from the app source tree, so if
a new order status is added the constant must be updated in both places.
