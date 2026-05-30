import { getApiData, http } from "../../../shared/api";

export const userApi = {
  async getAll() {
    const response = await http.get("/users");
    return getApiData(response) || [];
  },
};
