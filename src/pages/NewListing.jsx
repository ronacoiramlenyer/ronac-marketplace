import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, STORAGE_BUCKET } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

// Single-seller marketplace — these are fixed rather than typed per listing.
const SELLER_NAME = "Ronac Marketplace";
const SELLER_CONTACT = null;

export default function NewListing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    product_name: "",
    description: "",
    price: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.product_name || !form.price) {
      setError("Please fill in product name and price.");
      return;
    }

    setBusy(true);
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

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ padding: "48px 0" }}>
      <div className="page-header" style={{ padding: "0 0 24px" }}>
        <h1>List a frozen batch</h1>
        <p>Add a product so buyers can find it in the catalog.</p>
      </div>

      <form className="form-card" onSubmit={handleSubmit} style={{ maxWidth: 620 }}>
        {error && <div className="alert alert-error">{error}</div>}

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
            onChange={(e) => update("product_name", e.target.value)}
            placeholder="e.g. Sweet Longganisa (1kg, 10pcs)"
          />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
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
            onChange={(e) => update("price", e.target.value)}
            placeholder="280"
          />
        </div>

        <button className="btn btn-red btn-block" type="submit" disabled={busy}>
          {busy ? "Publishing…" : "Publish Listing"}
        </button>
      </form>
    </div>
  );
}
