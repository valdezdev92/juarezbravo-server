import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import DOMPurify from "dompurify";
import { api, ApiError } from "@/api/client";
import { articleKeys } from "@/lib/article-queries";
import { getCategoryName, formatDateTime } from "@/lib/categories";
import ArticleCard from "@/components/public/ArticleCard";
import ArticleImage from "@/components/public/ArticleImage";
import { Clock, User, Tag as TagIcon, Share2, Facebook, Twitter } from "lucide-react";

export default function ArticleDetail() {
  const { slug } = useParams();
  const [failedImage, setFailedImage] = useState(null);

  const { data: article, isLoading, isError, error, refetch } = useQuery({
    queryKey: articleKeys.detail(slug),
    queryFn: ({ signal }) => api.articles.get(slug, signal),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 1,
  });

  const { data: related = [] } = useQuery({
    queryKey: articleKeys.related(article?.category, article?.id),
    queryFn: async ({ signal }) => {
      const result = await api.articles.page({ category: article.category, exclude: article.id, limit: 3 }, signal);
      return result.items;
    },
    enabled: !!article,
  });

  useEffect(() => {
    if (article?.id) {
      api.articles.view(article.id).catch(() => {});
    }
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
    const unavailable = isError && !(error instanceof ApiError && error.status === 404);
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-serif font-bold text-3xl mb-4">{unavailable ? 'No pudimos cargar la noticia' : 'Artículo no encontrado'}</h1>
        {unavailable && <button type="button" onClick={() => refetch()} className="mb-4 block w-full text-primary hover:underline">Volver a intentar</button>}
        <Link to="/" className="text-primary hover:underline">← Volver al inicio</Link>
      </div>
    );
  }

  const cleanBody = DOMPurify.sanitize(article.body || "");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Helmet>
        <title>{article.title} | Juárez Bravo</title>
        <meta name="description" content={article.excerpt || article.title} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.excerpt || ""} />
        {article.cover_image && <meta property="og:image" content={article.cover_image} />}
        <meta property="og:type" content="article" />
      </Helmet>

      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary">Inicio</Link>
        {article.category && (
          <>
            {" / "}
            <Link to={`/categoria/${article.category}`} className="hover:text-primary">
              {getCategoryName(article.category)}
            </Link>
          </>
        )}
      </div>

      <h1 className="mb-4 break-words font-serif text-3xl font-bold leading-tight sm:text-5xl">
        {article.title}
      </h1>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-6 pb-4 border-b border-border">
        {article.author && (
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />{article.author}
          </span>
        )}
        {article.published_at && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />{formatDateTime(article.published_at)}
          </span>
        )}
      </div>

      {article.cover_image && failedImage !== article.cover_image && (
        <ArticleImage
          key={article.cover_image}
          article={article}
          sizes="(min-width: 768px) 736px, 100vw"
          loading="eager"
          priority
          alt={article.title}
          onError={() => setFailedImage(article.cover_image)}
          className="w-full aspect-[16/9] object-cover mb-6"
        />
      )}

      {article.excerpt && (
        <p className="text-lg font-medium text-muted-foreground mb-6 leading-relaxed border-l-4 border-brand-red pl-4">
          {article.excerpt}
        </p>
      )}

      <div
        className="prose prose-lg max-w-none prose-headings:font-serif prose-a:text-primary"
        dangerouslySetInnerHTML={{ __html: cleanBody }}
      />

      {article.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border">
          {article.tags.map((tag) => (
            <Link
              key={tag}
              to={`/etiqueta/${tag}`}
              className="inline-flex items-center gap-1 text-xs bg-secondary px-3 py-1 hover:bg-primary/10 hover:text-primary"
            >
              <TagIcon className="w-3 h-3" />#{tag}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-border">
        <Share2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Compartir</span>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
          target="_blank" rel="noopener noreferrer"
          className="p-2 hover:text-primary"
        >
          <Facebook className="w-5 h-5" />
        </a>
        <a
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`}
          target="_blank" rel="noopener noreferrer"
          className="p-2 hover:text-primary"
        >
          <Twitter className="w-5 h-5" />
        </a>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif font-bold text-xl mb-4 border-b-2 border-foreground pb-2">
            También te puede interesar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
