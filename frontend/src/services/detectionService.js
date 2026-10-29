import api from './api';

export const detectionService = {
  async predict(datasetId, modelName) {
    return (await api.post('/detection/predict/', { dataset_id: datasetId, model_name: modelName })).data;
  },
  async history(params = {}, config = {}) {
    return (await api.get('/detection/history/', { ...config, params })).data;
  },
  async get(id) { return (await api.get(`/detection/${id}/`)).data; },
};
