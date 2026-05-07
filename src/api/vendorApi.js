const jsonHeaders = { "Content-Type": "application/json" };

const readAuth = () => {
  const raw =
    localStorage.getItem("astraea_auth") ||
    sessionStorage.getItem("astraea_auth");

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
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
    throw new Error(body?.message || body?.error || text || response.statusText || "Request failed");
  }

  return body?.data ?? body;
};

export const vendorRequest = async (path, options = {}) => {
  const { token } = readAuth();
  const headers = {
    ...(options.body ? jsonHeaders : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

const basePath = "/api/vendor/procurement";

export const vendorApi = {
  rfqs: {
    list: () => vendorRequest(`${basePath}/rfqs`),
    detail: (rfqId) => vendorRequest(`${basePath}/rfqs/${rfqId}`),
    quote: (rfqId, payload) => vendorRequest(`${basePath}/rfqs/${rfqId}/quotations`, { method: "POST", body: payload }),
    bid: (rfqId, payload) => vendorRequest(`${basePath}/rfqs/${rfqId}/bids`, { method: "POST", body: payload }),
    object: (rfqId, payload) => vendorRequest(`${basePath}/rfqs/${rfqId}/objections`, { method: "POST", body: payload }),
  },
  bids: {
    list: () => vendorRequest(`${basePath}/bids`),
  },
  quotations: {
    list: () => vendorRequest(`${basePath}/quotations`),
  },
  reports: {
    list: () => vendorRequest(`${basePath}/vendor-reports`),
  },
  offers: {
    list: () => vendorRequest(`${basePath}/offer-letters`),
    respond: (offerLetterId, payload) =>
      vendorRequest(`${basePath}/offer-letters/${offerLetterId}/respond`, { method: "PATCH", body: payload }),
  },
  purchaseOrders: {
    list: () => vendorRequest(`${basePath}/purchase-orders`),
  },
};
