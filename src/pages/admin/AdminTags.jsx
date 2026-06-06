import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Tag as TagIcon } from "lucide-react";

export default function AdminTags() {
  const { data: articles = [] } = useQuery({
    queryKey: ["admin", "articles"],
    queryFn: () => api.articles.list("-created_date", 500),
  });

  const tags = useMemo(() => {
    const counts = {};
    articles.forEach((a) => {
      (a.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="font-serif font-bold text-3xl">Etiquetas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Las etiquetas se crean automáticamente al asignarlas en cada artículo.
        </p>
      </div>

      {tags.length === 0 ? (
        <div className="bg-white border border-border p-8 text-center text-sm text-muted-foreground">
          Aún no has usado etiquetas en tus artículos.
        </div>
      ) : (
        <div className="bg-white border border-border">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-serif font-bold text-sm uppercase tracking-wider">
              {tags.length} etiqueta{tags.length !== 1 ? "s" : ""} en uso
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {tags.map(([name, count]) => (
              <li key={name} className="px-5 py-3 flex items-center justify-between hover:bg-secondary/40">
                <Link
                  to={`/etiqueta/${name}`}
                  target="_blank"
                  className="flex items-center gap-2 font-medium text-sm hover:text-primary"
                >
                  <TagIcon className="w-4 h-4 text-muted-foreground" />
                  #{name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {count} artículo{count !== 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
