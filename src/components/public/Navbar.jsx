import React, { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, Search, X } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

const sections = [
  { to: "/", label: "Inicio" },
  ...CATEGORIES.map(({ slug, name }) => ({ to: `/categoria/${slug}`, label: name })),
];

const shortEditionDate = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "long",
  timeZone: "America/Ciudad_Juarez",
});

const editionDate = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "full",
  timeZone: "America/Ciudad_Juarez",
});

export default function Navbar() {
  const location = useLocation();
  const today = new Date();
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const mobileOpen = openMenuKey === location.key;
  const closeMenu = () => setOpenMenuKey(null);

  return (
    <>
      <div className="bg-foreground text-background">
        <div className="site-container flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-[10px] font-bold uppercase tracking-[0.12em] sm:text-xs">
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-brand-red" />
            Ciudad Juárez, Chih.
          </span>
          <span className="text-background/75">
            <span className="sm:hidden">{shortEditionDate.format(today)}</span>
            <span className="hidden sm:inline">{editionDate.format(today)}</span>
          </span>
        </div>
      </div>

      <header
        className="sticky top-0 z-40 border-b border-border bg-card"
        onKeyDown={(event) => {
          if (event.key === "Escape" && mobileOpen) {
            closeMenu();
            document.getElementById("menu-button")?.focus();
          }
        }}
      >
        <div className="site-container">
          <div className="flex min-h-[72px] items-center justify-between gap-4 sm:min-h-[88px]">
            <Link to="/" onClick={closeMenu} className="flex shrink-0 items-center gap-2.5 sm:gap-3">
              <img src="/juarez-bravo-logo-mark.png" alt="" width="60" height="60" className="size-11 sm:size-[60px]" />
              <span className="font-display text-[26px] uppercase leading-none sm:text-[32px]">
                Juárez <span className="text-primary">Bravo</span>
              </span>
            </Link>

            <nav aria-label="Secciones" className="hidden self-stretch lg:flex lg:gap-5 xl:gap-8">
              {sections.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className="flex items-center border-b-[3px] border-transparent pt-[3px] text-[13px] font-bold transition-colors hover:text-primary aria-[current=page]:border-primary aria-[current=page]:text-primary"
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <NavLink
                to="/buscar"
                onClick={closeMenu}
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 border border-border text-sm font-semibold transition-colors hover:border-primary hover:text-primary aria-[current=page]:border-primary aria-[current=page]:text-primary sm:px-4"
                aria-label="Buscar noticias"
              >
                <Search size={17} aria-hidden="true" />
                <span className="hidden sm:inline">Buscar</span>
              </NavLink>
              <button
                id="menu-button"
                type="button"
                onClick={() => setOpenMenuKey(mobileOpen ? null : location.key)}
                className="inline-flex size-11 items-center justify-center border border-border hover:text-primary lg:hidden"
                aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={mobileOpen}
                aria-controls="site-mobile-navigation"
              >
                {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <nav
            id="site-mobile-navigation"
            aria-label="Secciones"
            hidden={!mobileOpen}
            className="border-t border-border py-2 lg:hidden"
          >
            {sections.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={closeMenu}
                className="block px-3 py-3 text-sm font-semibold hover:bg-secondary aria-[current=page]:bg-secondary aria-[current=page]:text-primary"
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
    </>
  );
}
