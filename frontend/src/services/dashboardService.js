import api from './api';

export const dashboardService = {
  async getSummary(config = {}) { return (await api.get('/dashboard/summary/', config)).data; },
  async getActivity(days = 14, config = {}) {
    return (await api.get('/dashboard/activity/', {
      ...config,
      params: { ...config.params, days },
    })).data;
  },
  async getPredictionDistribution(config = {}) {
    return (await api.get('/dashboard/prediction-distribution/', config)).data;
  },
  async getThreatCategories(params = {}, config = {}) {
    return (await api.get('/dashboard/threat-categories/', { ...config, params })).data;
  },
  async getAlertStatistics(config = {}) {
    return (await api.get('/dashboard/alert-statistics/', config)).data;
  },
  async getRecentDetections(params = {}, config = {}) {
    return (await api.get('/dashboard/recent-detections/', { ...config, params })).data;
  },
};
