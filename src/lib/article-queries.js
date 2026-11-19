export const articleKeys = {
  all: ['articles'],
  home: ['articles', 'public', 'home'],
  list: (filters) => ['articles', 'public', 'list', filters],
  detail: (slug) => ['articles', 'public', 'detail', slug],
  related: (category, id) => ['articles', 'public', 'related', category, id],
  adminList: (filters) => ['articles', 'admin', 'list', filters],
  adminDetail: (id) => ['articles', 'admin', 'detail', id],
  stats: ['articles', 'admin', 'stats'],
  tags: ['articles', 'admin', 'tags'],
};

export function invalidateArticles(queryClient) {
  return queryClient.invalidateQueries({ queryKey: articleKeys.all });
}
