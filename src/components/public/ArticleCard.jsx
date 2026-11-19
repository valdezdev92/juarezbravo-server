import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Clock } from "lucide-react";
import { getCategoryName, formatRelativeTime } from "@/lib/categories";
import ArticleImage from './ArticleImage';

function ArticleLabels({ article, hero = false }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {article.is_breaking_news && (
        <span className="bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
          Urgente
        </span>
      )}
      {article.category && (
        <span className={`text-[10px] font-bold uppercase tracking-widest ${hero ? "bg-background px-2 py-0.5 text-foreground" : "text-primary"}`}>
          {getCategoryName(article.category)}
        </span>
      )}
    </div>
  );
}

function ArticleTime({ article, className }) {
  const date = article.published_at || article.created_date;
  if (!date) return null;

  return (
    <time dateTime={date} className={`flex items-center gap-1.5 text-xs ${className}`}>
      <Clock size={13} aria-hidden="true" />
      {formatRelativeTime(date)}
    </time>
  );
}

export default function ArticleCard({ article, variant = "default" }) {
  const [failedImage, setFailedImage] = useState(null);

  if (!article) return null;

  const hasImage = article.cover_image && failedImage !== article.cover_image;
  const link = `/noticias/${article.slug || article.id}`;
  const cover = (className, loading) => hasImage && (
    <ArticleImage
      key={article.cover_image}
      article={article}
      sizes={variant === 'compact' ? '68px' : variant === 'hero' ? '(min-width: 1024px) 65vw, 100vw' : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'}
      priority={variant === 'hero'}
      loading={loading}
      onError={() => setFailedImage(article.cover_image)}
      className={className}
    />
  );

  if (variant === "hero") {
    return (
      <Link to={link} className="group relative isolate flex min-h-[360px] items-end overflow-hidden bg-foreground text-white sm:min-h-[420px]">
        {cover("absolute inset-0 -z-10 size-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.035]", "eager")}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0c1321] via-[#0c1321]/70 to-[#0c1321]/15" />
        <div className="w-full px-5 pb-6 pt-20 sm:p-8 sm:pt-28">
          <ArticleLabels article={article} hero />
          <h3 className="mt-3 max-w-[24ch] break-words font-serif text-[26px] font-bold leading-tight group-hover:underline sm:text-[40px]">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
              {article.excerpt}
            </p>
          )}
          <div className="mt-5 flex items-center justify-between gap-4">
            <ArticleTime article={article} className="text-white/80" />
            <span aria-hidden="true" className="ml-auto flex size-9 items-center justify-center border border-white/50 group-hover:bg-white group-hover:text-foreground">
              <ArrowUpRight size={18} />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link to={link} className="group flex items-start gap-3 border-b border-border py-3.5 last:border-b-0">
        <div className="min-w-0 flex-1">
          <ArticleLabels article={article} />
          <p className="mt-1 line-clamp-3 break-words font-serif text-[15px] font-bold leading-snug group-hover:text-primary">
            {article.title}
          </p>
          <ArticleTime article={article} className="mt-1.5 text-muted-foreground" />
        </div>
        {cover("size-[68px] shrink-0 bg-secondary object-cover", "lazy")}
      </Link>
    );
  }

  return (
    <Link to={link} className="group flex min-w-0 flex-col border border-border bg-card transition-colors hover:border-primary/60">
      <div className="aspect-[16/10] overflow-hidden bg-foreground">
        {hasImage ? cover("size-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105", "lazy") : (
          <img src="/juarez-bravo-logo-mark.png" alt="" loading="lazy" className="mx-auto h-full w-auto object-contain" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <ArticleLabels article={article} />
        <h3 className="mt-2 line-clamp-3 break-words font-serif text-lg font-bold leading-snug group-hover:text-primary">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {article.excerpt}
          </p>
        )}
        <ArticleTime article={article} className="mt-auto pt-3 text-muted-foreground" />
      </div>
    </Link>
  );
}
