import React from "react";
import { Outlet } from "react-router-dom";
import BreakingTicker from "./BreakingTicker";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BreakingTicker />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}