import api from './api';

export const modelService = {
  async list() { return (await api.get('/models/')).data; },
  async metrics(config = {}) { return (await api.get('/models/metrics/', config)).data; },
  async train(datasetId, modelName) {
    return (await api.post('/models/train/', { dataset_id: datasetId, model_name: modelName })).data;
  },
};

export const alertService = {
  async list(params = {}) { return (await api.get('/alerts/', { params })).data; },
  async get(id) { return (await api.get(`/alerts/${id}/`)).data; },
  async update(id, data) { return (await api.patch(`/alerts/${id}/`, data)).data; },
};

export const incidentService = {
  async list(params = {}) { return (await api.get('/incidents/', { params })).data; },
  async get(id) { return (await api.get(`/incidents/${id}/`)).data; },
  async create(data) { return (await api.post('/incidents/', data)).data; },
  async update(id, data) { return (await api.patch(`/incidents/${id}/`, data)).data; },
};

export const networkService = {
  async topology(params = {}, config = {}) { return (await api.get('/network/topology/', { ...config, params })).data; },
  async nodeDetail(id) { return (await api.get(`/network/nodes/${id}/`)).data; },
};

export const reportService = {
  async summary(params = {}) { return (await api.get('/reports/summary/', { params })).data; },
  async export(params = {}) { return (await api.get('/reports/export/', { params, responseType: 'blob' })).data; },
};

export const auditService = {
  async list(params = {}) { return (await api.get('/audit/logs/', { params })).data; },
};

export const healthService = {
  async check(config = {}) { return (await api.get('/health/', config)).data; },
};
