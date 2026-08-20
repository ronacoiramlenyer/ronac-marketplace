import React from "react";

const STATUS_LABEL = {
  available: "Available",
  pending: "Pending",
  sold: "Sold",
};

export function StatusTag({ status }) {
  const key = (status || "available").toLowerCase();
  return (
    <span className={`frost-tag ${key}`}>{STATUS_LABEL[key] || status}</span>
  );
}

export default function ProductCard({ listing }) {
  const {
    product_name,
    seller_name,
    description,
    price,
    image_url,
    status,
    stripe_payment_link,
  } = listing;

  const isAvailable = (status || "available").toLowerCase() === "available";

  return (
    <div className="card">
      <div className="card-media">
        {image_url ? (
          <img src={image_url} alt={product_name} loading="lazy" />
        ) : (
          <div className="no-image">No photo yet</div>
        )}
      </div>
      <div className="card-body">
        <h3 className="card-title">{product_name}</h3>
        <div className="card-seller">by {seller_name}</div>
        {description ? <p className="card-desc">{description}</p> : null}
        <div className="card-foot">
          <span className="price">
            ₱{Number(price).toLocaleString("en-PH", { minimumFractionDigits: 0 })}
          </span>
          <StatusTag status={status} />
        </div>
      </div>
      <div className="card-actions">
        {isAvailable && stripe_payment_link ? (
          <a
            className="btn btn-red btn-block"
            href={stripe_payment_link}
            target="_blank"
            rel="noreferrer"
          >
            Buy Now
          </a>
        ) : isAvailable ? (
          <a className="btn btn-outline btn-block" href={`mailto:?subject=Ronac: ${encodeURIComponent(product_name)}`}>
            Contact Seller
          </a>
        ) : (
          <button className="btn btn-block" disabled>
            {status === "sold" ? "Sold Out" : "Reserved"}
          </button>
        )}
      </div>
    </div>
  );
}
