import { getApiData, http } from "../../../shared/api";

export const favoriteApi = {
  /**
   * Get user's favorite list
   * @param {string} userId - User ID
   * @returns {Promise} Favorite list with items
   */
  async getFavorite(userId) {
    const response = await http.get(`/api/favorites/${userId}`);
    return getApiData(response);
  },

  /**
   * Add product to favorites
   * @param {string} userId - User ID
   * @param {string} productId - Product ID to add
   * @returns {Promise} Updated favorite list
   */
  async addItem(userId, productId) {
    const response = await http.post(`/api/favorites/${userId}/items`, {
      productId,
    });
    return getApiData(response);
  },

  /**
   * Remove product from favorites
   * @param {string} userId - User ID
   * @param {string} productId - Product ID to remove
   * @returns {Promise} Success message
   */
  async removeItem(userId, productId) {
    const response = await http.delete(
      `/api/favorites/${userId}/items/${productId}`,
    );
    return getApiData(response);
  },

  /**
   * Clear all favorites
   * @param {string} userId - User ID
   * @returns {Promise} Success message
   */
  async clearFavorite(userId) {
    const response = await http.delete(`/api/favorites/${userId}`);
    return getApiData(response);
  },
};
