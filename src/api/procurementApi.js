import { apiRequest } from "../services/apiClient";

const procurementBase = "/api/procurement";
const vendorBase = "/api/vendor/procurement";
const tenderBase = "/api/tenders";
const vendorCatalogBase = "/api/vendor/catalog";

export const procurementApi = {
  tenders: {
    list: (token) => apiRequest(tenderBase, { token }),
    detail: (token, tenderId) => apiRequest(`${tenderBase}/${tenderId}`, { token }),
    create: (token, payload) => apiRequest(tenderBase, { token, method: "POST", body: payload }),
    budgetCheck: (token, tenderId) => apiRequest(`${tenderBase}/${tenderId}/budget-check`, { token }),
  },
  requisitions: {
    ready: (token) => apiRequest(`${procurementBase}/ready-requisitions`, { token }),
  },
  rfqs: {
    list: (token) => apiRequest(`${procurementBase}/rfqs?page=0&size=20`, { token }),
    readyForSpecifications: (token) => apiRequest(`${procurementBase}/rfqs/ready-for-specifications`, { token }),
    publishedForTec: (token) => apiRequest(`${procurementBase}/tec/published-rfqs`, { token }),
    publishedForBec: (token) => apiRequest(`${procurementBase}/bec/published-rfqs`, { token }),
    detail: (token, rfqId) => apiRequest(`${procurementBase}/rfqs/${rfqId}`, { token }),
    create: (token, payload) => apiRequest(`${procurementBase}/rfqs`, { token, method: "POST", body: payload }),
    inviteVendors: (token, rfqId, payload) =>
      apiRequest(`${procurementBase}/rfqs/${rfqId}/invite-vendors`, { token, method: "POST", body: payload }),
    invitations: (token, rfqId) => apiRequest(`${procurementBase}/rfqs/${rfqId}/invitations`, { token }),
    bids: (token, rfqId) => apiRequest(`${procurementBase}/rfqs/${rfqId}/bids`, { token }),
    quotations: (token, rfqId) => apiRequest(`${procurementBase}/rfqs/${rfqId}/quotations`, { token }),
    objections: (token, rfqId) => apiRequest(`${procurementBase}/rfqs/${rfqId}/objections`, { token }),
    reports: (token, rfqId) => apiRequest(`${procurementBase}/rfqs/${rfqId}/vendor-reports`, { token }),
    recommend: (token, rfqId, bidId) =>
      apiRequest(`${procurementBase}/rfqs/${rfqId}/recommend/${bidId}`, { token, method: "POST" }),
  },
  specifications: {
    create: (token, rfqId, payload) =>
      apiRequest(`${procurementBase}/rfqs/${rfqId}/specifications`, { token, method: "POST", body: payload }),
    list: (token, rfqId) => apiRequest(`${procurementBase}/rfqs/${rfqId}/specifications`, { token }),
  },
  meetings: {
    schedule: (token, rfqId, payload) =>
      apiRequest(`${procurementBase}/rfqs/${rfqId}/pre-bid-meeting`, { token, method: "POST", body: payload }),
    get: (token, rfqId) => apiRequest(`${procurementBase}/rfqs/${rfqId}/pre-bid-meeting`, { token }),
    complete: (token, meetingId, payload) =>
      apiRequest(`${procurementBase}/pre-bid-meetings/${meetingId}/complete`, { token, method: "PATCH", body: payload }),
  },
  bids: {
    evaluate: (token, bidId, payload) =>
      apiRequest(`${procurementBase}/bids/${bidId}/evaluate`, { token, method: "PATCH", body: payload }),
  },
  quotations: {
    aiReview: (token, quotationId) =>
      apiRequest(`${procurementBase}/quotations/${quotationId}/ai-review`, { token, method: "POST" }),
    evaluate: (token, quotationId, payload) =>
      apiRequest(`${procurementBase}/quotations/${quotationId}/technical-evaluation`, { token, method: "PATCH", body: payload }),
    evaluateItem: (token, quotationItemId, payload) =>
      apiRequest(`${procurementBase}/quotation-items/${quotationItemId}/technical-evaluation`, { token, method: "PATCH", body: payload }),
    assignToBec: (token, quotationItemId, payload) =>
      apiRequest(`${procurementBase}/quotation-items/${quotationItemId}/bec-assignment`, { token, method: "PATCH", body: payload }),
    reviewAssignedBecItem: (token, quotationItemId, payload) =>
      apiRequest(`${procurementBase}/quotation-items/${quotationItemId}/bec-review`, { token, method: "PATCH", body: payload }),
    myAssignedBecQuotations: (token) =>
      apiRequest(`${procurementBase}/bec/my-assigned-quotations`, { token }),
    selectItemVendor: (token, quotationItemId, payload) =>
      apiRequest(`${procurementBase}/quotation-items/${quotationItemId}/vendor-selection`, { token, method: "PATCH", body: payload }),
    requestDocument: (token, quotationId, payload) =>
      apiRequest(`${procurementBase}/quotations/${quotationId}/document-request`, { token, method: "PATCH", body: payload }),
    acceptDocument: (token, quotationId) =>
      apiRequest(`${procurementBase}/quotations/${quotationId}/document-review/accept`, { token, method: "PATCH" }),
  },
  objections: {
    resolve: (token, objectionId, payload) =>
      apiRequest(`${procurementBase}/objections/${objectionId}/resolve`, { token, method: "PATCH", body: payload }),
  },
  offers: {
    create: (token, rfqId, payload) =>
      apiRequest(`${procurementBase}/rfqs/${rfqId}/offer-letters`, { token, method: "POST", body: payload }),
    pendingAuthority: (token) => apiRequest(`${procurementBase}/offer-letters/pending-authority`, { token }),
    decideAuthority: (token, offerLetterId, payload) =>
      apiRequest(`${procurementBase}/offer-letters/${offerLetterId}/authority-decision`, { token, method: "PATCH", body: payload }),
    selectedVendors: (token) => apiRequest(`${procurementBase}/offer-letters/selected-vendors`, { token }),
    sendToVendor: (token, offerLetterId, payload = null) =>
      apiRequest(`${procurementBase}/offer-letters/${offerLetterId}/send-to-vendor`, { token, method: "PATCH", ...(payload ? { body: payload } : {}) }),
  },
  purchaseOrders: {
    acceptedOffers: (token) => apiRequest(`${procurementBase}/accepted-offer-letters`, { token }),
    list: (token) => apiRequest(`${procurementBase}/purchase-orders`, { token }),
    create: (token, payload) =>
      apiRequest(`${procurementBase}/purchase-orders`, { token, method: "POST", body: payload }),
    updateStatus: (token, poId, payload) =>
      apiRequest(`${procurementBase}/purchase-orders/${poId}/status`, { token, method: "PATCH", body: payload }),
  },
  vendors: {
    categories: (token) => apiRequest(`${procurementBase}/vendor-categories`, { token }),
    search: (token, search = "", category = "") =>
      apiRequest(
        `${procurementBase}/vendors?${new URLSearchParams({
          ...(search ? { search } : {}),
          ...(category ? { category } : {}),
        })}`,
        { token }
      ),
  },
};

export const vendorProcurementApi = {
  catalog: {
    list: (token) => apiRequest(vendorCatalogBase, { token }),
    create: (token, payload) => apiRequest(vendorCatalogBase, { token, method: "POST", body: payload }),
    update: (token, catalogItemId, payload) =>
      apiRequest(`${vendorCatalogBase}/${catalogItemId}`, { token, method: "PUT", body: payload }),
    deactivate: (token, catalogItemId) =>
      apiRequest(`${vendorCatalogBase}/${catalogItemId}`, { token, method: "DELETE" }),
  },
  rfqs: {
    list: (token) => apiRequest(`${vendorBase}/rfqs`, { token }),
    detail: (token, rfqId) => apiRequest(`${vendorBase}/rfqs/${rfqId}`, { token }),
    submitQuotation: (token, rfqId, payload) =>
      apiRequest(`${vendorBase}/rfqs/${rfqId}/quotations`, { token, method: "POST", body: payload }),
    requestMeeting: (token, rfqId, payload) =>
      apiRequest(`${vendorBase}/rfqs/${rfqId}/meeting-request`, { token, method: "POST", body: payload }),
    submitBid: (token, rfqId, payload) =>
      apiRequest(`${vendorBase}/rfqs/${rfqId}/bids`, { token, method: "POST", body: payload }),
    object: (token, rfqId, payload) =>
      apiRequest(`${vendorBase}/rfqs/${rfqId}/objections`, { token, method: "POST", body: payload }),
  },
  bids: {
    list: (token) => apiRequest(`${vendorBase}/bids`, { token }),
  },
  quotations: {
    list: (token) => apiRequest(`${vendorBase}/quotations`, { token }),
    submitRequestedDocument: (token, quotationId, payload) =>
      apiRequest(`${vendorBase}/quotations/${quotationId}/requested-document`, { token, method: "PATCH", body: payload }),
  },
  reports: {
    list: (token) => apiRequest(`${vendorBase}/vendor-reports`, { token }),
  },
  offers: {
    list: (token) => apiRequest(`${vendorBase}/offer-letters`, { token }),
    respond: (token, offerLetterId, payload) =>
      apiRequest(`${vendorBase}/offer-letters/${offerLetterId}/respond`, { token, method: "PATCH", body: payload }),
  },
  purchaseOrders: {
    list: (token) => apiRequest(`${vendorBase}/purchase-orders`, { token }),
  },
};
