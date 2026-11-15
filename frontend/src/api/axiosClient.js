import axios from "axios";

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
  withCredentials: true, // required so accesstoken/refreshtoken cookies are sent
});

// if a request fails with 401, try refreshing the access token once, then retry it
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

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        // queue this request until the in-flight refresh finishes
        return new Promise((resolve, reject) => {
          queuedRequests.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/users/refresh-token");
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
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
