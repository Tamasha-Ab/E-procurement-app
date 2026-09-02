const jsonHeaders = { "Content-Type": "application/json" };

const readAuth = () => {
  localStorage.removeItem("astraea_auth");
  const raw = sessionStorage.getItem("astraea_auth");

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const getAdminId = () => {
  const { user } = readAuth();
  return user?.userId || user?.id || user?.adminId || "";
};

const unwrap = async (response) => {
  const text = await response.text().catch(() => "");
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const fieldErrors = body?.errors && typeof body.errors === "object"
      ? Object.values(body.errors).filter(Boolean).join(", ")
      : "";
    throw new Error(fieldErrors || body?.message || body?.error || text || response.statusText || "Request failed");
  }

  return body?.data ?? body;
};

export const adminRequest = async (path, options = {}) => {
  const { token } = readAuth();
  const headers = {
    ...(options.body ? jsonHeaders : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(getAdminId() ? { "Admin-User-Id": String(getAdminId()) } : {}),
    ...options.headers,
  };

  return unwrap(
    await fetch(path, {
      ...options,
      headers,
      body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
    })
  );
};

export const toPage = (payload) => {
  if (Array.isArray(payload)) {
    return {
      content: payload,
      number: 0,
      totalPages: 1,
      totalElements: payload.length,
      size: payload.length,
    };
  }

  return {
    content: payload?.content || [],
    number: payload?.number || 0,
    totalPages: payload?.totalPages || 1,
    totalElements: payload?.totalElements || payload?.content?.length || 0,
    size: payload?.size || 10,
  };
};

export const adminApi = {
  users: {
    list: (params = {}) => adminRequest(`/api/admin/users?${new URLSearchParams(params)}`).then(toPage),
    pending: () => adminRequest("/api/admin/users/pending?size=5").then(toPage),
    statistics: () => adminRequest("/api/admin/users/statistics"),
    create: (payload) => adminRequest("/api/admin/users", { method: "POST", body: payload }),
    update: (id, payload) => adminRequest(`/api/admin/users/${id}`, { method: "PUT", body: payload }),
    approve: (id, payload) => adminRequest(`/api/admin/users/${id}/approve`, { method: "POST", body: payload }),
    toggle: (id) => adminRequest(`/api/admin/users/${id}/toggle-status`, { method: "PATCH" }),
    remove: (id) => adminRequest(`/api/admin/users/${id}`, { method: "DELETE" }),
  },
  faculties: {
    list: (params = {}) => adminRequest(`/api/admin/faculties?${new URLSearchParams(params)}`).then(toPage),
    all: () => adminRequest("/api/admin/faculties/all"),
    create: (payload) => adminRequest("/api/admin/faculties", { method: "POST", body: payload }),
    update: (id, payload) => adminRequest(`/api/admin/faculties/${id}`, { method: "PUT", body: payload }),
    toggle: (id) => adminRequest(`/api/admin/faculties/${id}/toggle-status`, { method: "PATCH" }),
  },
  departments: {
    list: (params = {}) => adminRequest(`/api/admin/departments?${new URLSearchParams(params)}`).then(toPage),
    all: () => adminRequest("/api/admin/departments/all"),
    create: (payload) => adminRequest("/api/admin/departments", { method: "POST", body: payload }),
    update: (id, payload) => adminRequest(`/api/admin/departments/${id}`, { method: "PUT", body: payload }),
    toggle: (id) => adminRequest(`/api/admin/departments/${id}/toggle-status`, { method: "PATCH" }),
  },
  divisions: {
    list: () => adminRequest("/api/divisions/all").then(toPage),
    all: () => adminRequest("/api/divisions/all"),
    create: (payload) => adminRequest("/api/divisions", { method: "POST", body: payload }),
    update: (id, payload) => adminRequest(`/api/divisions/${id}`, { method: "PUT", body: payload }),
    toggle: (division) => adminRequest(`/api/divisions/${division.divisionId || division.id}`, {
      method: "PUT",
      body: {
        facultyId: division.facultyId || null,
        divisionName: division.divisionName,
        description: division.description,
        active: !division.active,
      },
    }),
  },
};
