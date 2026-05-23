import React from "react";
import { Link } from "react-router-dom";
import { getCategoryName, formatRelativeTime } from "@/lib/categories";
import { Clock } from "lucide-react";

export default function ArticleCard({ article, variant = "default" }) {
  if (!article) return null;

  const link = `/noticias/${article.slug || article.id}`;

  if (variant === "hero") {
    return (
      <Link to={link} className="group block relative overflow-hidden bg-foreground h-full min-h-[420px]">
        {article.cover_image ? (
          <img
            src={article.cover_image}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-primary/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-6 sm:p-8 text-white">
          <div className="flex items-center gap-2 mb-3">
            {article.is_breaking_news && (
              <span className="bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                Urgente
              </span>
            )}
            {article.category && (
              <span className="bg-white/20 backdrop-blur px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest">
                {getCategoryName(article.category)}
              </span>
            )}
          </div>
          <h2 className="font-serif font-bold text-2xl sm:text-4xl leading-tight tracking-tight mb-3 group-hover:underline decoration-2">
            {article.title}
          </h2>
          {article.excerpt && (
            <p className="text-sm sm:text-base text-white/85 line-clamp-2 max-w-2xl">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center gap-2 mt-4 text-xs text-white/70">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(article.published_at || article.created_date)}
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link to={link} className="group flex gap-3 py-3 border-b border-border last:border-0">
        {article.cover_image && (
          <div className="w-20 h-20 shrink-0 overflow-hidden bg-secondary">
            <img
              src={article.cover_image}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {article.category && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {getCategoryName(article.category)}
            </span>
          )}
          <h3 className="font-serif font-semibold text-sm leading-snug mt-1 line-clamp-3 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(article.published_at || article.created_date)}
          </div>
        </div>
      </Link>
    );
  }

  // default card
  return (
    <Link to={link} className="group block bg-card hover:shadow-lg transition-shadow">
      <div className="aspect-[16/10] overflow-hidden bg-secondary">
        {article.cover_image ? (
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-muted" />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {article.is_breaking_news && (
            <span className="bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
              Urgente
            </span>
          )}
          {article.category && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {getCategoryName(article.category)}
            </span>
          )}
        </div>
        <h3 className="font-serif font-bold text-lg leading-snug line-clamp-3 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(article.published_at || article.created_date)}
        </div>
      </div>
    </Link>
  );
}