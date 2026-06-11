const API_ROOT =
  import.meta.env.VITE_ADMIN_API_URL || "http://localhost:5050/api/v1/admin";

const SESSION_KEY = "admin_panel_session";

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

export function getStoredSession() {
  const rawValue = sessionStorage.getItem(SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setStoredSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("admin-session-updated"));
}

export function clearStoredSession() {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("admin-session-updated"));
}

export function getStoredAdmin() {
  return getStoredSession()?.user || null;
}

export function getStoredToken() {
  return getStoredSession()?.token || "";
}

async function refreshAuthSession() {
  const response = await fetch(`${API_ROOT}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    clearStoredSession();
    throw new Error(payload.message || "Session expired");
  }

  setStoredSession({
    token: payload.accessToken || payload.token,
    user: payload.user,
  });

  return payload.accessToken || payload.token;
}

export async function restoreStoredSession() {
  const token = await refreshAuthSession();
  const profile = await getAdminProfile();
  setStoredSession({
    token,
    user: profile.user,
  });
  return getStoredSession();
}

async function request(
  path,
  { method = "GET", body, auth = true, retryOnUnauthorized = true, tokenOverride = "" } = {},
) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = tokenOverride || getStoredToken();

    if (!token) {
      const refreshedToken = await refreshAuthSession();
      headers.Authorization = `Bearer ${refreshedToken}`;
    } else {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    if (auth && response.status === 401 && retryOnUnauthorized) {
      try {
        const refreshedToken = await refreshAuthSession();
        return request(path, {
          method,
          body,
          auth,
          retryOnUnauthorized: false,
          tokenOverride: refreshedToken,
        });
      } catch {
        clearStoredSession();
      }
    }

    if (auth && response.status === 401) {
      clearStoredSession();
    }

    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

export async function loginAdmin(credentials) {
  return request("/auth/login", {
    method: "POST",
    body: credentials,
    auth: false,
  });
}

export async function logoutAdmin() {
  return request("/auth/logout", {
    method: "POST",
    auth: false,
  }).finally(clearStoredSession);
}

export async function getAdminProfile() {
  return request("/auth/me");
}

export async function getDashboardData() {
  return request("/dashboard");
}

export async function getSectionData(sectionKey) {
  return request(`/sections/${sectionKey}`);
}

export async function getUsersData() {
  return request("/users");
}

export async function createAdminUser(payload) {
  return request("/users", {
    method: "POST",
    body: payload,
  });
}

export async function updateAdminUser({ source, id, payload }) {
  return request(`/users/${source}/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteAdminUser({ source, id }) {
  return request(`/users/${source}/${id}`, {
    method: "DELETE",
  });
}

export async function getRolesData() {
  return request("/roles");
}

export async function createAdminRole(payload) {
  return request("/roles", {
    method: "POST",
    body: payload,
  });
}

export async function updateRolePermissions({ id, permissions }) {
  return request(`/roles/${id}/permissions`, {
    method: "PATCH",
    body: { permissions },
  });
}

export async function assignAdminRole({ id, source, userId }) {
  return request(`/roles/${id}/assign`, {
    method: "POST",
    body: { source, userId },
  });
}

export async function getNotifications(page = 1, limit = 20) {
  return request(`/notifications?page=${page}&limit=${limit}`);
}

export async function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead() {
  return request("/notifications/read-all", {
    method: "PATCH",
  });
}
