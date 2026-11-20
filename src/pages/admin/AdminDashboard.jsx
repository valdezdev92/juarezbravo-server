import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, FileEdit, Eye, ExternalLink, Pencil, ArrowRight, Plus, Radio } from "lucide-react";
import { api } from "@/api/client";
import StatCard from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { getCategoryName, formatRelativeTime } from "@/lib/categories";
import { articleKeys } from "@/lib/article-queries";
import { useScheduleClock } from "@/hooks/use-schedule-clock";
import { formatScheduleDate, visibleTickerQuery } from "@/lib/ticker";

export default function AdminDashboard() {
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: articleKeys.stats,
    queryFn: ({ signal }) => api.articles.stats(signal),
  });
  const ticker = useQuery(visibleTickerQuery);
  const items = ticker.data || [];
  const now = useScheduleClock(items);
  const live = items.filter(item => !item.ends_at || Date.parse(item.ends_at) > now);
  const recent = stats?.recent || [];

  return (
    <div className="space-y-6">
      <div className="admin-page-heading">
        <div>
          <h1>Resumen editorial</h1>
          <p>Revisa tus publicaciones y los titulares de la cabecera.</p>
        </div>
        <Button asChild><Link to="/admin/articulos/nuevo"><Plus size={17} /> Nueva noticia</Link></Button>
      </div>

      {isLoading && <p role="status" className="text-sm text-muted-foreground">Cargando resumen…</p>}
      {isError && <p role="alert" className="text-sm text-primary">No se pudo cargar el resumen. <button type="button" onClick={() => refetch()} className="underline">Reintentar</button></p>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Noticias publicadas" value={stats?.published ?? "—"} icon={Newspaper} />
        <StatCard label="Borradores" value={stats?.drafts ?? "—"} icon={FileEdit} />
        <StatCard label="Vistas totales" value={stats?.totalViews ?? "—"} icon={Eye} />
        <StatCard label="Titulares en cabecera" value={ticker.data && !ticker.isError ? live.length : "—"} icon={Radio} accent />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section className="admin-panel" aria-labelledby="recent-news">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-4 sm:px-5">
            <h2 id="recent-news" className="text-lg font-semibold">Noticias recientes</h2>
            <Link to="/admin/articulos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          {stats && (recent.length ? (
            <ul className="divide-y">
              {recent.map((article) => (
                <li key={article.id} className="flex items-center gap-2 px-4 py-3 hover:bg-secondary/25 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${article.status === "published" ? "bg-emerald-50 text-emerald-800" : "bg-secondary"}`}>
                        {article.status === "published" ? "Publicada" : "Borrador"}
                      </span>
                      {article.category && <span>{getCategoryName(article.category)}</span>}
                      <span>{formatRelativeTime(article.created_date)}</span>
                    </div>
                    <Link to={`/admin/articulos/${article.id}/editar`} className="block break-words text-sm font-semibold hover:text-primary">{article.title || "(Sin título)"}</Link>
                  </div>
                  <Button asChild variant="ghost" size="icon"><Link to={`/admin/articulos/${article.id}/editar`} aria-label={`Editar ${article.title}`}><Pencil size={16} /></Link></Button>
                  {article.status === "published" && article.slug && (
                    <Button asChild variant="ghost" size="icon"><Link to={`/noticias/${encodeURIComponent(article.slug)}`} target="_blank" rel="noopener" aria-label={`Ver ${article.title}`}><ExternalLink size={16} /></Link></Button>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="p-5 text-sm text-muted-foreground">Aún no hay noticias en el archivo.</p>)}
        </section>

        <section className="admin-panel" aria-labelledby="live-headlines">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-4 sm:px-5">
            <h2 id="live-headlines" className="text-lg font-semibold">Última hora</h2>
            <Link to="/admin/ticker" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              Administrar <ArrowRight size={14} />
            </Link>
          </div>
          {ticker.isLoading ? <p role="status" className="p-5 text-sm text-muted-foreground">Cargando titulares…</p>
            : ticker.isError ? <p role="alert" className="p-5 text-sm">No se pudieron cargar los titulares. <button type="button" onClick={() => ticker.refetch()} className="text-primary underline">Reintentar</button></p>
              : live.length ? (
                <ul className="divide-y">
                  {live.slice(0, 6).map((item) => (
                    <li key={item.id} className="flex gap-3 px-4 py-3 sm:px-5">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold">{item.headline}</p>
                        <p className="text-xs text-muted-foreground">{item.ends_at ? `Hasta ${formatScheduleDate(item.ends_at)}` : "Sin vencimiento"}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="p-5 text-sm text-muted-foreground">La cabecera está sin titulares visibles.</p>}
        </section>
      </div>
    </div>
  );
}
