import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import ProductCard from "../components/ProductCard";

export default function Catalog() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("available");

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setListings(data);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      const matchesStatus =
        statusFilter === "all" || (l.status || "available") === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        l.product_name?.toLowerCase().includes(q) ||
        l.seller_name?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [listings, search, statusFilter]);

  return (
    <div className="container">
      <div className="page-header">
        <h1>Browse the freezer</h1>
        <p>Everything currently listed by Ronac sellers.</p>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search longganisa, tocino, siomai…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 240, flex: 1 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="available">Available only</option>
          <option value="pending">Pending</option>
          <option value="sold">Sold</option>
          <option value="all">All statuses</option>
        </select>
      </div>

      {loading ? (
        <div className="empty-state">Loading listings…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No listings match yet</h3>
          <p>Try a different search, or check back soon — sellers add batches often.</p>
        </div>
      ) : (
        <div className="grid" style={{ paddingBottom: 40 }}>
          {filtered.map((l) => (
            <ProductCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
