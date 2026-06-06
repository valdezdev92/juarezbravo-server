import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { api } from "@/api/client";
import ArticleCard from "@/components/public/ArticleCard";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () =>
      api.articles.filter({ status: "published", search: debouncedQuery }, "-published_at", 50),
    enabled: debouncedQuery.trim().length >= 2,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Helmet>
        <title>{query ? `"${query}" — Buscar` : "Buscar"} | JuarezBravo.com</title>
        <meta name="robots" content="noindex" />
      </Helmet>
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

      {debouncedQuery.trim().length >= 2 && !isFetching && (
        <p className="text-sm text-muted-foreground mb-6">
          {results.length} resultado{results.length !== 1 ? "s" : ""} para "{debouncedQuery}"
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((article) => <ArticleCard key={article.id} article={article} />)}
      </div>

      {debouncedQuery.trim().length >= 2 && !isFetching && results.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No encontramos noticias que coincidan con tu búsqueda.
        </p>
      )}
    </div>
  );
}
