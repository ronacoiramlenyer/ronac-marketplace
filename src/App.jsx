import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Catalog from "./pages/Catalog";
import SellerAuth from "./pages/SellerAuth";
import Listings from "./pages/Listings";
import Cart from "./pages/Cart";
import OrderConfirmed from "./pages/OrderConfirmed";
import Orders from "./pages/Orders";

export default function App() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/order-confirmed" element={<OrderConfirmed />} />
          <Route path="/login" element={<SellerAuth />} />
          <Route
            path="/listings"
            element={
              <ProtectedRoute>
                <Listings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          {/* old links redirect so nothing breaks if bookmarked */}
          <Route path="/dashboard" element={<Navigate to="/listings" replace />} />
          <Route path="/sell" element={<Navigate to="/listings" replace />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
