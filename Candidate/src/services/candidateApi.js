const API_ROOT =
  import.meta.env.VITE_CANDIDATE_API_URL || "http://localhost:3000/api/v1/candidate";
const USER_KEY = "candidate_user_data";

const parseJsonSafely = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

export function getStoredUser() {
  const rawValue = sessionStorage.getItem(USER_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    sessionStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setStoredUser(data) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("candidate-session-updated"));
}

export function clearStoredUser() {
  sessionStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("candidate-session-updated"));
}

const isFormDataPayload = (value) => 
  value instanceof FormData || 
  (Boolean(value) && typeof value === 'object' && typeof value.append === 'function');

async function refreshAuthSession() {
  const response = await fetch(`${API_ROOT}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(payload.message || "Session expired");
  }

  return payload.accessToken || payload.token;
}

export async function restoreStoredSession() {
  await refreshAuthSession();
  return getCandidateMe();
}

async function request(
  path,
  { method = "GET", body, auth = true, retryOnUnauthorized = true } = {},
) {
  const headers = {};
  const isFormData = isFormDataPayload(body);

  if (body && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers,
    credentials: "include",
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    if (auth && response.status === 401 && retryOnUnauthorized) {
      try {
        await refreshAuthSession();
        return request(path, {
          method,
          body,
          auth,
          retryOnUnauthorized: false,
        });
      } catch {
        clearStoredUser();
      }
    }

    if (auth && response.status === 401) {
      clearStoredUser();
    }

    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

export async function registerCandidate(payload) {
  const response = await fetch(`${API_ROOT}/auth/register`, {
    method: "POST",
    credentials: "include",
    body: payload,
  });

  const parsed = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(parsed.message || "Registration failed");
  }

  return parsed;
}

export function loginCandidate(payload) {
  return request("/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function logoutCandidate() {
  return request("/auth/logout", {
    method: "POST",
    auth: false,
  }).finally(clearStoredUser);
}

export function getCandidateMe() {
  return request("/auth/me");
}

export function getLandingData(token) {
  return request(`/landing/${token}`, { auth: false });
}

export function getDashboardData() {
  return request("/dashboard");
}

export function getJobs({ token = "", search = "" } = {}) {
  const params = new URLSearchParams();

  if (token) {
    params.set("token", token);
  }

  if (search) {
    params.set("search", search);
  }

  const query = params.toString();
  return request(`/jobs${query ? `?${query}` : ""}`);
}

export function getJobDetail(id) {
  return request(`/jobs/${id}`);
}

export function getSimilarJobs(id) {
  return request(`/jobs/${id}/similar`);
}

export function getApplications() {
  return request("/applications");
}

export function createApplication(payload) {
  return request("/applications", {
    method: "POST",
    body: payload,
  });
}

export function getProfile() {
  return request("/profile");
}

export function updateProfile(payload) {
  return request("/profile", {
    method: "PATCH",
    body: payload,
  });
}

export function getProfileHistory() {
  return request("/profile/history");
}

export function uploadResume(file) {
  const formData = new FormData();
  formData.append("resume", file);

  return request("/profile/resume", {
    method: "POST",
    body: formData,
  });
}

export function getNotifications() {
  return request("/notifications");
}

export function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export function getSavedJobs() {
  return request("/jobs/saved");
}

export function toggleSavedJob(jobId, save = true) {
  return request(`/jobs/${jobId}/save`, {
    method: "PATCH",
    body: JSON.stringify({ save }),
  });
}
