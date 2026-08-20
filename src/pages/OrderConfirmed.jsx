import React from "react";
import { Link } from "react-router-dom";

export default function OrderConfirmed() {
  return (
    <div className="container" style={{ paddingTop: 64, paddingBottom: 64 }}>
      <div className="empty-state">
        <h3>Order submitted 🎉</h3>
        <p>
          We've got your order and payment screenshot. The seller will
          verify it and reach out to arrange pickup or delivery.
        </p>
        <Link className="btn btn-red" to="/catalog" style={{ marginTop: 16 }}>
          Keep Browsing
        </Link>
      </div>
    </div>
  );
}
