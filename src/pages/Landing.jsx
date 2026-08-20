import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import ProductCard from "../components/ProductCard";

const CATEGORIES = [
  "Longganisa",
  "Tocino",
  "Embutido",
  "Tapa",
  "Siomai",
  "More coming soon",
];

// Shown in the hero ticket only if there aren't enough real listings yet.
const FALLBACK_TICKET_ITEMS = [
  { product_name: "Sweet Longganisa (1kg)", price: 280 },
  { product_name: "Beef Tapa (500g)", price: 220 },
  { product_name: "Frozen Siomai (20pc)", price: 250 },
];

export default function Landing() {
  const [featured, setFeatured] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from("listings")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (active) {
          setFeatured(data || []);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const ticketItems =
    loaded && featured.length > 0
      ? featured.map((l) => ({ product_name: l.product_name, price: Number(l.price) }))
      : FALLBACK_TICKET_ITEMS;
  const ticketTotal = ticketItems.reduce((sum, i) => sum + i.price, 0);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow-tag">
              <span className="dot" /> Frozen &amp; Ready to Ship
            </span>
            <h1>
              Home-frozen Filipino <span className="accent">baon</span>,
              sold straight from the cook.
            </h1>
            <p className="lede">
              Real longganisa, tocino, embutido, tapa, and siomai — made in
              small batches, vacuum-sealed, frozen, and ready for your
              freezer.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-red" to="/catalog">Browse the Freezer</Link>
            </div>
          </div>

          <div className="ticket">
            <div className="ticket-head">
              <span>Order Ticket</span>
              <span>No. 0148</span>
            </div>
            {ticketItems.map((item, idx) => (
              <div className="ticket-row" key={idx}>
                <span>{item.product_name}</span>
                <span>₱{item.price.toLocaleString("en-PH")}</span>
              </div>
            ))}
            <div className="ticket-total">
              <span className="label">Total</span>
              <span className="value">₱{ticketTotal.toLocaleString("en-PH")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>What's in the freezer</h2>
          </div>
          <div className="category-strip">
            {CATEGORIES.map((c) => (
              <span className="category-chip" key={c}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      <hr className="perforation" />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How ordering works</h2>
            <p>Three steps, no card required.</p>
          </div>
          <div className="steps">
            <div className="step">
              <span className="num">01</span>
              <h3>Pick your batch</h3>
              <p>Browse what's available and add it to your cart.</p>
            </div>
            <div className="step">
              <span className="num">02</span>
              <h3>Pay via GCash or BPI</h3>
              <p>Scan the QR at checkout, then upload a screenshot of your payment.</p>
            </div>
            <div className="step">
              <span className="num">03</span>
              <h3>We confirm & arrange delivery</h3>
              <p>Once your payment is verified, we'll reach out to sort out pickup or delivery.</p>
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <>
          <hr className="perforation" />
          <section className="section">
            <div className="container">
              <div className="section-head">
                <h2>Fresh off the ice</h2>
                <p>Recently listed and still available.</p>
              </div>
              <div className="grid">
                {featured.map((l) => (
                  <ProductCard key={l.id} listing={l} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
