import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ArticleCard from "@/components/public/ArticleCard";
import SectionHeader from "@/components/public/SectionHeader";
import { CATEGORIES } from "@/lib/categories";
import { Link } from "react-router-dom";

export default function Home() {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["articles", "published"],
    queryFn: () =>
      base44.entities.Article.filter({ status: "published" }, "-published_at", 50),
  });

  const featured = articles.find((a) => a.is_featured) || articles[0];
  const secondary = articles.filter((a) => a.id !== featured?.id).slice(0, 4);
  const latest = articles.filter((a) => a.id !== featured?.id).slice(4, 13);
  const breakingHighlight = articles.filter((a) => a.is_breaking_news).slice(0, 4);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="animate-pulse grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[420px] bg-secondary" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-secondary" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!articles.length) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-serif text-4xl font-bold mb-4">
          Bienvenido a JuarezBravo<span className="text-primary">.com</span>
        </h1>
        <p className="text-muted-foreground mb-6">
          Aún no hay noticias publicadas. El editor está preparando contenido fresco.
        </p>
        <Link
          to="/admin"
          className="inline-block bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold uppercase tracking-wide hover:bg-primary/90"
        >
          Ir al Panel Editorial
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Hero + Sidebar */}
      <section className="grid lg:grid-cols-3 gap-6 mb-12">
        <div className="lg:col-span-2">
          {featured && <ArticleCard article={featured} variant="hero" />}
        </div>
        <aside className="bg-card border border-border p-4">
          <div className="flex items-center gap-2 border-b-2 border-primary pb-2 mb-2">
            <h3 className="font-serif font-bold text-sm uppercase tracking-widest">
              Lo más destacado
            </h3>
          </div>
          {secondary.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">
              No hay más noticias aún.
            </p>
          )}
          {secondary.map((article) => (
            <ArticleCard key={article.id} article={article} variant="compact" />
          ))}
        </aside>
      </section>

      {/* Breaking news strip */}
      {breakingHighlight.length > 0 && (
        <section className="mb-12">
          <SectionHeader title="Último Momento" subtitle="Noticias urgentes en Juárez" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {breakingHighlight.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}

      {/* Latest news grid */}
      <section className="mb-12">
        <SectionHeader title="Últimas Noticias" subtitle="Lo más reciente publicado" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {latest.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>

      {/* By category */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {CATEGORIES.slice(0, 4).map((cat) => {
          const catArticles = articles
            .filter((a) => a.category === cat.slug)
            .slice(0, 3);
          if (!catArticles.length) return null;
          return (
            <div key={cat.slug}>
              <div className="flex items-end justify-between border-b border-border pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary" />
                  <h3 className="font-serif font-bold text-lg uppercase">
                    {cat.name}
                  </h3>
                </div>
                <Link
                  to={`/categoria/${cat.slug}`}
                  className="text-[11px] uppercase tracking-widest text-primary font-semibold hover:underline"
                >
                  Ver todo →
                </Link>
              </div>
              <div>
                {catArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} variant="compact" />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}