import React from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CATEGORIES, getCategoryName } from "@/lib/categories";
import ArticleFeed from "@/components/public/ArticleFeed";

export default function CategoryPage() {
  const { slug } = useParams();
  const categoryName = getCategoryName(slug);
  const exists = CATEGORIES.some((c) => c.slug === slug);

  return (
    <div className="site-container py-8">
      <Helmet>
        <title>{categoryName} | Juárez Bravo</title>
        <meta name="description" content={`Noticias de ${categoryName} en Ciudad Juárez — Juárez Bravo`} />
        <meta property="og:title" content={`${categoryName} | Juárez Bravo`} />
        <meta property="og:description" content={`Noticias de ${categoryName} en Ciudad Juárez`} />
      </Helmet>
      <div className="border-b-2 border-foreground pb-4 mb-8">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          <Link to="/" className="hover:text-primary">Inicio</Link>{" / "}<span>Sección</span>
        </div>
        <h1 className="font-display text-4xl uppercase sm:text-5xl tracking-tight flex items-center gap-3">
          <span className="h-8 w-1 shrink-0 bg-brand-red" />
          {categoryName}
        </h1>
        {!exists && <p className="text-sm text-muted-foreground mt-2">Esta categoría no existe.</p>}
      </div>

      <ArticleFeed
        filters={{ category: slug }}
        enabled={exists}
        emptyMessage="No hay noticias publicadas en esta categoría todavía."
      />
    </div>
  );
}
