const API_BASE = '/api';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getToken() {
  return localStorage.getItem('auth_token');
}

async function request(method, endpoint, body = undefined, signal = undefined) {
  const headers = new Headers();
  const token = getToken();

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (body !== undefined) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(data.error || 'Request failed', res.status, data);
  }

  return res.json();
}

function articlePage(path, filters, signal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters || {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  return request('GET', `${path}?${params}`, undefined, signal);
}

function makeEntityClient(basePath) {
  return {
    list(sort, limit) {
      const p = new URLSearchParams();
      if (sort)  p.set('sort', sort);
      if (limit) p.set('limit', String(limit));
      return request('GET', `${basePath}?${p}`);
    },
    filter(filters, sort, limit) {
      const p = new URLSearchParams();
      for (const [k, v] of Object.entries(filters || {})) {
        if (v !== undefined && v !== null) p.set(k, String(v));
      }
      if (sort)  p.set('sort', sort);
      if (limit) p.set('limit', String(limit));
      return request('GET', `${basePath}?${p}`);
    },
    create(data) { return request('POST', basePath, data); },
    update(id, data) { return request('PATCH', `${basePath}/${id}`, data); },
    delete(id) { return request('DELETE', `${basePath}/${id}`); },
  };
}

export const api = {
  articles: {
    create(data) { return request('POST', '/articles', data); },
    update(id, data) { return request('PATCH', `/articles/${encodeURIComponent(id)}`, data); },
    delete(id) { return request('DELETE', `/articles/${encodeURIComponent(id)}`); },
    page(filters, signal) { return articlePage('/articles', filters, signal); },
    home(signal) { return request('GET', '/articles/home', undefined, signal); },
    get(slug, signal) { return request('GET', `/articles/${encodeURIComponent(slug)}`, undefined, signal); },
    adminPage(filters, signal) { return articlePage('/admin/articles', filters, signal); },
    adminGet(id, signal) { return request('GET', `/admin/articles/${encodeURIComponent(id)}`, undefined, signal); },
    stats(signal) { return request('GET', '/admin/articles/stats', undefined, signal); },
    tags(signal) { return request('GET', '/admin/articles/tags', undefined, signal); },
    view(id) { return request('POST', `/articles/${id}/view`); },
  },
  ticker: makeEntityClient('/ticker'),

  auth: {
    login(username, password) {
      return request('POST', '/auth/login', { username, password });
    },
    me() {
      return request('GET', '/auth/me');
    },
    logout() {
      localStorage.removeItem('auth_token');
    },
  },

  async upload(file) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = new Headers();
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error('Error al subir el archivo');
    return res.json();
  },
};
