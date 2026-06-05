import axios from "axios";

const SESSION_KEY = "crm_panel_session";

export const getStoredCrmSession = () => {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const setStoredCrmSession = (session) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("crm-session-updated"));
};

export const clearStoredCrmSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("crm-session-updated"));
};

const getAuthToken = () => {
  return getStoredCrmSession()?.token || "";
};

const normalizeApiV1BaseUrl = (value = "") => {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return "";
  }

  const trimmedValue = rawValue.replace(/\/+$/, "");
  const match = trimmedValue.match(/^(.*\/api\/v1)(?:\/.*)?$/i);
  return (match ? match[1] : trimmedValue).replace(/\/+$/, "");
};

const resolveModuleApiBaseUrl = (modulePath) => {
  const configuredBaseUrl = normalizeApiV1BaseUrl(import.meta.env.VITE_API_BASE_URL);
  const fallbackBaseUrl = `http://localhost:3000/api/v1${modulePath}`;

  if (!configuredBaseUrl) {
    return fallbackBaseUrl;
  }

  const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, "");
  if (normalizedBaseUrl.toLowerCase().endsWith(modulePath.toLowerCase())) {
    return normalizedBaseUrl;
  }

  return `${normalizedBaseUrl}${modulePath}`;
};

const http = axios.create({
  baseURL: resolveModuleApiBaseUrl("/national-sales-head"),
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function refreshCrmSession() {
  const { data } = await http.post("/auth/refresh", null, { _skipAuthRefresh: true });
  const token = data.accessToken || data.token;
  setStoredCrmSession({
    token,
    user: data.user,
  });
  return token;
}

http.interceptors.response.use(
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
        const token = await refreshCrmSession();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return http(originalRequest);
      } catch {
        clearStoredCrmSession();
      }
    }

    if ([401, 403].includes(error.response?.status)) {
      clearStoredCrmSession();
    }

    return Promise.reject(error);
  },
);

export async function restoreCrmSession() {
  const token = await refreshCrmSession();
  return {
    ...getStoredCrmSession(),
    token,
  };
}

export async function loginNSH(credentials) {
  const { data } = await http.post("/auth/login", credentials);
  return data;
}

export async function fetchNSHDashboard() {
  const { data } = await http.get("/dashboard");
  return data.data;
}

export async function fetchZoneStats() {
  const { data } = await http.get("/zones");
  return data.data;
}

export async function fetchZonalManagers() {
  const { data } = await http.get("/zonal-managers");
  return data.data;
}

export async function createZonalManager(payload) {
  const { data } = await http.post("/zonal-managers", payload);
  return data;
}

export async function deleteZonalManager(zonalManagerId) {
  const { data } = await http.delete(`/zonal-managers/${zonalManagerId}`);
  return data;
}

export async function fetchStateManagersOverview(params = {}) {
  const { data } = await http.get("/state-managers/overview", { params });
  return data.data;
}

export async function fetchAllLeads(params = {}) {
  const { data } = await http.get("/leads", { params });
  return data;
}

export async function fetchStatePerformance(params = {}) {
  const { data } = await http.get("/performance/states", { params });
  return data.data;
}

export async function fetchIndividualPerformance(params = {}) {
  const { data } = await http.get("/performance/individual", { params });
  return data.data;
}

export async function fetchPendingApprovals(params = {}) {
  const { data } = await http.get("/approvals/pending", { params });
  return data.data;
}

export async function reviewLeadApproval(leadId, payload) {
  const { data } = await http.post(`/approvals/${leadId}/decision`, payload);
  return data;
}

export async function fetchApprovalPolicy() {
  const { data } = await http.get("/approval-policy");
  return data.data;
}

export async function updateApprovalPolicy(payload) {
  const { data } = await http.put("/approval-policy", payload);
  return data;
}

export async function fetchProfile() {
  const { data } = await http.get("/profile");
  return data.data;
}
