import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { count } = useCart();

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="brand">
          <span className="brand-mark">
            <svg viewBox="0 0 64 64" fill="none">
              <path
                d="M32 10 L34 22 L44 16 L36 26 L48 28 L36 30 L44 40 L34 34 L32 46 L30 34 L20 40 L28 30 L16 28 L28 26 L20 16 L30 22 Z"
                fill="#C1442D"
              />
            </svg>
          </span>
          Ronac
        </NavLink>

        <NavLink to="/cart" className="cart-link" aria-label="View cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="19" cy="21" r="1.5" fill="currentColor" stroke="none" />
            <path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {count > 0 && <span className="cart-count">{count}</span>}
        </NavLink>

        <nav className="nav-links">
          <NavLink
            to="/catalog"
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            Browse
          </NavLink>
          {user ? (
            <>
              <NavLink
                to="/listings"
                className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
              >
                Listings
              </NavLink>
              <NavLink
                to="/orders"
                className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
              >
                Orders
              </NavLink>
              <button className="nav-link" onClick={signOut} style={{ cursor: "pointer" }}>
                Log Out
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              Seller Login
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
