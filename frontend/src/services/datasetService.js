import api from './api';

export const datasetService = {
  async list(config = {}) { return (await api.get('/datasets/', config)).data; },
  async get(id) { return (await api.get(`/datasets/${id}/`)).data; },
  async upload(file, onProgress) {
    const fd = new FormData();
    fd.append('file', file);
    return (await api.post('/datasets/upload/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    })).data;
  },
  async delete(id) { return api.delete(`/datasets/${id}/`); },
};
