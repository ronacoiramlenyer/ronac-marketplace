import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const STATUS_LABEL = {
  pending: "Pending Verification",
  verified: "Verified",
  fulfilled: "Fulfilled",
};

const TABS = [
  { id: "pending", label: "Pending" },
  { id: "verified", label: "Verified" },
  { id: "fulfilled", label: "Fulfilled" },
];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

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

  const counts = useMemo(() => {
    const c = { pending: 0, verified: 0, fulfilled: 0 };
    for (const o of orders) {
      if (c[o.status] !== undefined) c[o.status] += 1;
    }
    return c;
  }, [orders]);

  const filteredOrders = useMemo(
    () => orders.filter((o) => o.status === activeTab),
    [orders, activeTab]
  );

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <div className="page-header" style={{ padding: "0 0 20px" }}>
        <h1>Orders</h1>
        <p>Payments buyers have submitted, waiting on your verification.</p>
      </div>

      <div className="method-tabs" style={{ marginBottom: 24 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`method-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="tab-count">{counts[tab.id]}</span>
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="empty-state">Loading orders…</div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">
          <h3>No {TABS.find((t) => t.id === activeTab)?.label.toLowerCase()} orders</h3>
          <p>
            {activeTab === "pending"
              ? "New orders will show up here once a buyer checks out."
              : "Orders will appear here once you move them to this status."}
          </p>
        </div>
      ) : (
        <div className="order-list">
          {filteredOrders.map((o) => (
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
