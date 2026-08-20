// Vercel serverless function — POST /api/create-checkout-session
//
// Takes the cart (an array of { product_name, price, quantity }) and
// creates a single Stripe Checkout session covering all of it, then
// returns the session URL for the browser to redirect to.
//
// Requires STRIPE_SECRET_KEY to be set in Vercel's Environment Variables
// (Project Settings -> Environment Variables). Never prefix this one with
// VITE_ — that would bundle it into the frontend and expose it publicly.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: "Stripe is not configured on the server." });
    return;
  }

  try {
    const { items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Cart is empty." });
      return;
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secretKey);

    const line_items = items.map((item) => ({
      price_data: {
        currency: "php",
        product_data: { name: item.product_name },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity || 1,
    }));

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${origin}/order-confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Something went wrong." });
  }
}
