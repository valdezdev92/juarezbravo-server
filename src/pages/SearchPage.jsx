import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ArticleCard from "@/components/public/ArticleCard";
import { Search } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const { data: allArticles = [] } = useQuery({
    queryKey: ["search-all"],
    queryFn: () =>
      base44.entities.Article.filter({ status: "published" }, "-published_at", 200),
  });

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allArticles.filter(
      (a) =>
        (a.title || "").toLowerCase().includes(q) ||
        (a.excerpt || "").toLowerCase().includes(q) ||
        (a.body || "").toLowerCase().includes(q)
    );
  }, [query, allArticles]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-serif font-bold text-4xl mb-6 flex items-center gap-3">
        <span className="w-2 h-10 bg-primary" />
        Buscar
      </h1>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="¿Qué noticias buscas?"
          className="w-full bg-white border border-border pl-12 pr-4 py-4 text-lg font-serif outline-none focus:border-primary"
        />
      </div>

      {query.trim() && (
        <p className="text-sm text-muted-foreground mb-6">
          {results.length} resultado{results.length !== 1 ? "s" : ""} para “{query}”
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {query.trim() && results.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No encontramos noticias que coincidan con tu búsqueda.
        </p>
      )}
    </div>
  );
}