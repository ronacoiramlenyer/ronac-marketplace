import React, { useState } from "react";
import { useCart } from "../context/CartContext";

const STATUS_LABEL = {
  available: "Available",
  pending: "Pending",
  sold: "Sold",
};

export function StatusTag({ status }) {
  const key = (status || "available").toLowerCase();
  return <span className={`status-badge ${key}`}>{STATUS_LABEL[key] || status}</span>;
}

export default function ProductCard({ listing }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const { product_name, seller_name, description, price, image_url, status } = listing;
  const isAvailable = (status || "available").toLowerCase() === "available";

  function handleAdd() {
    addItem(listing);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <div className="card">
      <div className="card-media">
        {image_url ? (
          <img src={image_url} alt={product_name} loading="lazy" />
        ) : (
          <div className="no-image">No photo yet</div>
        )}
        <StatusTag status={status} />
      </div>
      <div className="card-body">
        <h3 className="card-title">{product_name}</h3>
        <div className="card-seller">{seller_name}</div>
        {description ? <p className="card-desc">{description}</p> : null}
        <div className="card-foot">
          <span className="price">
            ₱{Number(price).toLocaleString("en-PH", { minimumFractionDigits: 0 })}
          </span>
          {isAvailable ? (
            <button
              type="button"
              className={`add-to-cart-btn${added ? " added" : ""}`}
              onClick={handleAdd}
              aria-label={`Add ${product_name} to cart`}
            >
              {added ? "Added ✓" : "+ Add"}
            </button>
          ) : (
            <span className="unavailable-label">
              {status === "sold" ? "Sold out" : "Reserved"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
