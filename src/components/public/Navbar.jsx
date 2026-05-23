import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CATEGORIES } from "@/lib/categories";
import { Menu, X, Search } from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <header className="bg-white border-b border-border sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary text-white flex items-center justify-center font-bold font-serif text-xl">
              J
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-serif font-bold text-lg tracking-tight text-foreground">
                JuarezBravo
                <span className="text-primary">.com</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Noticias de Ciudad Juárez
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors ${
                location.pathname === "/"
                  ? "text-primary border-b-2 border-primary"
                  : "text-foreground hover:text-primary"
              }`}
            >
              Inicio
            </Link>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/categoria/${cat.slug}`}
                className={`px-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors ${
                  isActive(`/categoria/${cat.slug}`)
                    ? "text-primary border-b-2 border-primary"
                    : "text-foreground hover:text-primary"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/buscar"
              className="hidden sm:flex p-2 text-foreground hover:text-primary"
              aria-label="Buscar"
            >
              <Search className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-foreground"
              aria-label="Menú"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <nav className="lg:hidden border-t border-border py-2">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm font-medium uppercase tracking-wide hover:bg-secondary"
            >
              Inicio
            </Link>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/categoria/${cat.slug}`}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-medium uppercase tracking-wide hover:bg-secondary"
              >
                {cat.name}
              </Link>
            ))}
            <Link
              to="/buscar"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm font-medium uppercase tracking-wide hover:bg-secondary"
            >
              Buscar
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}