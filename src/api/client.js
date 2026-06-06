const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('auth_token');
}

async function request(method, endpoint, body) {
  const headers = {};
  const token = getToken();

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return res.json();
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
    ...makeEntityClient('/articles'),
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
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error('Error al subir el archivo');
    return res.json();
  },
};
