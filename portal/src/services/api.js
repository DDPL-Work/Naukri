import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://naukri-6v4n.onrender.com/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const CANDIDATE_COOKIE = "mvn_refresh_token";
const STORAGE_TOKEN_KEY = "token";
const STORAGE_USER_KEY = "user";

const getStoredToken = () =>
  typeof window !== "undefined" ? localStorage.getItem(STORAGE_TOKEN_KEY) : null;

const clearStoredSession = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
  }
};

const setStoredSession = (token, user) => {
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem(STORAGE_TOKEN_KEY, token);
    if (user) localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  }
};

const candidateRefresh = async () => {
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  const res = await axios.post(
    `${baseUrl}/candidate/auth/refresh`,
    null,
    { withCredentials: true }
  );
  const token = res.data?.accessToken || res.data?.token;
  if (!token) {
    throw new Error("No access token in refresh response");
  }
  const user =
    res.data?.user ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_USER_KEY) || "{}");
      } catch {
        return {};
      }
    })();
  setStoredSession(token, res.data?.user ?? user);
  return token;
};

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest._skipAuthRefresh
    ) {
      originalRequest._retry = true;

      try {
        const newToken = await candidateRefresh();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        clearStoredSession();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("candidate-session-expired"));
        }
      }
    }

    if (error.response?.status === 401) {
      clearStoredSession();
    }

    return Promise.reject(error);
  }
);

export default api;