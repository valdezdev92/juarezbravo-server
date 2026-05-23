import React, { useState } from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  Newspaper,
  Megaphone,
  Tags,
  LogOut,
  PlusCircle,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/articulos", label: "Artículos", icon: Newspaper },
  { to: "/admin/ticker", label: "Ticker Urgente", icon: Megaphone },
  { to: "/admin/etiquetas", label: "Etiquetas", icon: Tags },
];

export default function AdminLayout() {
  const { user, navigateToLogin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-white border border-border p-8 text-center">
          <div className="w-12 h-12 bg-primary text-white mx-auto flex items-center justify-center font-serif font-bold text-2xl mb-4">
            J
          </div>
          <h1 className="font-serif font-bold text-2xl mb-2">Panel Editorial</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Inicia sesión para administrar JuarezBravo.com
          </p>
          <button
            onClick={() => navigateToLogin()}
            className="w-full bg-primary text-primary-foreground py-3 font-semibold uppercase tracking-wide text-sm hover:bg-primary/90"
          >
            Iniciar Sesión
          </button>
          <Link
            to="/"
            className="block mt-4 text-xs text-muted-foreground hover:text-primary"
          >
            ← Volver al sitio público
          </Link>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await base44.auth.logout("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-sidebar-border z-40 transition-transform flex flex-col`}
      >
        <Link to="/admin" className="flex items-center gap-2 p-5 border-b border-sidebar-border">
          <div className="w-9 h-9 bg-primary text-white flex items-center justify-center font-serif font-bold">
            J
          </div>
          <div className="leading-tight">
            <div className="font-serif font-bold text-sm">JuarezBravo</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Panel Editorial
            </div>
          </div>
        </Link>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-foreground hover:bg-secondary border-l-2 border-transparent"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}

          <button
            onClick={() => {
              setSidebarOpen(false);
              navigate("/admin/articulos/nuevo");
            }}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 text-sm font-semibold uppercase tracking-wide hover:bg-primary/90"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Noticia
          </button>
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <Link
            to="/"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-primary"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver sitio público
          </Link>
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">
            {user.full_name || user.email}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-primary"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b border-border flex items-center justify-between px-4 h-14 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-serif font-bold">
            JuarezBravo<span className="text-primary">.com</span>
          </span>
          <span className="w-9" />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}