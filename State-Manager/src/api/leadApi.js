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
  return getStoredCrmSession()?.token || sessionStorage.getItem("token") || "";
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
  baseURL: resolveModuleApiBaseUrl("/state-manager"),
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

    if (error.response?.status === 401) {
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

export async function fetchLeadDashboard(params = {}) {
  const { data } = await http.get("/dashboard", { params });
  return data.data;
}

export async function fetchLeadMeta() {
  const { data } = await http.get("/meta");
  return data.data;
}

export async function fetchLeads(params = {}) {
  const normalizedParams = {
    page: Number(params.page) || 1,
    limit: Number(params.limit) || 10,
  };

  if (params.search?.trim()) {
    normalizedParams.search = params.search.trim();
  }

  if (params.status?.trim()) {
    normalizedParams.status = params.status.trim();
  }

  if (params.statusGroup?.trim()) {
    normalizedParams.statusGroup = params.statusGroup.trim();
  }

  if (params.businessCategory?.trim()) {
    normalizedParams.businessCategory = params.businessCategory.trim();
  }

  if (params.leadSource?.trim()) {
    normalizedParams.leadSource = params.leadSource.trim();
  }

  if (params.location?.trim()) {
    normalizedParams.location = params.location.trim();
  }

  if (params.date?.trim()) {
    normalizedParams.date = params.date.trim();
  }

  if (params.memberId?.trim()) {
    normalizedParams.memberId = params.memberId.trim();
  }

  if (params.sourceRole?.trim()) {
    normalizedParams.sourceRole = params.sourceRole.trim();
  }

  const { data } = await http.get("/leads", { params: normalizedParams });
  return data.data;
}

export async function createLead(payload) {
  const { data } = await http.post("/leads", payload);
  return data.data;
}

export async function updateLeadStatus(leadId, status) {
  const { data } = await http.patch(`/leads/${leadId}/status`, { status });
  return data.data;
}

export async function fetchFSEs() {
  const { data } = await http.get("/fses");
  return data.data;
}

export async function assignLeadToFSE(leadId, fseId) {
  const { data } = await http.patch(`/leads/${leadId}/assign`, { fseId });
  return data.data;
}

export async function logLeadActivity(leadId, activityData) {
  const { data } = await http.post(`/leads/${leadId}/activity`, activityData);
  return data.data;
}

export async function deleteLeadActivity(leadId, index) {
  const { data } = await http.delete(`/leads/${leadId}/activity/${index}`);
  return data.data;
}

export async function fetchStateManagerProfile() {
  const { data } = await http.get("/profile");
  return data.data;
}

export async function updateStateManagerProfile(payload) {
  const { data } = await http.patch("/profile", payload);
  return data.data;
}

export async function uploadStateManagerProfilePhoto(file) {
  const formData = new FormData();
  formData.append("photo", file);
  const { data } = await http.patch("/profile/photo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data.data;
}

export async function fetchManagedMembers(params = {}) {
  const normalizedParams = {
    role: String(params.role || "").trim().toUpperCase(),
    page: Number(params.page) || 1,
    limit: Number(params.limit) || 10,
  };

  if (params.search?.trim()) {
    normalizedParams.search = params.search.trim();
  }

  const { data } = await http.get("/team-members", { params: normalizedParams });
  return data.data;
}

export async function createManagedMember(payload) {
  const { data } = await http.post("/team-members", payload);
  return data;
}

export async function fetchManagedMemberDetail(memberId) {
  const { data } = await http.get(`/team-members/${memberId}`);
  return data.data;
}

export async function updateManagedMember(memberId, payload) {
  const { data } = await http.patch(`/team-members/${memberId}`, payload);
  return data.data;
}

export async function deleteManagedMember(memberId, role) {
  const normalizedRole = String(role || "").trim().toUpperCase();
  const params = normalizedRole ? { role: normalizedRole } : undefined;
  const { data } = await http.delete(`/team-members/${memberId}`, { params });
  return data;
}

export async function updateMemberTargets(memberId, targets) {
  const { data } = await http.patch(`/team-members/${memberId}/targets`, targets);
  return data.data;
}
