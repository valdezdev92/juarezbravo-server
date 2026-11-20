import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Image, Megaphone, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { api } from "@/api/client";
import { EDITORIAL_CATEGORIES, getCategoryName, formatDateTime } from "@/lib/categories";
import { articleKeys, invalidateArticles } from "@/lib/article-queries";
import { tickerKeys } from "@/lib/ticker";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import PaginationControls from "@/components/PaginationControls";

export default function AdminArticles() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const search = params.get("buscar") || "";
  const status = params.get("estado") || "";
  const category = params.get("categoria") || "";
  const placement = params.get("visibilidad") || "";
  const sort = params.get("orden") || "-created_at";
  const tag = params.get("etiqueta") || "";
  const requestedPage = Number(params.get("pagina"));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const debouncedSearch = useDebounce(search, 350).trim();
  const filters = { page, limit: 25, search: debouncedSearch, status, category, placement, sort, tag };

  function changeFilter(key, value) {
    const next = new URLSearchParams(params);
    if (key !== "pagina") next.delete("pagina");
    if (value) next.set(key, String(value));
    else next.delete(key);
    setParams(next, { replace: key === "buscar" });
  }

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: articleKeys.adminList(filters),
    queryFn: ({ signal }) => api.articles.adminPage(filters, signal),
  });
  const articles = data?.items || [];
  const deleteMutation = useMutation({
    mutationFn: (id) => api.articles.delete(id),
    onSuccess: async () => {
      if (articles.length === 1 && page > 1) changeFilter("pagina", page - 1);
      await Promise.all([
        invalidateArticles(queryClient),
        queryClient.invalidateQueries({ queryKey: tickerKeys.all }),
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <div className="admin-page-heading">
        <div><h1>Noticias</h1><p>Busca, edita y organiza el archivo editorial.</p></div>
        <Button asChild><Link to="/admin/articulos/nuevo"><Plus size={17} /> Nueva noticia</Link></Button>
      </div>

      <section className="admin-panel" aria-labelledby="archive-heading">
        <div className="space-y-3 border-b p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="archive-heading" className="text-lg font-semibold">Archivo <span className="ml-1 text-sm font-normal text-muted-foreground">{data ? data.total.toLocaleString("es-MX") : ""}</span></h2>
            {(search || status || category || placement || tag || sort !== "-created_at") && (
              <Button variant="ghost" size="sm" onClick={() => setParams({})}><X size={15} /> Limpiar filtros</Button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,1.6fr)_repeat(4,minmax(0,1fr))]">
            <label className="relative sm:col-span-2 xl:col-span-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input value={search} onChange={(e) => changeFilter("buscar", e.target.value)} placeholder="Buscar noticias" aria-label="Buscar noticias" className="admin-input pl-9" />
            </label>
            <select value={status} onChange={(e) => changeFilter("estado", e.target.value)} aria-label="Estado de publicación" className="admin-input">
              <option value="">Todos los estados</option><option value="published">Publicadas</option><option value="draft">Borradores</option>
            </select>
            <select value={category} onChange={(e) => changeFilter("categoria", e.target.value)} aria-label="Categoría" className="admin-input">
              <option value="">Todas las categorías</option>
              {EDITORIAL_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <select value={placement} onChange={(e) => changeFilter("visibilidad", e.target.value)} aria-label="Visibilidad editorial" className="admin-input">
              <option value="">Toda la visibilidad</option><option value="featured">Marcadas para portada</option><option value="breaking">Marcadas como urgentes</option>
            </select>
            <select value={sort} onChange={(e) => changeFilter("orden", e.target.value)} aria-label="Ordenar noticias" className="admin-input">
              <option value="-created_at">Más recientes</option><option value="created_at">Más antiguas</option><option value="-views">Más vistas</option><option value="title">Título de A a Z</option>
            </select>
          </div>
          {tag && <Button variant="secondary" size="sm" onClick={() => changeFilter("etiqueta", "")} aria-label={`Quitar filtro por etiqueta ${tag}`}>#{tag} <X size={14} /></Button>}
        </div>

        {isLoading ? <p role="status" className="p-6 text-center text-sm text-muted-foreground">Cargando noticias…</p>
          : isError ? <p role="alert" className="p-6 text-center text-sm">No se pudieron cargar las noticias. <button type="button" onClick={() => refetch()} className="text-primary underline">Reintentar</button></p>
            : !articles.length ? <p className="p-6 text-center text-sm text-muted-foreground">No hay noticias con estos filtros.</p>
              : (
                <ul className="divide-y">
                  {articles.map(article => (
                    <li key={article.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-secondary/25 sm:flex-nowrap sm:px-5">
                      <div className="relative grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-background text-muted-foreground" aria-hidden="true">
                        <Image size={16} />
                        {article.cover_image && <img loading="lazy" src={article.cover_image} alt="" className="absolute inset-0 size-full object-cover" onError={(e) => { e.currentTarget.hidden = true; }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${article.status === "published" ? "bg-emerald-50 text-emerald-800" : "bg-secondary"}`}>{article.status === "published" ? "Publicada" : "Borrador"}</span>
                          {article.category && <span>{getCategoryName(article.category)}</span>}
                          {article.is_breaking_news && <span className="font-semibold text-primary">Urgente</span>}
                          {article.is_featured && (!article.featured_until || Date.parse(article.featured_until) > Date.now()) && <span className="font-semibold">Destacada</span>}
                        </div>
                        <Link to={`/admin/articulos/${article.id}/editar`} className="block break-words text-sm font-semibold hover:text-primary">{article.title || "(Sin título)"}</Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(article.published_at || article.created_date)}</p>
                      </div>
                      <div className="flex w-full flex-wrap justify-end gap-1 pl-10 sm:w-auto sm:pl-0">
                        {article.status === "published" && article.slug && (
                          <>
                            <Button asChild variant="ghost" size="icon"><Link to={`/admin/ticker?articulo=${encodeURIComponent(article.id)}`} title="Enviar a Última hora" aria-label={`Enviar ${article.title} a Última hora`}><Megaphone size={16} /></Link></Button>
                            <Button asChild variant="ghost" size="icon"><Link to={`/noticias/${encodeURIComponent(article.slug)}`} target="_blank" rel="noopener" title="Ver publicación" aria-label={`Ver ${article.title}`}><ExternalLink size={16} /></Link></Button>
                          </>
                        )}
                        <Button asChild variant="ghost" size="icon"><Link to={`/admin/articulos/${article.id}/editar`} title="Editar" aria-label={`Editar ${article.title}`}><Pencil size={16} /></Link></Button>
                        <Button type="button" variant="ghost" size="icon" disabled={deleteMutation.isPending} title="Eliminar" aria-label={`Eliminar ${article.title}`} onClick={() => {
                          if (window.confirm(`¿Eliminar «${article.title}»? Esta acción es definitiva.`)) deleteMutation.mutate(article.id);
                        }}><Trash2 size={16} /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
      </section>
      {deleteMutation.isError && <p role="alert" className="text-sm text-primary">No se pudo eliminar la noticia. Inténtalo de nuevo.</p>}
      {(data?.hasMore || page > 1) && <PaginationControls page={page} hasMore={data?.hasMore ?? false} onChange={(next) => changeFilter("pagina", next)} disabled={isFetching} />}
    </div>
  );
}
