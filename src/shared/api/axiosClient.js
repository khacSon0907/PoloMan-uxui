import axios from "axios";
import { tokenStorage } from "./tokenStorage";

const baseConfig = {
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
};

export const publicHttp = axios.create({
  ...baseConfig,
  withCredentials: true,
});
export const http = axios.create({
  ...baseConfig,
  withCredentials: false,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });

  failedQueue = [];
};

export const getApiData = (response) => response?.data ?? response;

export const getApiMessage = (error, fallbackMessage = "Request failed") =>
  error?.response?.data?.message ||
  error?.data?.message ||
  error?.message ||
  fallbackMessage;

const getAccessTokenFromResponse = (response) =>
  response?.data?.data?.accessToken ||
  response?.data?.accessToken ||
  response?.data?.token ||
  response?.data?.data?.token ||
  response?.data?.data?.access_token ||
  response?.data?.access_token ||
  response?.data?.data?.jwt ||
  response?.data?.jwt ||
  response?.data?.data?.jwtToken ||
  response?.data?.jwtToken ||
  response?.data?.data?.access ||
  response?.data?.access ||
  response?.data?.data?.authToken ||
  response?.data?.authToken ||
  response?.data?.data?.bearerToken ||
  response?.data?.bearerToken ||
  response?.accessToken ||
  response?.token ||
  response?.access_token ||
  response?.jwt ||
  response?.jwtToken ||
  response?.access ||
  response?.authToken ||
  response?.bearerToken;

const getUserFromResponse = (response) =>
  response?.data?.data?.user ||
  response?.data?.data?.account ||
  response?.data?.data?.profile ||
  response?.data?.user ||
  response?.data?.account ||
  response?.data?.profile ||
  response?.user ||
  response?.account ||
  response?.profile;

const sameUser = (firstUser, secondUser) => {
  const firstId = String(firstUser?.id || firstUser?.userId || "").toLowerCase();
  const secondId = String(secondUser?.id || secondUser?.userId || "").toLowerCase();

  if (firstId && secondId) return firstId === secondId;

  const firstEmail = String(firstUser?.email || "").toLowerCase();
  const secondEmail = String(secondUser?.email || "").toLowerCase();

  if (firstEmail && secondEmail) return firstEmail === secondEmail;

  return true;
};

const getMeWithToken = async (accessToken) => {
  const response = await publicHttp.get("/users/me", {
    withCredentials: false,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return getApiData(response);
};

export const refreshAccessToken = async () => {
  const previousUser = tokenStorage.getUser();
  const refreshResponse = await publicHttp.post("/auth/refresh");
  const newAccessToken = getAccessTokenFromResponse(refreshResponse);
  let user = getUserFromResponse(refreshResponse);

  if (!newAccessToken) {
    throw new Error("Refresh response did not include an access token");
  }

  if (!user?.providerType) {
    user = await getMeWithToken(newAccessToken).catch(() => user);
  }

  if (previousUser && user && !sameUser(previousUser, user)) {
    tokenStorage.clearAccessToken();
    throw new Error("Refresh token belongs to a different user");
  }

  tokenStorage.setAccessToken(newAccessToken, user);
  return newAccessToken;
};

http.interceptors.request.use(
  (config) => {
    const accessToken = tokenStorage.getAccessToken();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

const unwrapResponse = (response) => response.data;

publicHttp.interceptors.response.use(unwrapResponse);

http.interceptors.response.use(
  (response) => response.data,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return http(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await refreshAccessToken();

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);

        return http(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        tokenStorage.clearAccessToken();

        window.location.href = "/login";

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default http;
