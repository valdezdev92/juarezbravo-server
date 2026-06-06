import React from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { api } from "@/api/client";
import ArticleCard from "@/components/public/ArticleCard";
import SectionHeader from "@/components/public/SectionHeader";
import { CATEGORIES } from "@/lib/categories";
import { Link } from "react-router-dom";

function pickDiverseSidebar(pool, count = 4) {
  const picked = [];
  const usedIds = new Set();

  for (const cat of CATEGORIES) {
    if (picked.length >= count) break;
    const found = pool.find((a) => a.category === cat.slug && !usedIds.has(a.id));
    if (found) { picked.push(found); usedIds.add(found.id); }
  }

  for (const a of pool) {
    if (picked.length >= count) break;
    if (!usedIds.has(a.id)) { picked.push(a); usedIds.add(a.id); }
  }

  return picked;
}

export default function Home() {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["articles", "published"],
    queryFn: () => api.articles.filter({ status: "published" }, "-published_at", 100),
  });

  const categoryQueries = useQueries({
    queries: CATEGORIES.map((cat) => ({
      queryKey: ["articles", "cat", cat.slug],
      queryFn: () =>
        api.articles.filter({ status: "published", category: cat.slug }, "-published_at", 5),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const featured  = articles[0];
  const breaking  = articles.slice(1, 5);
  const pool      = articles.slice(5);
  const secondary = pickDiverseSidebar(pool, 4);
  const shownIds  = new Set(secondary.map((a) => a.id));
  const latest    = pool.filter((a) => !shownIds.has(a.id)).slice(0, 18);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        <div className="animate-pulse grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[420px] bg-secondary" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-secondary" />)}
          </div>
        </div>
        <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 bg-secondary" />)}
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-12">
      <Helmet>
        <title>JuarezBravo.com — Noticias de Ciudad Juárez</title>
        <meta name="description" content="Las últimas noticias de Ciudad Juárez: seguridad, política, sociedad, deportes y entretenimiento." />
        <meta property="og:title" content="JuarezBravo.com — Noticias de Ciudad Juárez" />
        <meta property="og:description" content="Las últimas noticias de Ciudad Juárez: seguridad, política, sociedad, deportes y entretenimiento." />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Hero + Sidebar */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {featured && <ArticleCard article={featured} variant="hero" />}
        </div>
        <aside className="bg-card border border-border p-4 flex flex-col">
          <div className="flex items-center gap-2 border-b-2 border-primary pb-2 mb-3">
            <h3 className="font-serif font-bold text-sm uppercase tracking-widest">Lo más destacado</h3>
          </div>
          {secondary.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No hay más noticias aún.</p>
          ) : (
            secondary.map((article) => (
              <ArticleCard key={article.id} article={article} variant="compact" />
            ))
          )}
        </aside>
      </section>

      {/* Último Momento */}
      {breaking.length >= 1 && (
        <section>
          <SectionHeader title="Último Momento" subtitle="Lo más reciente en Ciudad Juárez" />
          <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${breaking.length >= 3 ? "lg:grid-cols-4" : "lg:grid-cols-2"}`}>
            {breaking.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
        </section>
      )}

      {/* Latest */}
      {latest.length > 0 && (
        <section>
          <SectionHeader title="Últimas Noticias" subtitle="Lo más reciente publicado" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {latest.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
        </section>
      )}

      {/* Category sections */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
        {CATEGORIES.map((cat, i) => {
          const catArticles = categoryQueries[i]?.data ?? [];
          if (!catArticles.length) return null;
          const [lead, ...rest] = catArticles;

          return (
            <div key={cat.slug}>
              <div className="flex items-end justify-between border-b-2 border-foreground pb-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-primary" />
                  <h3 className="font-serif font-bold text-xl uppercase tracking-tight">{cat.name}</h3>
                </div>
                <Link
                  to={`/categoria/${cat.slug}`}
                  className="text-[11px] uppercase tracking-widest text-primary font-semibold hover:underline"
                >
                  Ver todo →
                </Link>
              </div>
              <ArticleCard article={lead} />
              {rest.length > 0 && (
                <div className="mt-3 border-t border-border">
                  {rest.map((article) => <ArticleCard key={article.id} article={article} variant="compact" />)}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
