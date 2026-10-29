import api from './api';

export const authService = {
  async register(userData) {
    const res = await api.post('/auth/register/', userData);
    const { access, refresh, user } = res.data;
    if (access) {
      localStorage.setItem('ck_access_token', access);
      localStorage.setItem('ck_refresh_token', refresh);
    }
    return user;
  },

  async login(username, password) {
    const res = await api.post('/auth/login/', { username, password });
    const { access, refresh, user } = res.data;
    localStorage.setItem('ck_access_token', access);
    localStorage.setItem('ck_refresh_token', refresh);
    return user;
  },

  async logout() {
    const refresh = localStorage.getItem('ck_refresh_token');
    try { await api.post('/auth/logout/', { refresh }); } catch (_) {}
    localStorage.removeItem('ck_access_token');
    localStorage.removeItem('ck_refresh_token');
  },

  async getMe() {
    const res = await api.get('/auth/me/');
    return res.data;
  },

  isAuthenticated() {
    return !!localStorage.getItem('ck_access_token');
  },
};
