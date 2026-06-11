import axios from "axios";

const SESSION_KEY = "crm_panel_session";
const ACCESS_COOKIE_NAME = "mvn_access_token";

const setAccessTokenCookie = (token) => {
  if (typeof document !== "undefined") {
    const expires = new Date();
    expires.setTime(expires.getTime() + 15 * 60 * 1000);
    document.cookie = `${ACCESS_COOKIE_NAME}=${encodeURIComponent(token)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  }
};

const getAccessTokenCookie = () => {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${ACCESS_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
};

const clearAccessTokenCookie = () => {
  if (typeof document !== "undefined") {
    document.cookie = `${ACCESS_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
  }
};

export const getStoredCrmSession = () => {
  const cookieToken = getAccessTokenCookie();
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw && !cookieToken) {
    return null;
  }

  try {
    const parsed = raw ? JSON.parse(raw) : {};
    const token = cookieToken || parsed.token || "";
    if (!token) return null;
    return { ...parsed, token };
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    const fallbackToken = getAccessTokenCookie();
    return fallbackToken ? { token: fallbackToken } : null;
  }
};

export const setStoredCrmSession = (session) => {
  const token = session?.token || "";
  if (token) {
    setAccessTokenCookie(token);
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("crm-session-updated"));
};

export const clearStoredCrmSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
  clearAccessTokenCookie();
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

const resolveApiV1BaseUrl = () => {
  const configuredBaseUrl = normalizeApiV1BaseUrl(import.meta.env.VITE_API_BASE_URL);
  return configuredBaseUrl || "http://localhost:3000/api/v1";
};

const API_V1_BASE_URL = resolveApiV1BaseUrl();

const http = axios.create({
  baseURL: resolveModuleApiBaseUrl("/fse"),
  withCredentials: true,
});

const crmHttp = axios.create({
  baseURL: `${API_V1_BASE_URL}/crm-panel`,
  withCredentials: true,
});

const coreHttp = axios.create({
  baseURL: API_V1_BASE_URL,
  withCredentials: true,
});

const attachAuthHeader = (config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

http.interceptors.request.use(attachAuthHeader);
crmHttp.interceptors.request.use(attachAuthHeader);
coreHttp.interceptors.request.use(attachAuthHeader);

async function refreshCrmSession() {
  const { data } = await http.post("/auth/refresh", null, { _skipAuthRefresh: true });
  const token = data.accessToken || data.token;
  setStoredCrmSession({
    token,
    user: data.user,
  });
  return token;
}

const attachRefreshRetry = (client) => {
  client.interceptors.response.use(
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
          return client(originalRequest);
        } catch {
          clearStoredCrmSession();
        }
      }

      if (error.response?.status === 401) {
        clearStoredCrmSession();
      }

      return Promise.reject(error);
    },
  );
};

attachRefreshRetry(http);
attachRefreshRetry(crmHttp);
attachRefreshRetry(coreHttp);

export async function restoreCrmSession() {
  const token = await refreshCrmSession();
  return {
    ...getStoredCrmSession(),
    token,
  };
}

export async function loginFSE(payload) {
  const { data } = await http.post("/auth/login", payload);
  return data;
}

export async function signupFSE(payload) {
  const { data } = await http.post("/auth/signup", payload);
  return data;
}

export async function fetchFseSignupMeta(zone = "") {
  const params = zone ? { zone } : {};
  const { data } = await http.get("/auth/meta", { params });
  return data.data;
}

export async function changeFsePassword(payload) {
  const { data } = await http.patch("/auth/change-password", payload);
  return data;
}

export async function fetchFseDashboard(params = {}) {
  const { data } = await http.get("/dashboard", { params });
  return data.data;
}

export async function fetchFseMeta() {
  const { data } = await http.get("/meta");
  return data.data;
}

export async function createFseLead(payload) {
  const { data } = await http.post("/leads", payload);
  return data.data;
}

export async function updateFseLead(leadId, payload) {
  const { data } = await http.patch(`/leads/${leadId}`, payload);
  return data.data;
}

export const transferFseLeadToStateManager = async (leadId, tnc) => {
  const { data } = await http.patch(`/leads/${leadId}/transfer-to-sm`, { tnc });
  return data.data;
};

export const fetchFseLeads = async (params = {}) => {
  const { data } = await http.get("/leads", { params });
  return data.data;
};

export const fetchTransferCandidate = async (leadId) => {
  const { data } = await http.get(`/transfer-candidate/${leadId}`);
  return data.data;
};

export async function updateFseLeadStatus(leadId, status) {
  const { data } = await http.patch(`/leads/${leadId}/status`, { status });
  return data.data;
}

export async function updateFseLeadProjection(leadId, projection) {
  const { data } = await http.patch(`/leads/${leadId}/projection`, { projection });
  return data.data;
}

export async function logFseLeadActivity(leadId, payload) {
  const { data } = await http.post(`/leads/${leadId}/activity`, payload);
  return data.data;
}

export async function deleteFseLeadActivity(leadId, index) {
  const { data } = await http.delete(`/leads/${leadId}/activity/${index}`);
  return data.data;
}

export async function fetchFseNonVisitDays() {
  const { data } = await http.get("/non-visit-days");
  return data.data;
}

export async function addFseNonVisitDay(payload) {
  const { data } = await http.post("/non-visit-days", payload);
  return data.data;
}

export async function deleteFseNonVisitDay(id) {
  const { data } = await http.delete(`/non-visit-days/${id}`);
  return data.data;
}

export async function fetchFseProfile() {
  const { data } = await http.get("/profile");
  return data.data;
}

export async function updateFseProfile(payload) {
  const { data } = await http.patch("/profile", payload);
  return data.data;
}

export async function uploadFseProfilePhoto(file) {
  const formData = new FormData();
  formData.append("photo", file);
  const { data } = await http.patch("/profile/photo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data.data;
}

export async function fetchFseClientAccounts() {
  const { data } = await crmHttp.get("/clients");
  return data.data;
}

export async function fetchFsePackages() {
  const { data } = await crmHttp.get("/packages");
  return data.data;
}

export async function createFseClientAccount(payload) {
  const { data } = await crmHttp.post("/clients", payload);
  return data;
}

export async function updateFseClientAccount(id, payload) {
  const { data } = await crmHttp.put(`/clients/${id}`, payload);
  return data.data;
}

export async function updateFseClientAccountCredentials(id, payload) {
  const { data } = await crmHttp.patch(`/clients/${id}/credentials`, payload);
  return data.data;
}

export async function fetchFseQRCodes() {
  const { data } = await crmHttp.get("/qr-codes");
  return data.data;
}

export async function shareFseQRCode(id, payload) {
  const { data } = await crmHttp.patch(`/qr-codes/${id}/share`, payload);
  return data.data;
}

export async function generateFseManagedQRCode(payload) {
  const { data } = await coreHttp.post("/qr/generate", payload);
  return data;
}

export function getFseQrPdfDownloadUrl(token) {
  return `${API_V1_BASE_URL}/qr/download/${token}`;
}
