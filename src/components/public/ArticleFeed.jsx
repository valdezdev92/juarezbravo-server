import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { articleKeys } from '@/lib/article-queries';
import ArticleCard from './ArticleCard';

export default function ArticleFeed({ filters, emptyMessage, enabled = true, showCount = false }) {
  const { data, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage, isFetchNextPageError } = useInfiniteQuery({
    queryKey: articleKeys.list(filters),
    queryFn: ({ pageParam, signal }) => api.articles.page({ ...filters, page: pageParam, limit: 24 }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled,
  });
  if (!enabled) return null;
  const articles = [...new Map((data?.pages.flatMap(page => page.items) || []).map(article => [article.id, article])).values()];

  return (
    <div aria-busy={isLoading || isFetchingNextPage}>
      {isLoading ? (
        <div role="status" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <span className="sr-only">Cargando noticias</span>
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 animate-pulse bg-secondary" />)}
        </div>
      ) : (
        <>
          {showCount && articles.length > 0 && <p className="mb-6 text-sm text-muted-foreground">Mostrando {articles.length} resultado{articles.length !== 1 ? 's' : ''}</p>}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map(article => <ArticleCard key={article.id} article={article} />)}
          </div>
          {!isError && articles.length === 0 && <p className="py-16 text-center text-muted-foreground">{emptyMessage}</p>}
        </>
      )}
      {isError && (
        <div role="alert" className="py-6 text-center">
          <p>No pudimos cargar las noticias.</p>
          <button type="button" className="mt-3 font-semibold text-primary hover:underline" onClick={() => isFetchNextPageError ? fetchNextPage() : refetch()}>Volver a intentar</button>
        </div>
      )}
      {hasNextPage && !isError && (
        <div className="mt-8 text-center">
          <button type="button" disabled={isFetchingNextPage} onClick={() => fetchNextPage()} className="border border-border bg-card px-6 py-3 font-semibold hover:border-primary disabled:opacity-50">
            {isFetchingNextPage ? 'Cargando…' : 'Cargar más noticias'}
          </button>
        </div>
      )}
    </div>
  );
}
