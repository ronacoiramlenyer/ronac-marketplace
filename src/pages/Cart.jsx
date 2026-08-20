import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { supabase, STORAGE_BUCKET_PROOFS } from "../supabaseClient";
import { PAYMENT_METHODS } from "../config/payment";

export default function Cart() {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const navigate = useNavigate();

  const [methodId, setMethodId] = useState(PAYMENT_METHODS[0]?.id);
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const method = PAYMENT_METHODS.find((m) => m.id === methodId);

  function onProofChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!buyerName || !buyerContact) {
      setError("Please enter your name and contact number.");
      return;
    }
    if (!proofFile) {
      setError("Please upload a screenshot of your payment.");
      return;
    }

    setBusy(true);
    try {
      const ext = proofFile.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET_PROOFS)
        .upload(path, proofFile, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET_PROOFS)
        .getPublicUrl(path);

      const { error: insertError } = await supabase.from("orders").insert({
        buyer_name: buyerName,
        buyer_contact: buyerContact,
        items: items.map((i) => ({
          id: i.id,
          product_name: i.product_name,
          price: i.price,
          quantity: i.quantity,
        })),
        total,
        payment_method: methodId,
        proof_url: publicUrlData.publicUrl,
        status: "pending",
      });
      if (insertError) throw insertError;

      clearCart();
      navigate("/order-confirmed");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <div className="empty-state">
          <h3>Your cart is empty</h3>
          <p>Add a batch from the catalog to get started.</p>
          <Link className="btn btn-red" to="/catalog" style={{ marginTop: 16 }}>
            Browse the Freezer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 56 }}>
      <div className="page-header" style={{ padding: "0 0 20px" }}>
        <h1>Your cart</h1>
        <p>Review your order, then pay via GCash or BPI and upload proof.</p>
      </div>

      <div className="cart-list">
        {items.map((item) => (
          <div className="cart-item" key={item.id}>
            <div className="cart-item-media">
              {item.image_url ? (
                <img src={item.image_url} alt={item.product_name} />
              ) : (
                <div className="no-image" style={{ fontSize: 10 }}>No photo</div>
              )}
            </div>
            <div className="cart-item-info">
              <div className="cart-item-name">{item.product_name}</div>
              <div className="cart-item-price">
                ₱{item.price.toLocaleString("en-PH")}
              </div>
            </div>
            <div className="qty-stepper">
              <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity">−</button>
              <span>{item.quantity}</span>
              <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity">+</button>
            </div>
            <button type="button" className="cart-remove" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.product_name}`}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary" style={{ marginBottom: 8 }}>
        <div className="cart-summary-row">
          <span>Total</span>
          <span className="cart-summary-total">₱{total.toLocaleString("en-PH")}</span>
        </div>
      </div>

      <form className="form-card checkout-card" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="field-row">
          <div className="field">
            <label htmlFor="buyer_name">Your name</label>
            <input
              id="buyer_name"
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="field">
            <label htmlFor="buyer_contact">Contact number</label>
            <input
              id="buyer_contact"
              type="tel"
              value={buyerContact}
              onChange={(e) => setBuyerContact(e.target.value)}
              placeholder="09xx xxx xxxx"
            />
          </div>
        </div>

        <div className="field">
          <label>Pay via</label>
          <div className="method-tabs">
            {PAYMENT_METHODS.map((m) => (
              <button
                type="button"
                key={m.id}
                className={`method-tab${methodId === m.id ? " active" : ""}`}
                onClick={() => setMethodId(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {method && (
          <div className="qr-panel">
            <img src={method.qrImage} alt={`${method.label} QR code`} className="qr-image" />
            <div className="qr-details">
              <div className="qr-row">
                <span>Account name</span>
                <strong>{method.accountName}</strong>
              </div>
              <div className="qr-row">
                <span>{method.label} number</span>
                <strong>{method.accountNumber}</strong>
              </div>
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="proof">Upload proof of payment</label>
          <label className="image-drop" htmlFor="proof">
            {proofPreview ? (
              <img src={proofPreview} alt="Payment proof preview" />
            ) : (
              <span className="hint">Click to upload a screenshot</span>
            )}
          </label>
          <input
            id="proof"
            type="file"
            accept="image/*"
            onChange={onProofChange}
            style={{ display: "none" }}
          />
        </div>

        <button className="btn btn-red btn-block" type="submit" disabled={busy}>
          {busy ? "Submitting…" : "Submit Order"}
        </button>
        <p className="field-hint" style={{ textAlign: "center", marginTop: 10 }}>
          The seller will verify your payment and reach out to arrange pickup or delivery.
        </p>
      </form>
    </div>
  );
}
