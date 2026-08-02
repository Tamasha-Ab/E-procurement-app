const clean = (value) => (typeof value === "string" && value.trim() ? value.trim() : "");

const firstItem = (request) => {
  if (Array.isArray(request?.items) && request.items.length) return request.items[0];
  return null;
};

export const requestDisplayName = (request, fallback = "Requisition request") => {
  const item = firstItem(request);
  return (
    clean(request?.title) ||
    clean(request?.requestTitle) ||
    clean(request?.itemName) ||
    clean(item?.itemName) ||
    clean(request?.vendorCategories) ||
    clean(request?.category) ||
    clean(request?.description) ||
    fallback
  );
};

export const requestContext = (request) =>
  [clean(request?.vendorCategories), clean(request?.facultyName), clean(request?.divisionName)]
    .filter(Boolean)
    .join(" | ");

export const rfqDisplayName = (rfq, fallback = "Quotation request") => {
  const request = Array.isArray(rfq?.requisitionRequests) && rfq.requisitionRequests.length
    ? rfq.requisitionRequests[0]
    : rfq;
  const title = clean(rfq?.title);
  const generatedNumberTitle = /^RFQ\s+for\s+RR[-\s]/i.test(title) || /^RR[-\s]\d/i.test(title);
  if (generatedNumberTitle) {
    return requestDisplayName(request, fallback);
  }
  return (
    title ||
    clean(rfq?.tenderTitle) ||
    requestDisplayName(request, "") ||
    clean(rfq?.description) ||
    fallback
  );
};

export const rfqContext = (rfq) => {
  const request = Array.isArray(rfq?.requisitionRequests) && rfq.requisitionRequests.length
    ? rfq.requisitionRequests[0]
    : rfq;
  return [clean(request?.vendorCategories), clean(rfq?.tenderTitle), clean(rfq?.status)]
    .filter(Boolean)
    .join(" | ");
};
