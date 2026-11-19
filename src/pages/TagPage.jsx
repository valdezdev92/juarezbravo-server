import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { api } from "@/api/client";
import ArticleCard from "@/components/public/ArticleCard";

export default function TagPage() {
  const { slug } = useParams();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["tag", slug],
    queryFn: () =>
      api.articles.filter({ status: "published", tag: slug }, "-published_at", 100),
  });

  return (
    <div className="site-container py-8">
      <Helmet>
        <title>#{slug} | Juárez Bravo</title>
        <meta name="description" content={`Noticias etiquetadas con #${slug} en Juárez Bravo`} />
        <meta property="og:title" content={`#${slug} | Juárez Bravo`} />
      </Helmet>
      <div className="border-b-2 border-foreground pb-4 mb-8">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          <Link to="/" className="hover:text-primary">Inicio</Link> / Etiqueta
        </div>
        <h1 className="font-display text-4xl uppercase tracking-tight flex items-center gap-3">
          <span className="h-8 w-1 shrink-0 bg-brand-red" />
          #{slug}
        </h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-secondary animate-pulse" />)}
        </div>
      ) : articles.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">No hay noticias con esta etiqueta.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => <ArticleCard key={article.id} article={article} />)}
        </div>
      )}
    </div>
  );
}
