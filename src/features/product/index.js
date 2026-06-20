export { cartApi, getUserId, normalizeCartItems } from "./api/cartApi";
export {
  FAVORITES_UPDATED_EVENT,
  favoriteApi,
  getFavoriteProductId,
  normalizeFavoriteItem,
  normalizeFavoriteItems,
} from "./api/favoriteApi";
export { productApi } from "./api/productApi";
export * from "./utils/cartStorage";
export * from "./utils/favoriteStorage";
export * from "./utils/productUtils";
