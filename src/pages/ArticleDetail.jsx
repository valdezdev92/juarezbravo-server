import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import DOMPurify from "dompurify";
import { base44 } from "@/api/base44Client";
import { getCategoryName, formatDateTime } from "@/lib/categories";
import ArticleCard from "@/components/public/ArticleCard";
import { Clock, User, Tag as TagIcon, Share2, Facebook, Twitter } from "lucide-react";

export default function ArticleDetail() {
  const { slug } = useParams();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const bySlug = await base44.entities.Article.filter({ slug }, "-published_at", 1);
      if (bySlug.length) return bySlug;
      // Fallback: slug param might be a legacy id
      const all = await base44.entities.Article.list("-created_date", 500);
      return all.filter((a) => a.id === slug);
    },
  });

  const article = articles[0];

  const { data: related = [] } = useQuery({
    queryKey: ["related", article?.category, article?.id],
    queryFn: async () => {
      if (!article?.category) return [];
      const all = await base44.entities.Article.filter(
        { status: "published", category: article.category },
        "-published_at",
        4
      );
      return all.filter((a) => a.id !== article.id).slice(0, 3);
    },
    enabled: !!article,
  });

  useEffect(() => {
    if (article?.id) {
      base44.entities.Article.update(article.id, {
        views: (article.views || 0) + 1,
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-8 bg-secondary mb-4 w-32" />
        <div className="h-12 bg-secondary mb-4" />
        <div className="h-72 bg-secondary mb-4" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-3xl font-bold mb-2">Noticia no encontrada</h1>
        <p className="text-muted-foreground mb-6">
          El artículo que buscas no existe o fue eliminado.
        </p>
        <Link
          to="/"
          className="inline-block bg-primary text-primary-foreground px-5 py-2 text-sm uppercase font-semibold"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  const cleanBody = DOMPurify.sanitize(article.body || "");
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Helmet>
        <title>{article.title} | JuarezBravo.com</title>
        <meta name="description" content={article.excerpt || article.title} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.excerpt || article.title} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={pageUrl} />
        {article.cover_image && <meta property="og:image" content={article.cover_image} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.excerpt || article.title} />
        {article.cover_image && <meta name="twitter:image" content={article.cover_image} />}
      </Helmet>
      {/* Breadcrumb */}
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary">
          Inicio
        </Link>
        {" / "}
        {article.category && (
          <>
            <Link
              to={`/categoria/${article.category}`}
              className="hover:text-primary"
            >
              {getCategoryName(article.category)}
            </Link>
            {" / "}
          </>
        )}
        <span className="text-foreground">Artículo</span>
      </div>

      {/* Category + breaking */}
      <div className="flex items-center gap-2 mb-4">
        {article.is_breaking_news && (
          <span className="bg-primary text-primary-foreground px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">
            Último Momento
          </span>
        )}
        {article.category && (
          <Link
            to={`/categoria/${article.category}`}
            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
          >
            {getCategoryName(article.category)}
          </Link>
        )}
      </div>

      {/* Title */}
      <h1 className="font-serif font-bold text-3xl sm:text-5xl leading-tight tracking-tight mb-4">
        {article.title}
      </h1>

      {/* Excerpt */}
      {article.excerpt && (
        <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-6 font-serif">
          {article.excerpt}
        </p>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 border-y border-border text-sm text-muted-foreground mb-8">
        {article.author && (
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span className="font-medium text-foreground">{article.author}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {formatDateTime(article.published_at || article.created_date)}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest mr-1">
            <Share2 className="w-3.5 h-3.5 inline mr-1" />
            Compartir
          </span>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 border border-border hover:bg-primary hover:text-white hover:border-primary flex items-center justify-center transition-colors"
          >
            <Facebook className="w-4 h-4" />
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 border border-border hover:bg-primary hover:text-white hover:border-primary flex items-center justify-center transition-colors"
          >
            <Twitter className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Cover */}
      {article.cover_image && (
        <figure className="mb-8 -mx-4 sm:mx-0">
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full max-h-[560px] object-cover"
          />
        </figure>
      )}

      {/* Body */}
      <div
        className="article-content max-w-3xl mx-auto"
        dangerouslySetInnerHTML={{ __html: cleanBody }}
      />

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="max-w-3xl mx-auto mt-10 pt-6 border-t border-border">
          <div className="flex items-center flex-wrap gap-2">
            <TagIcon className="w-4 h-4 text-muted-foreground" />
            {article.tags.map((tag) => (
              <Link
                key={tag}
                to={`/etiqueta/${tag}`}
                className="text-xs px-3 py-1 bg-secondary hover:bg-primary hover:text-primary-foreground uppercase tracking-widest font-medium"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-16">
          <div className="border-b-2 border-foreground pb-2 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary" />
            <h2 className="font-serif font-bold text-xl uppercase">
              También te puede interesar
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}