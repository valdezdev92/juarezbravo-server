import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, Tag } from "lucide-react";
import { api } from "@/api/client";
import { articleKeys } from "@/lib/article-queries";

export default function AdminTags() {
  const [search, setSearch] = useState("");
  const { data: tags = [], isLoading, isError, refetch } = useQuery({
    queryKey: articleKeys.tags,
    queryFn: ({ signal }) => api.articles.tags(signal),
  });
  const filtered = tags.filter(([name]) => name.toLocaleLowerCase("es-MX").includes(search.trim().toLocaleLowerCase("es-MX")));

  return (
    <div className="space-y-6">
      <div className="admin-page-heading">
        <div><h1>Etiquetas</h1><p>Encuentra las noticias agrupadas por las etiquetas que asignas en el editor.</p></div>
      </div>
      <section className="admin-panel" aria-labelledby="tags-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
          <h2 id="tags-heading" className="text-lg font-semibold">Etiquetas en uso <span className="ml-1 text-sm font-normal text-muted-foreground">{!isLoading && !isError ? filtered.length : ""}</span></h2>
          <label className="relative w-full sm:w-60">
            <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="admin-input pl-9" placeholder="Buscar etiqueta" aria-label="Buscar etiquetas" />
          </label>
        </div>
        {isLoading ? <p role="status" className="p-5 text-sm text-muted-foreground">Cargando etiquetas…</p>
          : isError ? <p role="alert" className="p-5 text-sm">No se pudieron cargar las etiquetas. <button type="button" onClick={() => refetch()} className="text-primary underline">Reintentar</button></p>
            : !filtered.length ? <p className="p-5 text-sm text-muted-foreground">{tags.length ? "No hay etiquetas que coincidan." : "Aún no hay etiquetas en el archivo."}</p>
              : (
                <ul className="divide-y">
                  {filtered.map(([name, count]) => (
                    <li key={name}>
                      <Link to={`/admin/articulos?etiqueta=${encodeURIComponent(name)}`} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm hover:bg-secondary/25 hover:text-primary sm:px-5">
                        <Tag size={17} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 break-words font-semibold">{name}</span>
                        <span className="text-xs text-muted-foreground">{count} {count === 1 ? "noticia" : "noticias"}</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
      </section>
    </div>
  );
}
