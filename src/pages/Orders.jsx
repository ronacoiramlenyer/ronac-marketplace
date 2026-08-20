import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const STATUS_LABEL = {
  pending: "Pending Verification",
  verified: "Verified",
  fulfilled: "Fulfilled",
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) setError(fetchError.message);
    else setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id, status) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);
    if (updateError) {
      setError(updateError.message);
      load();
    }
  }

  return (
    <div className="container" style={{ padding: "48px 0" }}>
      <div className="page-header" style={{ padding: "0 0 20px" }}>
        <h1>Orders</h1>
        <p>Payments buyers have submitted, waiting on your verification.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="empty-state">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p>Submitted orders will show up here once a buyer checks out.</p>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((o) => (
            <div className="order-card" key={o.id}>
              <div className="order-card-head">
                <div>
                  <div className="order-buyer">{o.buyer_name}</div>
                  <div className="order-contact">{o.buyer_contact}</div>
                </div>
                <select
                  className="status-select"
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                >
                  <option value="pending">Pending Verification</option>
                  <option value="verified">Verified</option>
                  <option value="fulfilled">Fulfilled</option>
                </select>
              </div>

              <ul className="order-items">
                {(o.items || []).map((item, idx) => (
                  <li key={idx}>
                    {item.quantity}× {item.product_name} — ₱
                    {Number(item.price).toLocaleString("en-PH")}
                  </li>
                ))}
              </ul>

              <div className="order-card-foot">
                <div>
                  <span className="order-method">{o.payment_method?.toUpperCase()}</span>
                  <span className="order-total">
                    ₱{Number(o.total).toLocaleString("en-PH")}
                  </span>
                </div>
                {o.proof_url && (
                  <a
                    href={o.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline"
                    style={{ width: "auto", minHeight: 36, padding: "8px 14px" }}
                  >
                    View Proof
                  </a>
                )}
              </div>
              <div className="order-date">
                {new Date(o.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
