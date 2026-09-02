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
const catalogPath = "/api/vendor/catalog";
const profilePath = "/api/vendor/profile";

export const vendorApi = {
  profile: {
    get: () => vendorRequest(profilePath),
    resubmit: (payload) => vendorRequest(`${profilePath}/resubmit`, { method: "PATCH", body: payload }),
    quotationDocuments: () => vendorRequest(`${profilePath}/quotation-documents`),
    saveQuotationDocuments: (quotationDocuments) =>
      vendorRequest(`${profilePath}/quotation-documents`, { method: "PATCH", body: { quotationDocuments } }),
  },
  catalog: {
    list: () => vendorRequest(catalogPath),
    create: (payload) => vendorRequest(catalogPath, { method: "POST", body: payload }),
    update: (catalogItemId, payload) => vendorRequest(`${catalogPath}/${catalogItemId}`, { method: "PUT", body: payload }),
    deactivate: (catalogItemId) => vendorRequest(`${catalogPath}/${catalogItemId}`, { method: "DELETE" }),
  },
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
    listPage: (page = 0, size = 10) => vendorRequest(`${basePath}/quotations/paged?page=${page}&size=${size}`),
    submitRequestedDocument: (quotationId, payload) =>
      vendorRequest(`${basePath}/quotations/${quotationId}/requested-document`, { method: "PATCH", body: payload }),
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
    detail: (poId) => vendorRequest(`${basePath}/purchase-orders/${poId}`),
  },
};
