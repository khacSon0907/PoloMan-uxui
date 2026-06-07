import { getApiData, http } from "../../../shared/api";

function unwrapApiResponse(response) {
  const data = getApiData(response);
  return data?.data ?? data;
}

function normalizeCreateAddressPayload(payload = {}) {
  return {
    receiverName: payload.receiverName || "",
    receiverPhone: payload.receiverPhone || "",
    provinceCode: payload.provinceCode || "",
    districtCode: payload.districtCode || "",
    wardCode: payload.wardCode || "",
    provinceName: payload.provinceName || payload.province || "",
    districtName: payload.districtName || payload.district || "",
    wardName: payload.wardName || payload.ward || "",
    streetAddress: payload.streetAddress || payload.address || "",
    isDefault: Boolean(payload.isDefault),
  };
}

function normalizeAddressList(response) {
  const data = unwrapApiResponse(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.addresses)) return data.addresses;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

export const addressApi = {
  async createAddress(userId, payload) {
    const response = await http.post(
      `/addresses/user/${userId}`,
      normalizeCreateAddressPayload(payload),
    );

    return unwrapApiResponse(response);
  },

  async getAddresses(userId) {
    if (!userId) return [];

    const response = await http.get(`/addresses/user/${userId}`);
    return normalizeAddressList(response);
  },

  async getAddress(userId, addressId) {
    const response = await http.get(`/addresses/${addressId}/user/${userId}`);
    return unwrapApiResponse(response);
  },

  async updateAddress(userId, addressId, payload) {
    const response = await http.put(
      `/addresses/${addressId}/user/${userId}`,
      normalizeCreateAddressPayload(payload),
    );

    return unwrapApiResponse(response);
  },
};
