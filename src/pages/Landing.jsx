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

export default function Landing() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    let active = true;
    supabase
      .from("listings")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (active && data) setFeatured(data);
      });
    return () => {
      active = false;
    };
  }, []);

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
              Ronac connects home-based Filipino food makers with buyers craving
              real longganisa, tocino, embutido, tapa, and siomai — vacuum-sealed,
              frozen, and ready for your freezer.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-red" to="/catalog">Browse the Freezer</Link>
              <Link className="btn btn-outline" to="/login">Start Selling</Link>
            </div>
          </div>

          <div className="ticket">
            <div className="ticket-head">
              <span>Order Ticket</span>
              <span>No. 0148</span>
            </div>
            <div className="ticket-row">
              <span>Sweet Longganisa (1kg)</span>
              <span>210</span>
            </div>
            <div className="ticket-row">
              <span>Pork Tocino (500g)</span>
              <span>₱220</span>
            </div>
            <div className="ticket-row">
              <span>Frozen Siomai (20pc)</span>
              <span>₱250</span>
            </div>
            <div className="ticket-total">
              <span className="label">Total</span>
              <span className="value">680</span>
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
            <h2>How Ronac works</h2>
            <p>Three steps, no middleman kitchen.</p>
          </div>
          <div className="steps">
            <div className="step">
              <span className="num">01 · Sellers</span>
              <h3>List what you froze</h3>
              <p>Snap a photo, set a price, describe the batch. Your listing goes live for buyers to see.</p>
            </div>
            <div className="step">
              <span className="num">02 · Buyers</span>
              <h3>Browse & pay securely</h3>
              <p>Find available items nearby, then check out through the seller's Stripe payment link.</p>
            </div>
            <div className="step">
              <span className="num">03 · Both</span>
              <h3>Get notified</h3>
              <p>Sellers get an email the moment an item is marked sold, so packing day starts right away.</p>
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
