import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import ArticleFeed from "@/components/public/ArticleFeed";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Helmet>
        <title>{query ? `"${query}" — Buscar` : "Buscar"} | Juárez Bravo</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="font-display text-4xl uppercase mb-6 flex items-center gap-3">
        <span className="h-8 w-1 shrink-0 bg-brand-red" />
        Buscar
      </h1>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar noticias"
          placeholder="¿Qué noticias buscas?"
          className="w-full bg-white border border-border pl-12 pr-4 py-4 text-lg font-serif outline-none focus:border-primary"
        />
      </div>

      <ArticleFeed
        filters={{ search: debouncedQuery.trim() }}
        enabled={debouncedQuery.trim().length >= 2}
        emptyMessage="No encontramos noticias que coincidan con tu búsqueda."
        showCount
      />
    </div>
  );
}
