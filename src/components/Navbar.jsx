import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, signOut } = useAuth();

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
                to="/dashboard"
                className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
              >
                My Listings
              </NavLink>
              <NavLink
                to="/sell"
                className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
              >
                + New Listing
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
