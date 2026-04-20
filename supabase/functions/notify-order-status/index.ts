// Supabase Edge Function — notify-order-status
//
// Triggered by a Database Webhook on `public.orders` UPDATE. When the
// tailor moves an order to a new status in the Supabase dashboard, this
// function fans a push notification out to every registered device for
// that customer.
//
// WHY AN EDGE FUNCTION (not client code):
// Status changes happen exclusively under the service role (the customer
// never has RLS privileges to mutate `orders`). The trigger has to live
// server-side, and a Deno Edge Function is the idiomatic Supabase choice —
// no separate worker process to deploy, same project as the DB.
//
// ERROR HANDLING PHILOSOPHY:
// The function is best-effort. A single bad token, an Expo outage, or a
// missing product should not 500 the whole webhook (Supabase would retry
// and potentially re-deliver the same notification). We swallow non-fatal
// errors and only cleanup tokens that the Push API explicitly flags as
// DeviceNotRegistered at the ticket level.
//
// KNOWN LIMITATIONS (follow-ups):
//   - Receipt polling for late failures is not implemented. Only ticket-
//     level errors trigger token deletion.
//   - Duplicate-delivery dedup is not implemented. Supabase webhook retries
//     can deliver the same UPDATE twice; we accept this as a known gap.
//   - last_seen_at pruning job is not implemented; the field is bumped on
//     every upsert, but no reaper runs.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ----------------------------------------------------------------------------
// Status → user-facing copy
//
// Duplicated from src/types/index.ts because Deno can't import from src/.
// If a new status is added to the OrderStatus enum, update BOTH places.
// ----------------------------------------------------------------------------
const STATUS_COPY: Record<string, { title: string; body: string }> = {
  PLACED: {
    title: "Order received",
    body: "We've received your order and will start production shortly.",
  },
  IN_PRODUCTION: {
    title: "Your order is in production",
    body: "Our tailors have started crafting your piece.",
  },
  READY_FOR_TRIAL: {
    title: "Ready for trial",
    body: "Your piece is ready — please book a trial appointment.",
  },
  TRIAL_COMPLETE: {
    title: "Trial complete",
    body: "We're finalising the details of your order.",
  },
  ALTERATIONS: {
    title: "Alterations in progress",
    body: "We're making the requested adjustments to your piece.",
  },
  READY_FOR_DELIVERY: {
    title: "Ready for delivery",
    body: "Your piece is ready for pickup or delivery.",
  },
  DELIVERED: {
    title: "Delivered",
    body: "Your piece has been delivered. Enjoy!",
  },
};

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface WebhookPayload {
  type: "UPDATE" | "INSERT" | "DELETE";
  table: string;
  record: Record<string, any>;
  old_record: Record<string, any> | null;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

// ----------------------------------------------------------------------------
// Entrypoint
// ----------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Only react to UPDATEs on the orders table. Webhook config should already
  // scope this, but belt-and-braces.
  if (payload.type !== "UPDATE" || payload.table !== "orders") {
    return new Response("ignored", { status: 200 });
  }

  const newStatus = payload.record?.current_status;
  const oldStatus = payload.old_record?.current_status;

  // No status change → nothing to do. If the webhook config is missing
  // "Send previous row data" this branch would mis-fire; see README.
  if (!newStatus || !oldStatus || newStatus === oldStatus) {
    return new Response("no status change", { status: 200 });
  }

  const copy = STATUS_COPY[newStatus];
  if (!copy) {
    return new Response(`unknown status: ${newStatus}`, { status: 200 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("missing env", { status: 500 });
  }

  // Service role bypasses RLS — required to read push_tokens across users
  // and to DELETE stale tokens server-side.
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Enrich the body with product + fabric context for a nicer push.
  let body = copy.body;
  try {
    const { data: enrich } = await admin
      .from("orders")
      .select("products(name), fabrics(name)")
      .eq("id", payload.record.id)
      .maybeSingle();
    const productName = (enrich as any)?.products?.name;
    const fabricName = (enrich as any)?.fabrics?.name;
    if (productName && fabricName) {
      body = `Your ${fabricName} ${productName}: ${copy.body}`;
    } else if (productName) {
      body = `Your ${productName}: ${copy.body}`;
    }
  } catch {
    // Non-fatal — fall back to the generic copy.
  }

  // Fetch all push tokens for this customer.
  const { data: tokenRows, error: tokensErr } = await admin
    .from("push_tokens")
    .select("token")
    .eq("profile_id", payload.record.profile_id);

  if (tokensErr) {
    return new Response(`tokens query failed: ${tokensErr.message}`, {
      status: 500,
    });
  }
  if (!tokenRows || tokenRows.length === 0) {
    return new Response("no tokens", { status: 200 });
  }

  const messages = tokenRows.map((r: { token: string }) => ({
    to: r.token,
    sound: "default",
    title: copy.title,
    body,
    data: { url: `/order-detail?orderId=${payload.record.id}` },
  }));

  // Batch send. Expo accepts up to 100 per call; we're well under that for
  // one customer.
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  let pushRes: Response;
  try {
    pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(expoAccessToken
          ? { Authorization: `Bearer ${expoAccessToken}` }
          : {}),
      },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    return new Response(`fetch failed: ${e}`, { status: 502 });
  }

  if (!pushRes.ok) {
    const text = await pushRes.text();
    return new Response(`push failed: ${text}`, { status: 502 });
  }

  const json = (await pushRes.json()) as { data?: ExpoTicket[] };
  const tickets = json.data ?? [];

  // Ticket-level DeviceNotRegistered cleanup. Expo returns one ticket per
  // message in order, so we align by index to recover the original token.
  const deadTokens: string[] = [];
  tickets.forEach((ticket, i) => {
    if (
      ticket.status === "error" &&
      ticket.details?.error === "DeviceNotRegistered"
    ) {
      deadTokens.push(tokenRows[i].token);
    }
  });

  if (deadTokens.length > 0) {
    await admin.from("push_tokens").delete().in("token", deadTokens);
  }

  return new Response(
    JSON.stringify({ sent: messages.length, pruned: deadTokens.length }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
