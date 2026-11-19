import React from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import ArticleCard from "@/components/public/ArticleCard";
import SectionHeader from "@/components/public/SectionHeader";
import { CATEGORIES } from "@/lib/categories";

function pickHero(articles) {
  const now = Date.now();
  const hero = articles.find(
    (article) => article.is_featured && (!article.featured_until || new Date(article.featured_until).getTime() > now)
  );
  return hero || articles[0];
}

function pickDiverseSidebar(pool, count = 4) {
  const picked = [];
  const usedIds = new Set();

  for (const category of CATEGORIES) {
    if (picked.length >= count) break;
    const article = pool.find((item) => item.category === category.slug && !usedIds.has(item.id));
    if (article) {
      picked.push(article);
      usedIds.add(article.id);
    }
  }

  for (const article of pool) {
    if (picked.length >= count) break;
    if (!usedIds.has(article.id)) {
      picked.push(article);
      usedIds.add(article.id);
    }
  }

  return picked;
}

export default function Home() {
  const { data: articles = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["articles", "published"],
    queryFn: () => api.articles.filter({ status: "published" }, "-published_at", 100),
  });

  const categoryQueries = useQueries({
    queries: CATEGORIES.map((category) => ({
      queryKey: ["articles", "cat", category.slug],
      queryFn: () =>
        api.articles.filter({ status: "published", category: category.slug }, "-published_at", 5),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const featured = pickHero(articles);
  const remaining = articles.filter((article) => article.id !== featured?.id);
  const breaking = remaining.slice(0, 4);
  const pool = remaining.slice(4);
  const secondary = pickDiverseSidebar(pool);
  const shownIds = new Set(secondary.map((article) => article.id));
  const latest = pool.filter((article) => !shownIds.has(article.id)).slice(0, 18);

  return (
    <div className="site-container flex flex-col gap-7 py-5 sm:gap-9 sm:py-7">
      <Helmet>
        <title>Juárez Bravo | Noticias de Ciudad Juárez</title>
        <meta name="description" content="Las últimas noticias de Ciudad Juárez, Chihuahua. Sigue la cobertura de seguridad, política, deportes y entretenimiento." />
        <meta property="og:title" content="Juárez Bravo | Noticias de Ciudad Juárez" />
        <meta property="og:description" content="Las últimas noticias de Ciudad Juárez, Chihuahua. Sigue la cobertura de seguridad, política, deportes y entretenimiento." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={new URL("/brand-cover.webp", window.location.origin).href} />
        <meta property="og:image:alt" content="Ciudad Juárez, Chihuahua. Comprometidos con la verdad." />
      </Helmet>

      <h1 className="sr-only">Juárez Bravo, noticias de Ciudad Juárez</h1>
      <div className="brand-cover">
        <img
          src="/brand-cover.webp"
          alt="Ciudad Juárez, Chihuahua. Comprometidos con la verdad."
          width="1280"
          height="487"
        />
      </div>

      <section aria-labelledby="portada">
        <SectionHeader title="En portada" id="portada" />
        {isLoading ? (
          <div role="status" className="motion-safe:animate-pulse">
            <span className="sr-only">Cargando noticias</span>
            <div className="min-h-80 bg-secondary md:min-h-[420px]" />
          </div>
        ) : featured ? (
          <div className={breaking.length > 0 ? "grid gap-5 lg:grid-cols-[minmax(0,2.25fr)_minmax(0,1fr)] lg:gap-6" : undefined}>
            <ArticleCard article={featured} variant="hero" />
            {breaking.length > 0 && (
              <aside aria-labelledby="noticias-recientes" className="min-w-0 border border-border bg-card px-4 pb-1 sm:px-5">
                <h3 id="noticias-recientes" className="border-b-2 border-primary py-3.5 font-display text-[22px] uppercase leading-tight">
                  Últimas publicadas
                </h3>
                {breaking.map((article) => (
                  <ArticleCard key={article.id} article={article} variant="compact" />
                ))}
              </aside>
            )}
          </div>
        ) : (
          <div className="border border-border bg-card px-6 py-12 text-center">
            <p className="text-muted-foreground">
              {isError ? "Por el momento no pudimos cargar las noticias." : "Aún no hay noticias publicadas."}
            </p>
            {isError && (
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 font-semibold text-primary hover:underline"
              >
                Volver a intentar
              </button>
            )}
          </div>
        )}
      </section>

      {secondary.length > 0 && (
        <section aria-labelledby="destacadas">
          <SectionHeader title="Lo más destacado" id="destacadas" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {secondary.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
        </section>
      )}

      {latest.length > 0 && (
        <section aria-labelledby="mas-noticias">
          <SectionHeader title="Más noticias" id="mas-noticias" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
        </section>
      )}

      {categoryQueries.some((query) => query.data?.length > 0) && (
        <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
          {CATEGORIES.map((category, index) => {
            const [lead, ...rest] = categoryQueries[index].data ?? [];
            if (!lead) return null;

            return (
              <section key={category.slug} aria-labelledby={`portada-${category.slug}`}>
                <SectionHeader title={category.name} id={`portada-${category.slug}`}>
                  <Link
                    to={`/categoria/${category.slug}`}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    aria-label={`Ver todas las noticias de ${category.name}`}
                  >
                    Ver todo <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </SectionHeader>
                <ArticleCard article={lead} />
                {rest.length > 0 && (
                  <div className="border-x border-b border-border bg-card px-4">
                    {rest.map((article) => <ArticleCard key={article.id} article={article} variant="compact" />)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
