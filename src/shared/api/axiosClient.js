import axios from "axios";
import { tokenStorage } from "./tokenStorage";

const baseConfig = {
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
};

export const publicHttp = axios.create(baseConfig);
export const http = axios.create(baseConfig);

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
  response?.accessToken;

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

export const refreshAccessToken = async () => {
  const refreshResponse = await publicHttp.post("/auth/refresh");
  const newAccessToken = getAccessTokenFromResponse(refreshResponse);
  const user = getUserFromResponse(refreshResponse);

  if (!newAccessToken) {
    throw new Error("Refresh response did not include an access token");
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
