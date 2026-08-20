// Ronac — notify-seller Edge Function
//
// Sends a transactional email to the seller when:
//   - a new listing is created (INSERT), or
//   - a listing's status changes to "sold" (UPDATE)
//
// Wire this up with a Supabase Database Webhook (Dashboard -> Database ->
// Webhooks -> Create a new hook) on the `public.listings` table for
// INSERT and UPDATE events, pointing at this function's URL. See
// SETUP_SUPABASE.md for the click-by-click steps.
//
// Uses Resend (https://resend.com) for email delivery — swap the fetch
// call below for any other email API if you prefer.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("NOTIFY_FROM_EMAIL") || "Ronac <onboarding@resend.dev>";

interface ListingRow {
  id: string;
  seller_name: string;
  seller_email: string | null;
  product_name: string;
  status: string;
  price: number;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: ListingRow;
  old_record?: ListingRow;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email send.", { to, subject });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    console.error("Resend API error", res.status, await res.text());
  }
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    const { type, record, old_record } = payload;

    if (!record?.seller_email) {
      return new Response(JSON.stringify({ skipped: "no seller_email" }), { status: 200 });
    }

    if (type === "INSERT") {
      await sendEmail(
        record.seller_email,
        `Ronac: "${record.product_name}" is live`,
        `<p>Hi ${record.seller_name},</p>
         <p>Your listing <strong>${record.product_name}</strong> (₱${record.price}) is now live on Ronac and visible to buyers.</p>
         <p>— Ronac</p>`
      );
    } else if (
      type === "UPDATE" &&
      record.status === "sold" &&
      old_record?.status !== "sold"
    ) {
      await sendEmail(
        record.seller_email,
        `Ronac: "${record.product_name}" marked sold`,
        `<p>Hi ${record.seller_name},</p>
         <p>Nice one — <strong>${record.product_name}</strong> is now marked as sold. Time to pack it up!</p>
         <p>— Ronac</p>`
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
