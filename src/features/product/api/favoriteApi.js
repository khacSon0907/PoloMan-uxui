import { getApiData, http } from "../../../shared/api";

export const FAVORITES_UPDATED_EVENT = "poloman-favorites-updated";

function notifyFavoritesUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FAVORITES_UPDATED_EVENT));
  }
}

function getFavoriteResponseItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.favoriteItems)) return data.favoriteItems;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data?.items)) return data.data.items;

  return [];
}

export function getFavoriteProductId(item) {
  return (
    item?.productId ||
    item?.product?.id ||
    item?.product?._id ||
    item?.id ||
    item?._id ||
    ""
  );
}

export function normalizeFavoriteItem(item) {
  const product = item?.product || item;
  const productId = getFavoriteProductId(item);

  return {
    ...item,
    product,
    favoriteItemId: item?.favoriteItemId || item?.id || item?._id || "",
    productId,
    slug: product?.slug || item?.slug || productId,
    name: product?.name || item?.productName || item?.name || productId || "San pham",
    productName: item?.productName || product?.name || item?.name || productId || "San pham",
    price: product?.salePrice || product?.price || item?.price || item?.unitPrice || 0,
    productImage:
      item?.productImage ||
      product?.imageUrl ||
      product?.image ||
      product?.thumbnail ||
      item?.image ||
      "",
    image:
      item?.productImage ||
      product?.imageUrl ||
      product?.image ||
      product?.thumbnail ||
      item?.image ||
      "",
  };
}

export function normalizeFavoriteItems(data) {
  return getFavoriteResponseItems(data).map(normalizeFavoriteItem).filter((item) => item.productId);
}

export const favoriteApi = {
  async getFavorite(userId) {
    if (!userId) return [];

    const response = await http.get(`/favorites/${userId}`);
    return normalizeFavoriteItems(getApiData(response));
  },

  async addItem(userId, productId) {
    const response = await http.post(`/favorites/${userId}/items`, {
      productId,
    });
    notifyFavoritesUpdated();
    return normalizeFavoriteItems(getApiData(response));
  },

  async removeItem(userId, productId) {
    const response = await http.delete(`/favorites/${userId}/items/${productId}`);
    notifyFavoritesUpdated();
    return getApiData(response);
  },

  async clearFavorite(userId) {
    const response = await http.delete(`/favorites/${userId}`);
    notifyFavoritesUpdated();
    return getApiData(response);
  },
};
