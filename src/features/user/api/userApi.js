import { getApiData, http } from "../../../shared/api";

function unwrapApiResponse(response) {
  const data = getApiData(response);
  return data?.data ?? data;
}

function normalizeUserList(response) {
  const data = unwrapApiResponse(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.accounts)) return data.accounts;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

export const userApi = {
  async getMe() {
    const response = await http.get("/users/me");
    return unwrapApiResponse(response);
  },

  async updateMe(payload) {
    const response = await http.put("/users/me/update", payload);
    return unwrapApiResponse(response);
  },

  async getAll() {
    const response = await http.get("/users/all");
    return normalizeUserList(response);
  },
};
