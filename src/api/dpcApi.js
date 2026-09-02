import { apiRequest } from "../services/apiClient";

export const dpcApi = {
  audit: {
    list: (token, params = {}) => apiRequest(`/api/dpc/vendors/audit-trail?${new URLSearchParams(params)}`, { token }),
  },
  vendors: {
    list: (token, params = {}) => apiRequest(`/api/dpc/vendors?${new URLSearchParams(params)}`, { token }),
    approve: (token, userId, body) => apiRequest(`/api/dpc/vendors/${userId}/approve`, { token, method: "PATCH", body }),
    reject: (token, userId, body) => apiRequest(`/api/dpc/vendors/${userId}/reject`, { token, method: "PATCH", body }),
    blacklist: (token, userId, body) => apiRequest(`/api/dpc/vendors/${userId}/blacklist`, { token, method: "PATCH", body }),
    pending: (token, userId, body) => apiRequest(`/api/dpc/vendors/${userId}/pending`, { token, method: "PATCH", body }),
  },
};
