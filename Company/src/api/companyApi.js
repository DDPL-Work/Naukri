import axios from "axios";

const SESSION_KEY = "company_panel_session";

const normalizeApiV1BaseUrl = (value = "") => {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return "";
  }

  const trimmedValue = rawValue.replace(/\/+$/, "");
  const match = trimmedValue.match(/^(.*\/api\/v1)(?:\/.*)?$/i);
  return (match ? match[1] : trimmedValue).replace(/\/+$/, "");
};

const resolveApiV1BaseUrl = () => {
  const configuredBaseUrl = normalizeApiV1BaseUrl(import.meta.env.VITE_API_BASE_URL);
  return configuredBaseUrl || "http://localhost:3000/api/v1";
};

const API_V1_BASE_URL = resolveApiV1BaseUrl();

export const getStoredCompanySession = () => {
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

export const setStoredCompanySession = (session) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("company-session-updated"));
};

export const clearStoredCompanySession = () => {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("company-session-updated"));
};

const getAuthToken = () => getStoredCompanySession()?.token || "";

const http = axios.create({
  baseURL: `${API_V1_BASE_URL}/company-panel`,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function refreshCompanySession() {
  const { data } = await http.post("/auth/refresh", null, { _skipAuthRefresh: true });
  const token = data.accessToken || data.token;

  setStoredCompanySession({
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
        const token = await refreshCompanySession();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return http(originalRequest);
      } catch {
        clearStoredCompanySession();
      }
    }

    if ([401, 403].includes(error.response?.status)) {
      clearStoredCompanySession();
    }

    return Promise.reject(error);
  },
);

export async function restoreCompanySession() {
  const token = await refreshCompanySession();
  return {
    ...getStoredCompanySession(),
    token,
  };
}

export async function loginCompany(payload) {
  const { data } = await http.post("/auth/login", payload);
  return data;
}

export async function logoutCompany() {
  try {
    await http.post("/auth/logout");
  } finally {
    clearStoredCompanySession();
  }
}

export async function fetchCompanyDashboard() {
  const { data } = await http.get("/dashboard");
  return data.data;
}

export async function fetchCompanyApplications(params = {}) {
  const { data } = await http.get("/applications", { params });
  return data.data;
}

export async function fetchCompanyPackageChangeRequests(params = {}) {
  const { data } = await http.get("/package-change-requests", { params });
  return data.data;
}

export async function createCompanyPackageChangeRequest(payload) {
  const { data } = await http.post("/package-change-requests", payload);
  return data;
}

export async function updateCompanyApplicationStatus(applicationId, status) {
  const { data } = await http.patch(`/applications/${applicationId}/status`, { status });
  return data;
}

export async function createCompanyJob(payload) {
  const { data } = await http.post("/jobs", payload);
  return data;
}

export async function fetchCompanyProfile() {
  const { data } = await http.get("/profile");
  return data.data;
}

export async function updateCompanyProfile(payload) {
  const { data } = await http.patch("/profile", payload);
  return data;
}

export async function previewCompanyApplicationResume(applicationId) {
  const { data } = await http.get(`/applications/${applicationId}/resume/preview`, {
    responseType: "blob",
  });
  return data;
}
