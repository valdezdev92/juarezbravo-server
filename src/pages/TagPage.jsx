import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ArticleCard from "@/components/public/ArticleCard";

export default function TagPage() {
  const { slug } = useParams();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["tag", slug],
    queryFn: async () => {
      const all = await base44.entities.Article.filter(
        { status: "published" },
        "-published_at",
        200
      );
      return all.filter((a) => (a.tags || []).includes(slug));
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="border-b-2 border-foreground pb-4 mb-8">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          <Link to="/" className="hover:text-primary">Inicio</Link> / Etiqueta
        </div>
        <h1 className="font-serif font-bold text-4xl tracking-tight flex items-center gap-3">
          <span className="w-2 h-10 bg-primary" />
          #{slug}
        </h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-secondary animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">
          No hay noticias con esta etiqueta.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}