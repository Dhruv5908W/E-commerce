import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  clearAuthTokens,
} from "./tokenStorage.js";

const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  const isBrowser = typeof window !== "undefined";

  if (isBrowser && window.location.hostname.endsWith(".onrender.com")) {
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl;
    }
    const backendHost = window.location.hostname.replace("-frontend", "-backend");
    return `https://${backendHost}/api/v2`;
  }

  return envUrl || "http://localhost:5000/api/v2";
};

const api = axios.create({
  baseURL: resolveBaseUrl(), // e.g. https://urban-loom-backend.onrender.com/api/v2 or local
  withCredentials: true, // required for cookie-based authentication
});

// Attach Bearer token as Authorization header on every request (ensures 100% compatibility
// across browsers like Safari, Chrome Incognito, and Brave that block third-party cookies)
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// If a request fails with 401, refresh the access token once IF a refresh token exists
let isRefreshing = false;
let queuedRequests = [];

const processQueue = (error) => {
  queuedRequests.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()));
  queuedRequests = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const url = originalRequest.url || "";
    const isAuthRoute =
      url.includes("/login") ||
      url.includes("/register") ||
      url.includes("/refresh-token") ||
      url.includes("/forgot-password") ||
      url.includes("/reset-password");

    // Only attempt refresh if:
    // 1. Status is 401
    // 2. Request hasn't already been retried
    // 3. Not an auth endpoint itself
    // 4. We actually HAVE a refresh token (prevents guest users from triggering "Refresh token is missing")
    const refreshToken = getRefreshToken();

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute && refreshToken) {
      if (isRefreshing) {
        // queue this request until the in-flight refresh finishes
        return new Promise((resolve, reject) => {
          queuedRequests.push({ resolve, reject });
        }).then(() => {
          const newToken = getAccessToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post("/users/refresh-token", { refreshToken });
        const newAccess = data.data?.AccessToken;
        const newRefresh = data.data?.RefreshToken || refreshToken;

        if (newAccess) {
          setAuthTokens({ accessToken: newAccess, refreshToken: newRefresh });
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        }

        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        clearAuthTokens();
        processQueue(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
