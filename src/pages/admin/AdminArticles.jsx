import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CATEGORIES, getCategoryName, formatDateTime } from "@/lib/categories";
import { Edit, Trash2, ExternalLink, Search, PlusCircle } from "lucide-react";

export default function AdminArticles() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["admin", "articles"],
    queryFn: () => base44.entities.Article.list("-created_date", 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Article.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "articles"] }),
  });

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!(a.title || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [articles, statusFilter, categoryFilter, search]);

  const handleDelete = (id, title) => {
    if (window.confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-serif font-bold text-3xl">Artículos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {articles.length} artículo{articles.length !== 1 ? "s" : ""} en total
          </p>
        </div>
        <Link
          to="/admin/articulos/nuevo"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-primary/90"
        >
          <PlusCircle className="w-4 h-4" />
          Nueva Noticia
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-border p-4 grid sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border outline-none focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-background border border-border outline-none focus:border-primary"
        >
          <option value="all">Todos los estados</option>
          <option value="published">Publicados</option>
          <option value="draft">Borradores</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-background border border-border outline-none focus:border-primary"
        >
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider">
            <tr className="text-left">
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3 hidden md:table-cell">Categoría</th>
              <th className="px-4 py-3 hidden md:table-cell">Estado</th>
              <th className="px-4 py-3 hidden lg:table-cell">Fecha</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No hay artículos que coincidan.
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      {a.is_breaking_news && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-primary text-white font-bold uppercase">
                          Urgente
                        </span>
                      )}
                      {a.is_featured && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-foreground text-white font-bold uppercase">
                          Hero
                        </span>
                      )}
                    </div>
                    <div className="font-serif font-semibold">
                      {a.title || "(Sin título)"}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {a.category ? (
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        {getCategoryName(a.category)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span
                      className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest ${
                        a.status === "published"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {a.status === "published" ? "Publicado" : "Borrador"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                    {formatDateTime(a.published_at || a.created_date)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {a.status === "published" && a.slug && (
                        <Link
                          to={`/noticias/${a.slug}`}
                          target="_blank"
                          className="p-2 hover:text-primary"
                          title="Ver"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                      <Link
                        to={`/admin/articulos/${a.id}/editar`}
                        className="p-2 hover:text-primary"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(a.id, a.title)}
                        className="p-2 hover:text-primary"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}