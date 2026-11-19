import React from "react";
import { Outlet } from "react-router-dom";
import BreakingTicker from "./BreakingTicker";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <BreakingTicker />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
