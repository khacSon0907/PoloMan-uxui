import { getApiData, http } from "../../../shared/api";

function unwrapApiResponse(response) {
  const data = getApiData(response);
  return data?.data ?? data;
}

function normalizeRoleList(response) {
  const data = unwrapApiResponse(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.roles)) return data.roles;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

export const roleApi = {
  async list() {
    const response = await http.get("/roles");
    return normalizeRoleList(response);
  },

  async getById(id) {
    const response = await http.get(`/roles/${id}`);
    return unwrapApiResponse(response);
  },

  async create(payload) {
    const response = await http.post("/roles", payload);
    return unwrapApiResponse(response);
  },

  async update(id, payload) {
    const response = await http.put(`/roles/${id}`, payload);
    return unwrapApiResponse(response);
  },
};
