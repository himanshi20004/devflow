const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const register = (form) => request('/api/auth/register', { method: 'POST', body: form });
export const login = (form) => request('/api/auth/login', { method: 'POST', body: form });

export const getProjects = (token) => request('/api/projects', { token });
export const addProject = (token, body) =>
  request('/api/projects', { method: 'POST', body, token });
export const updateProject = (token, id, body) =>
  request(`/api/projects/${id}`, { method: 'PUT', body, token });
export const deleteProject = (token, id) =>
  request(`/api/projects/${id}`, { method: 'DELETE', token });
