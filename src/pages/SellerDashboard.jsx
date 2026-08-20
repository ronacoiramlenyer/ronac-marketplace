import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { StatusTag } from "../components/ProductCard";

export default function SellerDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
    const { error: updateError } = await supabase
      .from("listings")
      .update({ status })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      load();
    }
  }

  const availableCount = listings.filter((l) => (l.status || "available") === "available").length;
  const pendingCount = listings.filter((l) => l.status === "pending").length;
  const soldCount = listings.filter((l) => l.status === "sold").length;

  return (
    <div className="container" style={{ padding: "48px 0" }}>
      <div className="section-head" style={{ marginBottom: 8 }}>
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontSize: 32, margin: 0 }}>
            My Listings
          </h1>
          <p style={{ color: "var(--ink-soft)", margin: "6px 0 0" }}>
            Signed in as {user.email}
          </p>
        </div>
        <Link className="btn btn-red" to="/sell">+ New Listing</Link>
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

      {loading ? (
        <div className="empty-state">Loading your listings…</div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing listed yet</h3>
          <p>Your freezer is empty. Add your first batch to start selling.</p>
          <Link className="btn btn-red" to="/sell" style={{ marginTop: 16 }}>
            List a Product
          </Link>
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
