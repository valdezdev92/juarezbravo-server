import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { base44 } from "@/api/base44Client";
import { CATEGORIES, getCategoryName } from "@/lib/categories";
import ArticleCard from "@/components/public/ArticleCard";

export default function CategoryPage() {
  const { slug } = useParams();
  const categoryName = getCategoryName(slug);
  const exists = CATEGORIES.some((c) => c.slug === slug);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["category", slug],
    queryFn: () =>
      base44.entities.Article.filter(
        { status: "published", category: slug },
        "-published_at",
        50
      ),
    enabled: exists,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Helmet>
        <title>{categoryName} | JuarezBravo.com</title>
        <meta name="description" content={`Noticias de ${categoryName} en Ciudad Juárez — JuarezBravo.com`} />
        <meta property="og:title" content={`${categoryName} | JuarezBravo.com`} />
        <meta property="og:description" content={`Noticias de ${categoryName} en Ciudad Juárez`} />
      </Helmet>
      {/* Header */}
      <div className="border-b-2 border-foreground pb-4 mb-8">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          <Link to="/" className="hover:text-primary">Inicio</Link>
          {" / "}
          <span>Sección</span>
        </div>
        <h1 className="font-serif font-bold text-4xl sm:text-5xl tracking-tight flex items-center gap-3">
          <span className="w-2 h-10 bg-primary" />
          {categoryName}
        </h1>
        {!exists && (
          <p className="text-sm text-muted-foreground mt-2">
            Esta categoría no existe.
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[16/10] bg-secondary" />
              <div className="h-4 bg-secondary mt-3 w-1/3" />
              <div className="h-6 bg-secondary mt-2" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            No hay noticias publicadas en esta categoría todavía.
          </p>
        </div>
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