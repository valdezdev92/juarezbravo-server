import React from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ArticleFeed from "@/components/public/ArticleFeed";

export default function TagPage() {
  const { slug } = useParams();

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

      <ArticleFeed filters={{ tag: slug }} emptyMessage="No hay noticias con esta etiqueta." />
    </div>
  );
}
