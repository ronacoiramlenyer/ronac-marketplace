import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, STORAGE_BUCKET } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { StatusTag } from "../components/ProductCard";

// Single-seller marketplace — fixed rather than typed per listing.
const SELLER_NAME = "Ronac Marketplace";
const SELLER_CONTACT = null;

const emptyForm = { product_name: "", description: "", price: "" };

export default function Listings() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error: fetchError }, { count, error: countError }] = await Promise.all([
      supabase
        .from("listings")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

    if (fetchError) setError(fetchError.message);
    else setListings(data || []);
    if (countError) setError(countError.message);
    else setPendingOrders(count || 0);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id, status) {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    const { error: updateError } = await supabase
      .from("listings")
      .update({ status })
      .eq("id", id);
    if (updateError) {
      setError(updateError.message);
      load();
    }
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function resetForm() {
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setFormError("");
  }

  async function handleAddListing(e) {
    e.preventDefault();
    setFormError("");

    if (!form.product_name || !form.price) {
      setFormError("Please fill in product name and price.");
      return;
    }

    setSaving(true);
    try {
      let image_url = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, imageFile, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(path);
        image_url = publicUrlData.publicUrl;
      }

      const { error: insertError } = await supabase.from("listings").insert({
        seller_id: user.id,
        seller_name: SELLER_NAME,
        seller_contact: SELLER_CONTACT,
        seller_email: user.email,
        product_name: form.product_name,
        description: form.description,
        price: Number(form.price),
        image_url,
        status: "available",
      });
      if (insertError) throw insertError;

      resetForm();
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const availableCount = listings.filter((l) => (l.status || "available") === "available").length;
  const pendingCount = listings.filter((l) => l.status === "pending").length;
  const soldCount = listings.filter((l) => l.status === "sold").length;

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <div className="section-head" style={{ marginBottom: 8 }}>
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontSize: 32, margin: 0 }}>
            Listings
          </h1>
          <p style={{ color: "var(--ink-soft)", margin: "6px 0 0" }}>
            Signed in as {user.email}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-red"
          onClick={() => {
            setShowForm((s) => !s);
            if (showForm) resetForm();
          }}
        >
          {showForm ? "Cancel" : "+ Add Listing"}
        </button>
      </div>

      {!loading && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{availableCount}</span>
            <span className="stat-label">Available</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{pendingCount}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{soldCount}</span>
            <span className="stat-label">Sold</span>
          </div>
          <Link to="/orders" className="stat-card stat-card-link">
            <span className="stat-value">{pendingOrders}</span>
            <span className="stat-label">Orders to verify</span>
          </Link>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop: 20 }}>{error}</div>}

      {showForm && (
        <form className="form-card" onSubmit={handleAddListing} style={{ maxWidth: 620, marginTop: 20 }}>
          {formError && <div className="alert alert-error">{formError}</div>}

          <div className="field">
            <label htmlFor="image">Product photo</label>
            <label className="image-drop" htmlFor="image">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" />
              ) : (
                <span className="hint">Click to upload a photo</span>
              )}
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={onImageChange}
              style={{ display: "none" }}
            />
          </div>

          <div className="field">
            <label htmlFor="product_name">Product name</label>
            <input
              id="product_name"
              type="text"
              value={form.product_name}
              onChange={(e) => updateField("product_name", e.target.value)}
              placeholder="e.g. Sweet Longganisa (1kg, 10pcs)"
            />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Batch date, ingredients, how it's packed, pickup or delivery notes…"
            />
          </div>

          <div className="field">
            <label htmlFor="price">Price (₱)</label>
            <input
              id="price"
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => updateField("price", e.target.value)}
              placeholder="280"
            />
          </div>

          <button className="btn btn-red btn-block" type="submit" disabled={saving}>
            {saving ? "Publishing…" : "Publish Listing"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="empty-state">Loading your listings…</div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing listed yet</h3>
          <p>Your freezer is empty. Add your first batch to start selling.</p>
          <button className="btn btn-red" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
            List a Product
          </button>
        </div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 24 }}>
          <table className="dash-table">
            <thead>
              <tr>
                <th></th>
                <th>Product</th>
                <th>Price</th>
                <th>Status</th>
                <th>Listed</th>
                <th>Update status</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.image_url ? (
                      <img className="dash-thumb" src={l.image_url} alt={l.product_name} />
                    ) : (
                      <div className="dash-thumb" style={{ background: "var(--tan)" }} />
                    )}
                  </td>
                  <td>{l.product_name}</td>
                  <td>₱{Number(l.price).toLocaleString("en-PH")}</td>
                  <td><StatusTag status={l.status} /></td>
                  <td>{new Date(l.created_at).toLocaleDateString()}</td>
                  <td>
                    <select
                      className="status-select"
                      value={l.status || "available"}
                      onChange={(e) => updateStatus(l.id, e.target.value)}
                    >
                      <option value="available">Available</option>
                      <option value="pending">Pending</option>
                      <option value="sold">Sold</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
