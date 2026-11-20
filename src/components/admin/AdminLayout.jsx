import React, { useState } from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { LayoutDashboard, Newspaper, Megaphone, Tags, LogOut, Menu, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/admin", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/admin/articulos", label: "Noticias", icon: Newspaper },
  { to: "/admin/ticker", label: "Última hora", icon: Megaphone },
  { to: "/admin/etiquetas", label: "Etiquetas", icon: Tags },
];

function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="admin-panel w-full max-w-md px-6 py-8 shadow-sm sm:p-9">
        <div className="mb-7 text-center">
          <img src="/juarez-bravo-logo-mark.png" alt="Juárez Bravo" width="72" height="72" className="mx-auto mb-4 rounded-lg" />
          <h1 className="text-3xl font-bold">Panel editorial</h1>
          <p className="mt-2 text-sm text-muted-foreground">Inicia sesión para administrar Juárez Bravo.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="grid gap-1.5 text-sm font-semibold">
            Usuario
            <input autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} required className="admin-input" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            Contraseña
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="admin-input" />
          </label>
          {error && <p role="alert" className="text-sm text-primary">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading || !username || !password}>
            {loading ? "Entrando…" : "Iniciar sesión"}
          </Button>
        </form>
        <Link to="/" className="mt-5 block text-center text-sm text-muted-foreground hover:text-primary">
          ← Volver al sitio público
        </Link>
      </div>
    </div>
  );
}

function Navigation({ onNavigate }) {
  return (
    <>
      <Link to="/admin" onClick={onNavigate} className="mx-4 flex items-center gap-3 border-b border-white/15 px-2 py-5">
        <img src="/juarez-bravo-logo-mark.png" alt="" width="40" height="40" className="shrink-0 rounded-md bg-white" />
        <div className="min-w-0">
          <div className="font-display text-lg uppercase leading-tight text-white">Juárez Bravo</div>
        </div>
      </Link>
      <nav aria-label="Navegación editorial" className="flex-1 space-y-1 p-4">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-white/15 text-white ring-1 ring-inset ring-white/10" : "text-white/75 hover:bg-white/10 hover:text-white"}`
            }
          >
            <Icon size={17} aria-hidden="true" />{label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default function AdminLayout() {
  const { user, isLoadingAuth, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  if (isLoadingAuth) {
    return (
      <div role="status" className="grid min-h-dvh place-items-center bg-background">
        <span className="size-8 animate-spin rounded-full border-4 border-secondary border-t-primary" aria-hidden="true" />
        <span className="sr-only">Verificando sesión…</span>
      </div>
    );
  }

  if (!user) return <LoginForm />;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto bg-foreground lg:flex">
        <Navigation onNavigate={undefined} />
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b bg-white">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú editorial"><Menu size={20} /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex max-w-xs flex-col border-white/10 bg-foreground p-0 text-white">
                  <SheetTitle className="sr-only">Menú editorial</SheetTitle>
                  <SheetDescription className="sr-only">Navegación de Juárez Bravo</SheetDescription>
                  <Navigation onNavigate={() => setSidebarOpen(false)} />
                </SheetContent>
              </Sheet>
              <span className="truncate text-sm font-semibold">Panel editorial</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/" target="_blank" rel="noopener"><ExternalLink size={15} /> Ver sitio</Link>
              </Button>
              <span className="hidden max-w-36 truncate px-1 text-sm text-muted-foreground sm:inline">{user.full_name || user.username}</span>
              <Button type="button" variant="ghost" size="icon" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={handleLogout}><LogOut size={16} /></Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
