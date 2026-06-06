import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import StatCard from "@/components/admin/StatCard";
import { Newspaper, FileEdit, Megaphone, Eye, ExternalLink, Edit } from "lucide-react";
import { getCategoryName, formatRelativeTime } from "@/lib/categories";

export default function AdminDashboard() {
  const { data: articles = [] } = useQuery({
    queryKey: ["admin", "articles"],
    queryFn: () => api.articles.list("-created_date", 200),
  });

  const { data: ticker = [] } = useQuery({
    queryKey: ["admin", "ticker"],
    queryFn: () => api.ticker.list("order", 50),
  });

  const published  = articles.filter((a) => a.status === "published");
  const drafts     = articles.filter((a) => a.status !== "published");
  const breaking   = articles.filter((a) => a.is_breaking_news);
  const totalViews = articles.reduce((acc, a) => acc + (a.views || 0), 0);
  const recent     = articles.slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-serif font-bold text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Resumen general del sitio editorial</p>
        </div>
        <Link
          to="/admin/articulos/nuevo"
          className="hidden sm:inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-primary/90"
        >
          + Nueva Noticia
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Publicadas"     value={published.length}  icon={Newspaper} accent />
        <StatCard label="Borradores"     value={drafts.length}     icon={FileEdit} />
        <StatCard label="Urgentes"       value={breaking.length}   icon={Megaphone} />
        <StatCard label="Vistas Totales" value={totalViews}        icon={Eye} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-border">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="font-serif font-bold uppercase text-sm tracking-wider">Últimos Artículos</h2>
            <Link to="/admin/articulos" className="text-xs text-primary uppercase tracking-widest font-semibold hover:underline">
              Ver todos →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aún no has creado artículos.{" "}
              <Link to="/admin/articulos/nuevo" className="text-primary underline">Crear el primero</Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-center gap-3 hover:bg-secondary/40">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest ${a.status === "published" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                        {a.status === "published" ? "Publicado" : "Borrador"}
                      </span>
                      {a.is_breaking_news && (
                        <span className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest bg-foreground text-white">Urgente</span>
                      )}
                      {a.category && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{getCategoryName(a.category)}</span>
                      )}
                    </div>
                    <div className="font-serif font-semibold text-sm truncate">{a.title || "(Sin título)"}</div>
                    <div className="text-xs text-muted-foreground">{formatRelativeTime(a.created_date)}</div>
                  </div>
                  <Link to={`/admin/articulos/${a.id}/editar`} className="p-2 text-muted-foreground hover:text-primary" title="Editar">
                    <Edit className="w-4 h-4" />
                  </Link>
                  {a.status === "published" && a.slug && (
                    <Link to={`/noticias/${a.slug}`} target="_blank" className="p-2 text-muted-foreground hover:text-primary" title="Ver en el sitio">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-border">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="font-serif font-bold uppercase text-sm tracking-wider">Ticker Urgente</h2>
            <Link to="/admin/ticker" className="text-xs text-primary uppercase tracking-widest font-semibold hover:underline">Gestionar</Link>
          </div>
          {ticker.filter((t) => t.is_active).length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hay titulares activos en el ticker.</div>
          ) : (
            <ul className="divide-y divide-border">
              {ticker.filter((t) => t.is_active).slice(0, 6).map((t) => (
                <li key={t.id} className="px-5 py-3 text-sm">
                  <span className="inline-block w-1.5 h-1.5 bg-primary mr-2 align-middle" />
                  {t.headline}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
