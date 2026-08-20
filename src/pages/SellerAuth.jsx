import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function SellerAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/listings" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
    } else {
      navigate("/listings");
    }
  }

  return (
    <div className="container" style={{ padding: "56px 0" }}>
      <div className="page-header" style={{ padding: "0 0 24px" }}>
        <h1>Seller Log In</h1>
        <p>Manage your frozen goods listings.</p>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
          />
        </div>

        <button className="btn btn-red btn-block" type="submit" disabled={busy}>
          {busy ? "Please wait…" : "Log In"}
        </button>
      </form>
    </div>
  );
}
