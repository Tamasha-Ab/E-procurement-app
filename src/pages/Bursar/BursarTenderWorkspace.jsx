import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageHero from "../../components/PageHero";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { getSeniorAssistantBursarPath } from "../../utils/roleRoutes";
import { apiRequest, formatDateTime, formatMoney } from "../../services/apiClient";
import { requestDisplayName } from "../../utils/procurementDisplay";
import { toast } from "react-toastify";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";
const inputClass = "w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#166e8c]";
const buttonClass = "rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79] disabled:cursor-not-allowed disabled:opacity-50";
const bursarSubRoles = ["BURSAR", "ASSISTANT_BURSAR", "SENIOR_ASSISTANT_BURSAR"];

const initialForm = {
  tenderId: "",
  category: "",
  title: "",
  description: "",
  instructions: "",
  bidStartDateTime: "",
  submissionDeadline: "",
  bidOpeningDateTime: "",
  objectionDeadline: "",
  publishNow: true,
};

const defaultVendorInstructions = `Documents vendors must submit:
- Completed Bid Submission Form.
- Completed Price Schedule with unit prices, total price excluding VAT, VAT amount, and total price including VAT.
- Bid Security or Bid-Securing Declaration where required.
- Documentary evidence that offered goods conform to the technical specifications and standards.
- Documentary evidence proving bidder qualifications and eligibility.
- Manufacturer's Authorization when the bidder is not the manufacturer.
- Non-collusion affidavit.
- Product literature, user manuals, technical data, drawings, and bidder conformity responses for every specification row.
- Warranty and maintenance/service agreement details where applicable.

Instructions to vendors:
- Bid must be in English.
- Alternative bids are not accepted unless specifically allowed.
- Prices must be quoted in Sri Lankan Rupees and remain fixed during contract performance.
- VAT must be shown separately.
- Submit one original and one copy in sealed envelopes clearly marked ORIGINAL and COPY.
- Mark the outer envelope with bidder name/address, package/RFQ number, and bid opening warning.
- Late bids will be rejected.
- Bids must remain valid for the stated validity period.
- Bidders must disclose conflicts of interest and must not be blacklisted.
- Technical specifications should be answered item by item; referring only to a manual/specification bulletin may cause rejection.`;

const createdRfqRrStorageKey = "astraea:finance:rfq-created-rrs";

function rememberCreatedRfqRr(rrId) {
  if (!rrId) return;
  try {
    const current = JSON.parse(localStorage.getItem(createdRfqRrStorageKey) || "[]").map(String);
    const next = Array.from(new Set([...current, String(rrId)]));
    localStorage.setItem(createdRfqRrStorageKey, JSON.stringify(next));
  } catch {
    localStorage.setItem(createdRfqRrStorageKey, JSON.stringify([String(rrId)]));
  }
}

function asLocalDateTime(value) {
  return value || null;
}

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

function isTenderOpenForRfq(tender) {
  const statusAllowsRfq = tender.status === "READY_FOR_RFQ" || tender.status === "RFQ_CREATED";
  if (!statusAllowsRfq) return false;
  return !tender.closingDateTime || new Date(tender.closingDateTime).getTime() >= Date.now();
}

function buildRrSummary(rr) {
  if (!rr) return "";
  const items = Array.isArray(rr.items) ? rr.items : [];
  const itemSummary = items.length
    ? items.slice(0, 4).map((item) => `${item.itemName || "Item"} x ${item.quantity || 0}`).join(", ")
    : "No item list recorded";
  return [
    `Request: ${requestDisplayName(rr)}`,
    `Category: ${rr.vendorCategories || "Not recorded"}`,
    `Requester: ${rr.requestedByName || rr.requestingOfficerName || "Not recorded"}`,
    `Division/Faculty: ${rr.divisionName || rr.facultyName || "Not recorded"}`,
    `Estimated amount: ${formatMoney(rr.estimatedTotalAmount || rr.totalEstimatedCost || rr.estimatedTotal || rr.totalAmount)}`,
    `Submitted: ${formatDateTime(rr.submittedAt || rr.createdAt)}`,
    `Items: ${itemSummary}`,
    rr.justification ? `Justification: ${rr.justification}` : "",
  ].filter(Boolean).join("\n");
}

function sanitizePdfText(value) {
  return String(value || "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value) {
  return sanitizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapPdfLine(value, maxLength = 92) {
  const text = sanitizePdfText(value);
  if (!text) return [""];
  const words = text.split(" ");
  const lines = [];
  let current = "";

  words.forEach((word) => {
    if ((current ? current.length + 1 : 0) + word.length <= maxLength) {
      current = current ? `${current} ${word}` : word;
      return;
    }
    if (current) lines.push(current);
    current = word.length > maxLength ? word.slice(0, maxLength) : word;
  });

  if (current) lines.push(current);
  return lines;
}

function createVendorPdfDataUrl({ title, category, rrSummary, instructions }) {
  const sourceLines = [
    "Request for Quotation - Vendor Instructions",
    "",
    title ? `RFQ Title: ${title}` : "",
    category ? `Vendor Category: ${category}` : "",
    "",
    "Related RR Details",
    ...(rrSummary || "RR details not recorded.").split("\n"),
    "",
    "Documents and Instructions to Vendors",
    ...(instructions || "No vendor instructions recorded.").split("\n"),
  ].filter((line) => line !== null && line !== undefined);

  const wrappedLines = sourceLines.flatMap((line) => wrapPdfLine(line));
  const linesPerPage = 44;
  const pages = [];
  for (let index = 0; index < wrappedLines.length; index += linesPerPage) {
    pages.push(wrappedLines.slice(index, index + linesPerPage));
  }

  const objects = [];
  const pageIds = [];
  const contentIds = [];
  const fontId = 3;

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((pageLines, pageIndex) => {
    const pageId = 4 + pageIndex * 2;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    contentIds.push(contentId);

    const streamLines = pageLines.map((line) => `(${escapePdfText(line)}) Tj T*`).join("\n");
    const stream = `BT /F1 10 Tf 50 790 Td 14 TL\n${streamLines}\nET`;
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId - 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  objects[1] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return `data:application/pdf;base64,${window.btoa(pdf)}`;
}

export default function BursarTenderWorkspace() {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedRrId = query.get("rrId") || "";
  const requestedCategory = query.get("category") || "";
  const [tenders, setTenders] = useState([]);
  const [receivedRrs, setReceivedRrs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorCategories, setVendorCategories] = useState([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const isBursar = user?.mainRole === "FINANCE" && bursarSubRoles.includes(user?.subRole);
  const readyTenders = useMemo(
    () => tenders.filter(isTenderOpenForRfq),
    [tenders]
  );
  const selectedTender = readyTenders.find((tender) => String(tender.tenderId) === String(form.tenderId));
  const selectedRr = useMemo(
    () => receivedRrs.find((rr) => String(rr.rrId) === String(requestedRrId)) || null,
    [receivedRrs, requestedRrId]
  );
  const rrCategory = selectedRr?.vendorCategories || requestedCategory || "";
  const isRrDirectRfq = Boolean(requestedRrId);
  const canSendRfq = Boolean(
    selectedVendorIds.length
      && form.category
      && form.title
      && form.submissionDeadline
      && (selectedTender || isRrDirectRfq)
  );

  const loadTenders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await procurementApi.tenders.list(token);
      setTenders(getArray(data));
    } catch (loadError) {
      setError(loadError.message || "Could not load tenders.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadVendorCategories = useCallback(async () => {
    try {
      const data = await procurementApi.vendors.categories(token);
      setVendorCategories(Array.isArray(data) ? data : []);
    } catch {
      setVendorCategories([]);
    }
  }, [token]);

  const loadReceivedRrs = useCallback(async () => {
    try {
      const [pending, finalList] = await Promise.all([
        apiRequest("/api/tenders/bursar/requisitions/pending", { token }),
        apiRequest("/api/tenders/bursar/requisitions/final", { token }),
      ]);
      setReceivedRrs([
        ...(Array.isArray(pending) ? pending : []),
        ...(Array.isArray(finalList) ? finalList : []),
      ]);
    } catch {
      setReceivedRrs([]);
    }
  }, [token]);

  const searchVendors = async (event) => {
    event?.preventDefault();
    setError("");
    setNotice("");
    try {
      const data = await procurementApi.vendors.search(token, vendorSearch, form.category);
      const list = getArray(data).filter((vendor) => vendor.vendorId);
      setVendors(list);
      setSelectedVendorIds((current) =>
        current.filter((id) => list.some((vendor) => String(vendor.vendorId) === String(id)))
      );
      if (!list.length) {
        setNotice(form.category ? "No approved vendors found for this category." : "No approved vendors found.");
      }
    } catch (searchError) {
      setError(searchError.message || "Could not search vendors.");
    }
  };

  useEffect(() => {
    if (!token || !isBursar || !form.category) {
      setVendors([]);
      setSelectedVendorIds([]);
      return;
    }

    let cancelled = false;
    procurementApi.vendors.search(token, "", form.category)
      .then((data) => {
        if (cancelled) return;
        const list = getArray(data).filter((vendor) => vendor.vendorId);
        setVendors(list);
        setSelectedVendorIds((current) =>
          current.filter((id) => list.some((vendor) => String(vendor.vendorId) === String(id)))
        );
      })
      .catch(() => {
        if (!cancelled) {
          setVendors([]);
          setSelectedVendorIds([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, isBursar, form.category]);

  useEffect(() => {
    if (isBursar && token) {
      loadTenders();
      loadVendorCategories();
      loadReceivedRrs();
    }
  }, [isBursar, token, loadTenders, loadVendorCategories, loadReceivedRrs]);

  useEffect(() => {
    const tender = readyTenders.find((item) => String(item.tenderId) === String(form.tenderId));
    if (!tender) return;
    setForm((current) => ({
      ...current,
      title: current.title || `${tender.tenderNumber} - ${tender.title}`,
      description: current.description || tender.description || tender.title || "",
    }));
  }, [form.tenderId, readyTenders]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      category: current.category || rrCategory,
      title: current.title || (selectedRr ? requestDisplayName(selectedRr) : ""),
      description: current.description || buildRrSummary(selectedRr),
      instructions: current.instructions || defaultVendorInstructions,
    }));
  }, [rrCategory, selectedRr]);

  const updateForm = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleVendor = (vendorId, checked) => {
    setSelectedVendorIds((current) =>
      checked ? [...current, String(vendorId)] : current.filter((id) => id !== String(vendorId))
    );
  };

  const sendRfq = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!selectedVendorIds.length) {
      const validationMessage = "Select at least one vendor before sending the RFQ.";
      setError(validationMessage);
      toast.warning(validationMessage);
      return;
    }

    setLoading(true);
    try {
      const rrSummary = buildRrSummary(selectedRr);
      const vendorDocument = createVendorPdfDataUrl({
        title: form.title,
        category: form.category,
        rrSummary,
        instructions: form.instructions,
      });
      const createdRfq = await procurementApi.rfqs.create(token, {
        tenderId: form.tenderId ? Number(form.tenderId) : null,
        rrId: requestedRrId ? Number(requestedRrId) : null,
        title: form.title,
        description: (form.description || rrSummary).trim(),
        vendorCategory: form.category,
        vendorDocumentName: `${selectedRr ? requestDisplayName(selectedRr) : form.title || "vendor-rfq"}-instructions.pdf`.replace(/[\\/:*?"<>|]/g, "-"),
        vendorDocument,
        bidStartDateTime: asLocalDateTime(form.bidStartDateTime),
        submissionDeadline: asLocalDateTime(form.submissionDeadline),
        bidOpeningDateTime: asLocalDateTime(form.bidOpeningDateTime),
        objectionDeadline: asLocalDateTime(form.objectionDeadline),
        publishNow: form.publishNow,
        invitedVendorIds: selectedVendorIds.map(Number),
      });
      const createdRrId = createdRfq?.rrId || requestedRrId;
      rememberCreatedRfqRr(createdRrId);
      const successMessage = "RFQ created and sent successfully to the selected category vendors.";
      setNotice(successMessage);
      toast.success(successMessage);
      setForm(initialForm);
      setVendors([]);
      setSelectedVendorIds([]);
      setVendorSearch("");
      setReceivedRrs((current) => current.filter((rr) => String(rr.rrId) !== String(createdRrId)));
      navigate(getSeniorAssistantBursarPath(user, "audit-trail", "/finance/audit-trail"), { replace: true });
    } catch (submitError) {
      const errorMessage = submitError.message || "Could not send RFQ.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isBursar) {
    return (
      <section className={cardClass}>
        <h1 className="text-2xl font-black text-[#10283f]">Bursar Access Required</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Only bursar, assistant bursar, or senior assistant bursar users can send tender RFQs to vendors.</p>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <PageHero
        eyebrow="Create RFQ"
        title="Create and send RFQ"
        description="Create an RFQ for a BEC submitted RR or link it to a ready tender, then send it to matching vendors."
      />

      {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {notice && <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}

      <section>
        <form onSubmit={sendRfq} className={`${cardClass} space-y-4`}>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RFQ Details</div>
          <h2 className="mt-3 text-2xl font-black text-[#10283f]">Create and send RFQ</h2>

          {(form.category || selectedRr) && (
            <div className="grid gap-4 md:grid-cols-1">
              <div className="rounded-[22px] bg-[#edf7fb] p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">Selected Category</div>
                <div className="mt-2 text-lg font-black text-[#10283f]">{form.category || "Not selected"}</div>
              </div>
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-bold text-[#10283f]">{isRrDirectRfq ? "Approved Tender (optional)" : "Approved Tender"}</span>
            <select className={inputClass} name="tenderId" value={form.tenderId} onChange={updateForm} required={!isRrDirectRfq}>
              <option value="">{isRrDirectRfq ? "Create RFQ directly for selected RR" : "Select tender"}</option>
              {readyTenders.map((tender) => (
                <option key={tender.tenderId} value={tender.tenderId}>
                  {tender.tenderNumber} - {tender.title}
                </option>
              ))}
            </select>
            {readyTenders.length === 0 && (
              <span className="block text-xs font-semibold text-slate-500">
                No open approved tenders are available. This RFQ can still be created directly for the selected RR.
              </span>
            )}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-[#10283f]">Relevant Vendor Category</span>
            <input
              className={inputClass}
              name="category"
              value={form.category}
              onChange={updateForm}
              list="vendor-category-options"
              placeholder="Start typing a category from vendor records"
              required
            />
            <datalist id="vendor-category-options">
              {vendorCategories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-[#10283f]">RFQ Title</span>
            <input className={inputClass} name="title" value={form.title} onChange={updateForm} required />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-[#10283f]">Description</span>
            <textarea className={inputClass} name="description" rows={3} value={form.description} onChange={updateForm} />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-[#10283f]">Documents and instructions to vendors</span>
            <textarea className={inputClass} name="instructions" rows={12} value={form.instructions} onChange={updateForm} />
            <span className="block text-xs font-semibold text-slate-500">
              These instructions will be attached to the vendor RFQ as a PDF document.
            </span>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-[#10283f]">Bid Start Time</span>
              <input className={inputClass} type="datetime-local" name="bidStartDateTime" value={form.bidStartDateTime} onChange={updateForm} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-[#10283f]">Submission Deadline</span>
              <input className={inputClass} type="datetime-local" name="submissionDeadline" value={form.submissionDeadline} onChange={updateForm} required />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-[#10283f]">Bid Opening Time</span>
              <input className={inputClass} type="datetime-local" name="bidOpeningDateTime" value={form.bidOpeningDateTime} onChange={updateForm} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-[#10283f]">Objection Deadline</span>
              <input className={inputClass} type="datetime-local" name="objectionDeadline" value={form.objectionDeadline} onChange={updateForm} />
            </label>
          </div>

          <label className="flex items-center gap-3 text-sm font-bold text-[#10283f]">
            <input type="checkbox" name="publishNow" checked={form.publishNow} onChange={updateForm} />
            Publish immediately
          </label>

          <div className="rounded-[24px] border border-[#dce8ef] bg-[#fbfdff] p-4">
            <div className="mb-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">Registered Vendors</div>
              <div className="mt-1 text-sm text-slate-600">
                Vendors registered under {form.category || "the selected category"} are listed below.
              </div>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                className={inputClass}
                value={vendorSearch}
                onChange={(event) => setVendorSearch(event.target.value)}
                placeholder="Search vendor name, email, or contact"
              />
              <button className={buttonClass} type="button" onClick={searchVendors} disabled={!form.category}>
                Find Vendors
              </button>
            </div>

            <div className="mt-4 max-h-[300px] space-y-3 overflow-y-auto">
              {!vendors.length && <div className="rounded-2xl bg-white p-4 text-sm text-slate-600">No approved vendors found for this category yet.</div>}
              {vendors.map((vendor) => (
                <label key={vendor.vendorId} className="flex items-start gap-3 rounded-2xl bg-white p-4">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={selectedVendorIds.includes(String(vendor.vendorId))}
                    onChange={(event) => toggleVendor(vendor.vendorId, event.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-black text-[#10283f]">{vendor.vendorName}</span>
                    <span className="block text-xs leading-6 text-slate-600">
                      {vendor.category || "No category"} | {vendor.email || "No email"} {vendor.contactPerson ? `| ${vendor.contactPerson}` : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button className={buttonClass} type="submit" disabled={loading || !canSendRfq}>
            Send RFQ to Selected Vendors
          </button>
        </form>
      </section>
    </div>
  );
}
