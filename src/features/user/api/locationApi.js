import { getApiData, http } from "../../../shared/api";

function unwrapApiResponse(response) {
  const data = getApiData(response);
  return data?.data ?? data;
}

function normalizeLocationList(response) {
  const data = unwrapApiResponse(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.locations)) return data.locations;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

export const locationApi = {
  async getProvinces() {
    const response = await http.get("/locations/provinces");
    return normalizeLocationList(response);
  },

  async getDistricts(provinceCode) {
    if (!provinceCode) return [];

    const response = await http.get(`/locations/provinces/${provinceCode}/districts`);
    return normalizeLocationList(response);
  },

  async getWards(districtCode) {
    if (!districtCode) return [];

    const response = await http.get(`/locations/districts/${districtCode}/wards`);
    return normalizeLocationList(response);
  },
};
