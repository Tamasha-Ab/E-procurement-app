import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { becHeadPath } from "../../utils/roleRoutes";
import { procurementApi, vendorProcurementApi } from "../../api/procurementApi";
import { formatDateTime, formatMoney } from "../../services/apiClient";
import { requestDisplayName, rfqDisplayName, rfqContext } from "../../utils/procurementDisplay";
import PaginationControls from "../../components/PaginationControls";
import { toast } from "react-toastify";

const cardClass = "rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]";
const inputClass = "w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#166e8c]";
const buttonClass = "rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79] disabled:opacity-60";
const aiStatusTone = {
  COMPLIANT: "bg-emerald-50 text-emerald-700",
  PARTIALLY_COMPLIANT: "bg-amber-50 text-amber-700",
  NON_COMPLIANT: "bg-red-50 text-red-700",
  NOT_MENTIONED: "bg-slate-100 text-slate-700",
};
const aiConfidenceTone = {
  HIGH: "bg-emerald-100 text-emerald-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-slate-200 text-slate-700",
};

const initialRfq = {
  rrId: "",
  tenderId: "",
  title: "",
  description: "",
  bidStartDateTime: "",
  submissionDeadline: "",
  bidOpeningDateTime: "",
  objectionDeadline: "",
  publishNow: true,
};

const initialSpec = {
  rfqId: "",
  specTitle: "",
  specDescription: "",
  documentUrl: "",
};

const initialMeeting = {
  rfqId: "",
  vendorId: "",
  meetingRequired: true,
  meetingDateTime: "",
  meetingLinkOrLocation: "",
  agenda: "",
};

const initialBidEvaluation = {
  bidId: "",
  technicalScore: "",
  financialScore: "",
  totalScore: "",
  technicalQualified: true,
  tecComment: "",
};

const initialOffer = {
  rfqId: "",
  bidId: "",
  letterNumber: "",
  letterDocumentUrl: "",
};

const initialVendorBid = {
  rfqId: "",
  bidAmount: "",
  technicalDocumentUrl: "",
  financialDocumentUrl: "",
  encryptedBidData: "",
};

const initialVendorQuotation = {
  rfqId: "",
  quotedAmount: "",
  deliveryPeriodDays: "",
  remarks: "",
  attachmentUrl: "",
};

function asLocalDateTime(value) {
  return value ? value : null;
}

function toNumberOrNull(value) {
  return value === "" || value === null || value === undefined ? null : Number(value);
}

function formatAiStatus(value) {
  return String(value || "NOT_MENTIONED").replaceAll("_", " ");
}

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

function parseVendorQuotationDocuments(value) {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const documents = Array.isArray(parsed?.requiredDocuments) ? parsed.requiredDocuments : Array.isArray(parsed) ? parsed : [];
    return documents
      .filter((document) => document?.dataUrl)
      .map((document) => ({
        label: document.label || document.fileName || "Vendor document",
        fileName: document.fileName || document.label || "Vendor document",
        url: document.dataUrl,
      }));
  } catch {
    return [];
  }
}

function parseVendorSpecificationRows(specificationText = "") {
  return String(specificationText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const withoutNumber = line.replace(/^\d+\.\s*/, "");
      const [descriptionPart, detailPart = ""] = withoutNumber.split(/\s+-\s+Required:\s*/);
      const [requiredPart = "", conformityPart = ""] = detailPart.split(/\s+\|\s+Conformity:\s*/);
      const [conformity = "", bidderResponse = ""] = conformityPart.split(/\s+\|\s+Bidder Response:\s*/);
      return {
        description: descriptionPart.trim(),
        requiredSpecification: requiredPart.trim(),
        conformity: conformity.trim(),
        bidderResponse: bidderResponse.trim(),
      };
    })
    .filter((row) => row.description || row.requiredSpecification || row.conformity || row.bidderResponse);
}

function VendorSpecificationTable({ specificationText }) {
  const rows = parseVendorSpecificationRows(specificationText);
  if (!rows.length) {
    return <div className="mt-2 text-sm leading-7 text-slate-700">Vendor did not submit a specification text.</div>;
  }

  return (
    <div className="mt-3 rounded-xl border border-[#c8dce7] bg-white">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead className="bg-[#edf7fb] text-[#10283f]">
          <tr>
            <th className="w-[24%] border border-[#c8dce7] px-3 py-2 text-left">Description</th>
            <th className="w-[36%] border border-[#c8dce7] px-3 py-2 text-left">Required Specification</th>
            <th className="w-[14%] border border-[#c8dce7] px-3 py-2 text-center">Conformity</th>
            <th className="w-[26%] border border-[#c8dce7] px-3 py-2 text-left">Bidder Response</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.description}-${index}`} className="bg-white">
              <td className="break-words border border-[#c8dce7] px-3 py-2 align-top text-slate-700">{row.description || "Not provided"}</td>
              <td className="break-words border border-[#c8dce7] px-3 py-2 align-top text-slate-700">{row.requiredSpecification || "Not provided"}</td>
              <td className="break-words border border-[#c8dce7] px-3 py-2 text-center align-top font-bold text-[#10283f]">{row.conformity || "Not provided"}</td>
              <td className="break-words border border-[#c8dce7] px-3 py-2 align-top text-slate-700">{row.bidderResponse || "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DepartureRequirementCell({ specificationText, fallback }) {
  const rows = parseVendorSpecificationRows(specificationText);
  if (!rows.length) {
    return <div className="text-xs leading-6 text-slate-700">{fallback || "No RR specification linked."}</div>;
  }

  return (
    <table className="w-full table-fixed border-collapse text-xs">
      <thead className="bg-slate-100 text-[#10283f]">
        <tr>
          <th className="w-[42%] border border-[#d6e4ec] px-2 py-2 text-left">Description</th>
          <th className="w-[58%] border border-[#d6e4ec] px-2 py-2 text-left">Required Specification</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`requirement-${row.description}-${index}`}>
            <td className="break-words border border-[#d6e4ec] px-2 py-2 align-top text-slate-700">{row.description || "Not provided"}</td>
            <td className="break-words border border-[#d6e4ec] px-2 py-2 align-top text-slate-700">{row.requiredSpecification || fallback || "Not provided"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DepartureOfferedCell({ specificationText }) {
  const rows = parseVendorSpecificationRows(specificationText);
  if (!rows.length) {
    return <div className="text-xs leading-6 text-slate-700">No vendor specification submitted.</div>;
  }

  return (
    <table className="w-full table-fixed border-collapse text-xs">
      <thead className="bg-slate-100 text-[#10283f]">
        <tr>
          <th className="w-[30%] border border-[#d6e4ec] px-2 py-2 text-center">Conformity</th>
          <th className="w-[70%] border border-[#d6e4ec] px-2 py-2 text-left">Bidder Response</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`offered-${row.description}-${index}`}>
            <td className="break-words border border-[#d6e4ec] px-2 py-2 text-center align-top font-bold text-[#10283f]">{row.conformity || "Not provided"}</td>
            <td className="break-words border border-[#d6e4ec] px-2 py-2 align-top text-slate-700">{row.bidderResponse || "N/A"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Notice({ error, message }) {
  if (!error && !message) return null;
  return (
    <div className={`rounded-[24px] p-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
      {error || message}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-[#10283f]">{label}</span>
      {children}
    </label>
  );
}

function ActionCard({ eyebrow, title, children }) {
  return (
    <section className={cardClass}>
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">{eyebrow}</div>
      <h2 className="mt-3 text-2xl font-black text-[#10283f]">{title}</h2>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

function EmptyState({ text }) {
  return <div className="rounded-[24px] bg-slate-50 p-5 text-sm leading-7 text-slate-600">{text}</div>;
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-[20px] bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{label}</div>
      <div className="mt-2 text-sm font-bold text-[#10283f]">{value || "Not available"}</div>
    </div>
  );
}

function RfqList({ rfqs, onSelect, selectedId }) {
  if (!rfqs.length) return <EmptyState text="No RFQs found for this account yet." />;

  return (
    <div className="space-y-3">
      {rfqs.map((rfq) => (
        <button
          key={rfq.rfqId}
          type="button"
          onClick={() => onSelect?.(rfq)}
          className={`w-full rounded-[24px] border p-4 text-left transition ${
            selectedId === rfq.rfqId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#dce8ef] hover:bg-[#f8fcff]"
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-black text-[#10283f]">{rfqDisplayName(rfq)}</h3>
            <StatusPill status={rfq.status} />
          </div>
          <div className="mt-2 text-sm leading-7 text-slate-600">
            {rfqContext(rfq) || "Invitation"} | Opens {formatDateTime(rfq.bidOpeningDateTime)}
          </div>
        </button>
      ))}
    </div>
  );
}

function DataTable({ rows, columns, empty, compact = false }) {
  if (!rows.length) return <EmptyState text={empty} />;
  const rowKey = (row, index) => [
    row.quotationId,
    row.bidItemId,
    row.id,
    row.rfqId,
    row.bidId,
    row.objectionId,
    row.reportId,
    row.offerLetterId,
    row.purchaseOrderId,
    index,
  ].filter((value) => value !== undefined && value !== null && value !== "").join("-");

  return (
    <div className="overflow-x-auto rounded-[24px] border border-[#dce8ef]">
      <table className="min-w-full divide-y divide-[#dce8ef] text-left text-sm">
        <thead className="bg-[#f8fcff] text-xs uppercase tracking-[0.18em] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-bold">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf3f6]">
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column) => (
                <td key={column.key} className={`${compact ? "px-3 py-2" : "px-4 py-4"} text-slate-700`}>
                  {column.render ? column.render(row) : row[column.key] ?? "Not set"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SelectField({ value, onChange, options, placeholder = "Select an option", required = false, disabled = false }) {
  return (
    <select className={inputClass} value={value} onChange={onChange} required={required} disabled={disabled}>
      <option value="">{placeholder}</option>
      {options.map((option, index) => (
        <option key={`${option.value}-${index}`} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ProcurementOfficerWorkspace({ token, setError, setMessage }) {
  const [activeSection, setActiveSection] = useState("rfq");
  const [rfqForm, setRfqForm] = useState(initialRfq);
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [readyRequests, setReadyRequests] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [invitedVendorIds, setInvitedVendorIds] = useState([]);
  const [acceptedOffers, setAcceptedOffers] = useState([]);
  const [pos, setPos] = useState([]);
  const [poForm, setPoForm] = useState({ offerLetterId: "", poNumber: "", deliveryDeadline: "" });
  const [loading, setLoading] = useState(false);

  const sections = [
    { id: "rfq", label: "Create RFQ" },
    { id: "vendors", label: "Invite Vendors" },
    { id: "po", label: "Purchase Orders" },
  ];

  const readyRequestOptions = readyRequests.map((request) => ({
    value: request.rrId,
    label: `${requestDisplayName(request)} - ${request.vendorCategories || request.divisionName || "Request"} - ${formatMoney(request.estimatedTotalAmount)}`,
  }));
  const tenderOptions = tenders
    .filter((tender) => tender.status === "READY_FOR_RFQ")
    .map((tender) => ({
      value: tender.tenderId,
      label: `${tender.tenderNumber || `Tender ${tender.tenderId}`} - ${tender.title || "Untitled"} - ${formatMoney(tender.tenderValue)}`,
    }));
  const filteredReadyRequests = rfqForm.tenderId
    ? readyRequests.filter((request) => String(request.tenderId) === String(rfqForm.tenderId))
    : readyRequests;
  const rfqOptions = rfqs.map((rfq) => ({
    value: rfq.rfqId,
    label: `${rfqDisplayName(rfq)} - ${rfq.status || "DRAFT"}`,
  }));
  const acceptedOfferOptions = acceptedOffers.map((offer) => ({
    value: offer.offerLetterId,
    label: `${offer.letterNumber || `Offer ${offer.offerLetterId}`} - ${offer.vendorName || "Vendor"} - ${formatMoney(offer.offerAmount)}`,
  }));
  const selectedRfqClosed = selectedRfq?.submissionDeadline
    ? new Date(selectedRfq.submissionDeadline).getTime() <= Date.now()
    : false;

  const load = async () => {
    setLoading(true);
    try {
      const [readyData, tenderData, rfqData, offerData, poData] = await Promise.all([
        procurementApi.requisitions.ready(token),
        procurementApi.tenders.list(token),
        procurementApi.rfqs.list(token),
        procurementApi.purchaseOrders.acceptedOffers(token),
        procurementApi.purchaseOrders.list(token),
      ]);
      setReadyRequests(getArray(readyData));
      setTenders(getArray(tenderData));
      setRfqs(getArray(rfqData));
      setAcceptedOffers(getArray(offerData));
      setPos(getArray(poData));
    } catch (err) {
      setError(err.message || "Could not load procurement data.");
    } finally {
      setLoading(false);
    }
  };

  const searchVendors = async (event) => {
    event?.preventDefault();
    setError("");
    setMessage("");
    try {
      const data = await procurementApi.vendors.search(token, vendorSearch);
      const vendorList = getArray(data).filter((vendor) => vendor.vendorId);
      setVendors(vendorList);
      if (!vendorList.length) {
        setMessage(vendorSearch ? "No approved vendors found for that business name." : "No approved vendors found.");
      }
    } catch (err) {
      setError(err.message || "Could not search vendors.");
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    searchVendors();
  }, [token]);

  const loadInvitations = async (rfqId) => {
    if (!rfqId) {
      setInvitedVendorIds([]);
      return;
    }
    try {
      const data = await procurementApi.rfqs.invitations(token, rfqId);
      setInvitedVendorIds(getArray(data).map((invitation) => String(invitation.vendorId)).filter(Boolean));
      setSelectedVendorIds([]);
    } catch (err) {
      setError(err.message || "Could not load RFQ invitations.");
    }
  };

  const selectRfqForInvites = (rfqId) => {
    const rfq = rfqs.find((item) => String(item.rfqId) === String(rfqId)) || null;
    setSelectedRfq(rfq);
    loadInvitations(rfq?.rfqId);
  };

  const updateRfq = (event) => {
    const { name, value, type, checked } = event.target;
    setRfqForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const createRfq = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await procurementApi.rfqs.create(token, {
        rrId: rfqForm.rrId ? Number(rfqForm.rrId) : null,
        tenderId: rfqForm.tenderId ? Number(rfqForm.tenderId) : null,
        title: rfqForm.title,
        description: rfqForm.description,
        bidStartDateTime: asLocalDateTime(rfqForm.bidStartDateTime),
        submissionDeadline: asLocalDateTime(rfqForm.submissionDeadline),
        bidOpeningDateTime: asLocalDateTime(rfqForm.bidOpeningDateTime),
        objectionDeadline: asLocalDateTime(rfqForm.objectionDeadline),
        publishNow: rfqForm.publishNow,
      });
      setMessage("RFQ created successfully.");
      setRfqForm(initialRfq);
      load();
    } catch (err) {
      setError(err.message || "Could not create RFQ.");
    }
  };

  const inviteVendors = async (event) => {
    event.preventDefault();
    if (!selectedRfq) return;
    setError("");
    setMessage("");
    try {
      await procurementApi.rfqs.inviteVendors(token, selectedRfq.rfqId, { vendorIds: selectedVendorIds.map(Number) });
      setMessage("Vendors invited to the selected RFQ.");
      setSelectedVendorIds([]);
      loadInvitations(selectedRfq.rfqId);
    } catch (err) {
      setError(err.message || "Could not invite vendors.");
    }
  };

  const createPo = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await procurementApi.purchaseOrders.create(token, {
        offerLetterId: Number(poForm.offerLetterId),
        poNumber: poForm.poNumber || null,
        deliveryDeadline: poForm.deliveryDeadline || null,
      });
      setMessage("Purchase order generated.");
      setPoForm({ offerLetterId: "", poNumber: "", deliveryDeadline: "" });
      load();
    } catch (err) {
      setError(err.message || "Could not create purchase order.");
    }
  };

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Tender Workspace</div>
        <h2 className="mt-3 text-2xl font-black text-[#10283f]">Procurement officer actions</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                activeSection === section.id ? "bg-[#166e8c] text-white" : "bg-[#edf7fb] text-[#166e8c] hover:bg-[#d9edf5]"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </section>

      {activeSection === "rfq" && (
        <ActionCard eyebrow="RFQ Setup" title="Create RFQ from Approved Tender">
          <div className="rounded-[24px] border border-[#dce8ef] bg-[#fbfdff] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Submitted by Bursar</div>
            <h3 className="mt-2 text-xl font-black text-[#10283f]">RRs ready for Procurement Officer</h3>
            <div className="mt-4">
              <DataTable
                rows={filteredReadyRequests}
                empty={rfqForm.tenderId ? "No RRs are included under the selected tender." : "No RRs have been submitted to Procurement Officer yet."}
                columns={[
                  { key: "rrNumber", label: "RR Number" },
                  { key: "title", label: "Title" },
                  {
                    key: "tender",
                    label: "Tender",
                    render: (row) => row.tenderNumber
                      ? `${row.tenderNumber} - ${row.tenderTitle || "Untitled"}`
                      : "Not assigned",
                  },
                  { key: "facultyName", label: "Faculty" },
                  { key: "divisionName", label: "Division" },
                  { key: "estimatedTotalAmount", label: "Amount", render: (row) => formatMoney(row.estimatedTotalAmount) },
                  { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
                ]}
              />
            </div>
          </div>

          <form onSubmit={createRfq} className="space-y-4">
            <Field label="Approved Tender">
              <SelectField
                value={rfqForm.tenderId}
                onChange={(e) => setRfqForm((current) => ({ ...current, tenderId: e.target.value, rrId: "" }))}
                options={tenderOptions}
                placeholder={loading ? "Loading approved tenders..." : "Select approved tender"}
              />
            </Field>
            <Field label="Fallback Approved Requisition Request">
              <SelectField
                value={rfqForm.rrId}
                onChange={(e) => setRfqForm((current) => ({ ...current, rrId: e.target.value, tenderId: "" }))}
                options={readyRequestOptions}
                placeholder={loading ? "Loading approved requests..." : "Select only if no tender is used"}
              />
            </Field>
            <Field label="RFQ Title"><input className={inputClass} name="title" value={rfqForm.title} onChange={updateRfq} required /></Field>
            <Field label="Description"><textarea className={inputClass} name="description" rows={3} value={rfqForm.description} onChange={updateRfq} /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Bid Start Time"><input className={inputClass} type="datetime-local" name="bidStartDateTime" value={rfqForm.bidStartDateTime} onChange={updateRfq} /></Field>
              <Field label="Submission Deadline"><input className={inputClass} type="datetime-local" name="submissionDeadline" value={rfqForm.submissionDeadline} onChange={updateRfq} required /></Field>
              <Field label="Bid Opening Time"><input className={inputClass} type="datetime-local" name="bidOpeningDateTime" value={rfqForm.bidOpeningDateTime} onChange={updateRfq} /></Field>
            </div>
            <Field label="Objection Deadline"><input className={inputClass} type="datetime-local" name="objectionDeadline" value={rfqForm.objectionDeadline} onChange={updateRfq} /></Field>
            <label className="flex items-center gap-3 text-sm font-bold text-[#10283f]">
              <input type="checkbox" name="publishNow" checked={rfqForm.publishNow} onChange={updateRfq} />
              Publish immediately
            </label>
            <button className={buttonClass} type="submit">Create RFQ</button>
          </form>
        </ActionCard>
      )}

      {activeSection === "vendors" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <ActionCard eyebrow="Tender List" title="Select RFQ">
            <Field label="RFQ">
              <SelectField
                value={selectedRfq?.rfqId || ""}
                onChange={(e) => selectRfqForInvites(e.target.value)}
                options={rfqOptions}
                placeholder={loading ? "Loading RFQs..." : "Select RFQ"}
                required
              />
            </Field>
            {selectedRfqClosed && (
              <div className="rounded-[20px] bg-red-50 p-4 text-sm font-semibold text-red-700">
                This RFQ has passed its bid closing time. Vendors cannot be invited now.
              </div>
            )}
            <RfqList rfqs={selectedRfq ? [selectedRfq] : []} selectedId={selectedRfq?.rfqId} />
          </ActionCard>

          <ActionCard eyebrow="Vendor Search" title="Search Vendors by Business Name">
            <form onSubmit={searchVendors} className="flex flex-col gap-3 md:flex-row">
              <input
                className={inputClass}
                value={vendorSearch}
                onChange={(event) => setVendorSearch(event.target.value)}
                placeholder="Business name, example: ABC Suppliers"
              />
              <button className={buttonClass} type="submit">Search</button>
            </form>
            <form onSubmit={inviteVendors} className="space-y-4">
              <div className="max-h-[320px] space-y-3 overflow-y-auto rounded-[24px] border border-[#dce8ef] p-3">
                {!vendors.length && <EmptyState text="No approved vendors are available." />}
                {vendors.map((vendor) => (
                  <label key={vendor.vendorId} className={`flex items-start gap-3 rounded-[20px] p-4 ${invitedVendorIds.includes(String(vendor.vendorId)) ? "bg-slate-100" : "bg-[#f8fcff]"}`}>
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedVendorIds.includes(String(vendor.vendorId))}
                      disabled={selectedRfqClosed || invitedVendorIds.includes(String(vendor.vendorId))}
                      onChange={(event) => {
                        setSelectedVendorIds((current) =>
                          event.target.checked
                            ? [...current, String(vendor.vendorId)]
                            : current.filter((id) => id !== String(vendor.vendorId))
                        );
                      }}
                    />
                    <span>
                      <span className="block text-sm font-black text-[#10283f]">{vendor.vendorName || `Vendor ${vendor.vendorId}`}</span>
                      <span className="block text-xs leading-6 text-slate-600">
                        Vendor ID {vendor.vendorId} | {vendor.email || "No email"}
                        {vendor.contactPerson ? ` | Contact: ${vendor.contactPerson}` : ""}
                      </span>
                      {invitedVendorIds.includes(String(vendor.vendorId)) && (
                        <span className="mt-1 block text-xs font-bold text-emerald-700">Already invited to this RFQ</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
              <button className={buttonClass} type="submit" disabled={!selectedRfq || selectedRfqClosed || !selectedVendorIds.length}>
                Invite Selected Vendors
              </button>
            </form>
          </ActionCard>
        </div>
      )}

      {activeSection === "po" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <ActionCard eyebrow="Purchase Order" title="Generate PO After Offer Acceptance">
            <form onSubmit={createPo} className="space-y-4">
              <Field label="Accepted Offer Letter">
                <SelectField
                  value={poForm.offerLetterId}
                  onChange={(e) => setPoForm((c) => ({ ...c, offerLetterId: e.target.value }))}
                  options={acceptedOfferOptions}
                  placeholder="Select accepted offer letter"
                  required
                />
              </Field>
              <Field label="PO Number"><input className={inputClass} value={poForm.poNumber} onChange={(e) => setPoForm((c) => ({ ...c, poNumber: e.target.value }))} /></Field>
              <Field label="Delivery Deadline"><input className={inputClass} type="date" value={poForm.deliveryDeadline} onChange={(e) => setPoForm((c) => ({ ...c, deliveryDeadline: e.target.value }))} /></Field>
              <button className={buttonClass} type="submit">Generate PO</button>
            </form>
          </ActionCard>

          <ActionCard eyebrow="PO Tracking" title="Purchase Orders">
            <DataTable
              rows={pos}
              empty="No purchase orders found."
              columns={[
                { key: "purchaseOrderId", label: "PO ID" },
                { key: "poNumber", label: "PO Number" },
                { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
                { key: "totalAmount", label: "Amount", render: (row) => formatMoney(row.totalAmount) },
              ]}
            />
          </ActionCard>
        </div>
      )}
    </div>
  );
}

function TecWorkspace({ token, setError, setMessage, quotationReviewOnly = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const tecQuery = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedMeetingRfqId = tecQuery.get("section") === "meeting" ? tecQuery.get("rfqId") || "" : "";
  const requestedMeetingVendorId = tecQuery.get("section") === "meeting" ? tecQuery.get("vendorId") || "" : "";
  const requestedMeetingVendorName = tecQuery.get("section") === "meeting" ? tecQuery.get("vendorName") || "" : "";
  const requestedObjectionRfqId = tecQuery.get("section") === "objections" ? tecQuery.get("rfqId") || "" : "";
  const requestedQuotationRfqId = tecQuery.get("section") === "quotations" ? tecQuery.get("rfqId") || "" : "";
  const reviewerLabel = quotationReviewOnly ? "BEC" : "TEC";
  const [activeSection, setActiveSection] = useState(quotationReviewOnly ? "quotations" : "meeting");
  const [spec, setSpec] = useState(initialSpec);
  const [meeting, setMeeting] = useState(initialMeeting);
  const [completeMeeting, setCompleteMeeting] = useState({ meetingId: "", minutesDocumentUrl: "", changeSummary: "" });
  const [rfqLookup, setRfqLookup] = useState("");
  const [specRfqs, setSpecRfqs] = useState([]);
  const [publishedRfqs, setPublishedRfqs] = useState([]);
  const [publishedRfqRows, setPublishedRfqRows] = useState([]);
  const [rfqPage, setRfqPage] = useState(0);
  const [rfqTotalPages, setRfqTotalPages] = useState(1);
  const [rfqTotalItems, setRfqTotalItems] = useState(0);
  const [rfqSearch, setRfqSearch] = useState("");
  const [debouncedRfqSearch, setDebouncedRfqSearch] = useState("");
  const [bids, setBids] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [sentQuotationIds, setSentQuotationIds] = useState(() => new Set());
  const [objections, setObjections] = useState([]);
  const [reports, setReports] = useState([]);
  const [meetingRecord, setMeetingRecord] = useState(null);
  const [evaluation, setEvaluation] = useState(initialBidEvaluation);
  const [quotationEvaluation, setQuotationEvaluation] = useState({ quotationId: "", technicallyQualified: true, evaluationComment: "" });
  const [quotationItemDecisions, setQuotationItemDecisions] = useState({});
  const [quotationDocumentRequests, setQuotationDocumentRequests] = useState({});
  const [quotationDocumentLoadingId, setQuotationDocumentLoadingId] = useState("");
  const [aiReviewByQuotation, setAiReviewByQuotation] = useState({});
  const [aiLoadingQuotationId, setAiLoadingQuotationId] = useState("");
  const [offerLetterDraft, setOfferLetterDraft] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [recommendation, setRecommendation] = useState({ rfqId: "", bidId: "" });
  const [objectionDecision, setObjectionDecision] = useState({ objectionId: "", status: "RESOLVED", resolutionComment: "" });
  const [offer, setOffer] = useState(initialOffer);
  const [quotationResultsVisible, setQuotationResultsVisible] = useState(false);
  const quotationResultsRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedRfqSearch(rfqSearch.trim()); setRfqPage(0); }, 350);
    return () => window.clearTimeout(timer);
  }, [rfqSearch]);

  useEffect(() => {
    if (!quotationReviewOnly || activeSection !== "quotations") return;
    procurementApi.rfqs.publishedForBecPage(token, rfqPage, 10, debouncedRfqSearch)
      .then((data) => {
        setPublishedRfqRows(data?.content || []);
        setRfqTotalPages(Math.max(1, data?.totalPages || 1));
        setRfqTotalItems(data?.totalElements || 0);
      })
      .catch((err) => setError(err.message || "Could not load published RFQs."));
  }, [token, quotationReviewOnly, activeSection, rfqPage, debouncedRfqSearch, setError]);

  const tecRfqs = Array.from(
    new Map([...specRfqs, ...publishedRfqs].filter((rfq) => rfq?.rfqId).map((rfq) => [String(rfq.rfqId), rfq])).values()
  );
  const publishedRfqOptions = publishedRfqs.map((rfq) => ({
    value: rfq.rfqId,
    label: `${rfqDisplayName(rfq)} - ${rfqContext(rfq) || rfq.status || "PUBLISHED"}`,
  }));
  const loadedRfqOptions = [
    ...tecRfqs.map((rfq) => ({
      value: rfq.rfqId,
      label: `${rfqDisplayName(rfq)} - ${rfqContext(rfq) || rfq.status || "CREATED"}`,
    })),
    ...(rfqLookup && !tecRfqs.some((rfq) => String(rfq.rfqId) === String(rfqLookup))
      ? [{ value: rfqLookup, label: `Selected request ${rfqLookup}` }]
      : []),
  ];
  const bidOptions = bids.map((bid) => ({
    value: bid.bidId,
    label: `Bid ${bid.bidId} - ${bid.vendorName || "Vendor"} - ${formatMoney(bid.bidAmount)}`,
  }));
  const quotationOptions = quotations.map((quotation) => ({
    value: quotation.quotationId,
    label: `Quotation ${quotation.quotationId} - ${quotation.vendorName || "Vendor"} - ${formatMoney(quotation.quotedAmount)}`,
  }));
  const qualifiedBidOptions = bids
    .filter((bid) => bid.technicalQualified === true || bid.technicalQualified === "true")
    .map((bid) => ({
      value: bid.bidId,
      label: `Bid ${bid.bidId} - ${bid.vendorName || "Vendor"} - ${formatMoney(bid.bidAmount)}`,
    }));
  const objectionOptions = objections.map((objection) => ({
    value: objection.objectionId,
    label: `Objection ${objection.objectionId} - ${objection.vendorName || "Vendor"} - ${objection.status || "PENDING"}`,
  }));
  const meetingOptions = meetingRecord?.meetingId
    ? [{ value: meetingRecord.meetingId, label: `Meeting ${meetingRecord.meetingId} - ${meetingRecord.status || "Saved"}` }]
    : [];
  const selectedRfq = tecRfqs.find((rfq) => String(rfq.rfqId) === String(rfqLookup));
  const selectedOpeningTime = selectedRfq?.submissionDeadline || selectedRfq?.bidOpeningDateTime;
  const isSelectedRfqOpen = selectedOpeningTime ? new Date(selectedOpeningTime).getTime() <= Date.now() : false;
  const quotationsAreSealed = quotations.some((quotation) => quotation.sealed);
  const approvedQuotationItemsByItem = quotations
    .filter((quotation) => !quotation.sealed)
    .flatMap((quotation) =>
      (quotation.items || [])
        .filter((item) => item.technicalStatus === "APPROVED" || item.technicallyCompliant || item.vendorSelected)
        .map((item) => ({ ...item, quotation }))
    )
    .reduce((groups, item) => {
      const key = item.requisitionItemId || item.requisitionItemName || "unknown";
      return {
        ...groups,
        [key]: [...(groups[key] || []), item],
      };
    }, {});
  const sections = quotationReviewOnly
    ? [{ id: "quotations", label: "Quotations" }]
    : [
        { id: "meeting", label: "Pre-Bid Meeting" },
        { id: "quotations", label: "Quotations" },
        { id: "objections", label: "Objections" },
        { id: "reports", label: "Rejected Reports" },
        { id: "offer", label: "Offer Letter" },
      ];

  const update = (setter) => (event) => {
    const { name, value, type, checked } = event.target;
    setter((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const loadSpecRfqs = async () => {
    setError("");
    try {
      const [readyData, publishedData] = await Promise.all([
        quotationReviewOnly ? [] : procurementApi.rfqs.readyForSpecifications(token).catch(() => []),
        quotationReviewOnly ? procurementApi.rfqs.publishedForBec(token) : procurementApi.rfqs.publishedForTec(token),
      ]);
      const readyRfqs = getArray(readyData);
      const publishedList = getArray(publishedData);
      setSpecRfqs(readyRfqs);
      setPublishedRfqs(publishedList);
      const selectableRfqs = Array.from(
        new Map([...readyRfqs, ...publishedList].filter((rfq) => rfq?.rfqId).map((rfq) => [String(rfq.rfqId), rfq])).values()
      );
      if (requestedQuotationRfqId) {
        selectLoadedRfq(requestedQuotationRfqId);
      } else if (requestedMeetingRfqId) {
        selectLoadedRfq(requestedMeetingRfqId);
      } else if (selectableRfqs.length && !rfqLookup) {
        selectLoadedRfq(String(selectableRfqs[0].rfqId));
      }
    } catch (err) {
      setError(err.message || `Could not load ${reviewerLabel} RFQs.`);
    }
  };

  const selectLoadedRfq = (rfqId) => {
    setRfqLookup(rfqId);
    setSpec((current) => ({ ...current, rfqId }));
    setMeeting((current) => ({ ...current, rfqId }));
    setRecommendation((current) => ({ ...current, rfqId }));
    setOffer((current) => ({ ...current, rfqId }));
  };

  useEffect(() => {
    loadSpecRfqs();
  }, [token]);

  useEffect(() => {
    if (requestedMeetingRfqId) {
      setActiveSection("meeting");
      selectLoadedRfq(requestedMeetingRfqId);
      setMeeting((current) => ({ ...current, rfqId: requestedMeetingRfqId, vendorId: requestedMeetingVendorId }));
    }
  }, [requestedMeetingRfqId, requestedMeetingVendorId]);

  useEffect(() => {
    if (requestedObjectionRfqId) {
      setActiveSection("objections");
      selectLoadedRfq(requestedObjectionRfqId);
      loadRfqWork(null, requestedObjectionRfqId);
    } else if (tecQuery.get("section") === "objections") {
      setActiveSection("objections");
    }
  }, [requestedObjectionRfqId, tecQuery]);

  const loadRfqWork = async (event, rfqIdOverride = "") => {
    event?.preventDefault();
    const targetRfqId = rfqIdOverride || rfqLookup;
    if (!targetRfqId) return;
    setError("");
    setMessage("");
    try {
      if (quotationReviewOnly) {
        const quotationData = await procurementApi.rfqs.quotations(token, targetRfqId);
        setQuotations(getArray(quotationData));
        setSelectedQuotation(null);
        setRfqLookup(targetRfqId);
        setQuotationResultsVisible(true);
        setMessage("RFQ quotation data loaded.");
        const openedRfq = tecRfqs.find((rfq) => String(rfq.rfqId) === String(targetRfqId));
        const openingTime = openedRfq?.submissionDeadline || openedRfq?.bidOpeningDateTime;
        if (openedRfq && (!openingTime || new Date(openingTime).getTime() <= Date.now())) {
          toast.info(`${rfqDisplayName(openedRfq)} is open for quotation evaluation.`, { autoClose: 4500 });
        } else {
          toast.success("RFQ quotation data loaded.", { autoClose: 3500 });
        }
        window.requestAnimationFrame(() => quotationResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }
      const [bidData, quotationData, objectionData, reportData, meetingData] = await Promise.all([
        procurementApi.rfqs.bids(token, targetRfqId),
        procurementApi.rfqs.quotations(token, targetRfqId),
        procurementApi.rfqs.objections(token, targetRfqId),
        procurementApi.rfqs.reports(token, targetRfqId),
        procurementApi.meetings.get(token, targetRfqId).catch(() => null),
      ]);
      setBids(getArray(bidData));
      setQuotations(getArray(quotationData));
      setSelectedQuotation(null);
      setObjections(getArray(objectionData));
      setReports(getArray(reportData));
      setMeetingRecord(meetingData);
      setRfqLookup(targetRfqId);
      setSpec((current) => ({ ...current, rfqId: targetRfqId }));
      setMeeting((current) => ({ ...current, rfqId: targetRfqId }));
      setRecommendation((current) => ({ ...current, rfqId: targetRfqId }));
      setOffer((current) => ({ ...current, rfqId: targetRfqId }));
      setMessage("RFQ evaluation data loaded.");
    } catch (err) {
      setError(err.message || "Could not load RFQ evaluation data.");
    }
  };

  useEffect(() => {
    if (requestedQuotationRfqId) {
      setActiveSection("quotations");
      selectLoadedRfq(requestedQuotationRfqId);
      loadRfqWork(null, requestedQuotationRfqId);
    }
  }, [requestedQuotationRfqId]);

  const createSpec = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await procurementApi.specifications.create(token, spec.rfqId, {
        specTitle: spec.specTitle,
        specDescription: spec.specDescription,
        documentUrl: spec.documentUrl,
      });
      setMessage("Specification document saved.");
      setSpec(initialSpec);
      loadSpecRfqs();
    } catch (err) {
      setError(err.message || "Could not save specifications.");
    }
  };

  const scheduleMeeting = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await procurementApi.meetings.schedule(token, meeting.rfqId, {
        meetingRequired: meeting.meetingRequired,
        vendorId: meeting.vendorId ? Number(meeting.vendorId) : null,
        meetingDateTime: asLocalDateTime(meeting.meetingDateTime),
        meetingLinkOrLocation: meeting.meetingLinkOrLocation,
        agenda: meeting.agenda,
      });
      setMessage("Pre-bid meeting scheduled and vendor notified.");
      setMeeting(initialMeeting);
      loadRfqWork();
    } catch (err) {
      setError(err.message || "Could not schedule meeting.");
    }
  };

  const markMeetingComplete = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await procurementApi.meetings.complete(token, completeMeeting.meetingId, {
        minutesDocumentUrl: completeMeeting.minutesDocumentUrl,
        changeSummary: completeMeeting.changeSummary,
      });
      setMessage("Meeting marked as completed.");
      setCompleteMeeting({ meetingId: "", minutesDocumentUrl: "", changeSummary: "" });
      loadRfqWork();
    } catch (err) {
      setError(err.message || "Could not complete meeting.");
    }
  };

  const evaluateBid = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await procurementApi.bids.evaluate(token, evaluation.bidId, {
        technicalScore: toNumberOrNull(evaluation.technicalScore),
        financialScore: toNumberOrNull(evaluation.financialScore),
        totalScore: toNumberOrNull(evaluation.totalScore),
        technicalQualified: evaluation.technicalQualified,
        tecComment: evaluation.tecComment,
      });
      setMessage("Bid evaluation saved.");
      setEvaluation(initialBidEvaluation);
      loadRfqWork();
    } catch (err) {
      setError(err.message || "Could not evaluate bid.");
    }
  };

  const evaluateQuotation = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await procurementApi.quotations.evaluate(token, quotationEvaluation.quotationId, {
        technicallyQualified: quotationEvaluation.technicallyQualified,
        evaluationComment: quotationEvaluation.evaluationComment,
      });
      setMessage(quotationEvaluation.technicallyQualified ? "Quotation approved and added to approved list." : "Quotation rejected with comment.");
      setQuotationEvaluation({ quotationId: "", technicallyQualified: true, evaluationComment: "" });
      setSelectedQuotation(null);
      loadRfqWork();
    } catch (err) {
      setError(err.message || "Could not evaluate quotation.");
    }
  };

  const updateQuotationItemDecision = (itemId, patch) => {
    setQuotationItemDecisions((current) => ({
      ...current,
      [itemId]: {
        technicallyQualified: true,
        evaluationComment: "",
        completenessOfQuotation: "YES",
        substantialResponsiveness: "YES",
        acceptedForDetailedEvaluation: "YES",
        preliminaryRemark: "",
        departureRemark: "",
        rejectedAsNonresponsive: "NO",
        loadingSuggested: "",
        arithmeticErrors: "",
        discounts: "",
        additionsOmissions: "",
        ...(current[itemId] || {}),
        ...patch,
      },
    }));
  };

  const buildAiRecommendationComment = (aiSuggestion) => {
    if (!aiSuggestion) return "";
    return [
      `AI Recommendation: ${formatAiStatus(aiSuggestion.suggestedStatus)}`,
      `Reason: ${aiSuggestion.reason || "No reason provided."}`,
      `Evidence: ${aiSuggestion.evidence || "No matching vendor evidence found."}`,
      `Confidence: ${aiSuggestion.confidence || "LOW"}`,
    ].join("\n");
  };

  const buildBecEvaluationComment = (item, technicallyQualified) => {
    const decision = quotationItemDecisions[item.bidItemId] || {};
    const documentStatus = selectedQuotation?.documentReviewStatus || "NOT_REQUESTED";
    const vendorDocuments = parseVendorQuotationDocuments(selectedQuotation?.vendorQuotationDocuments);
    const vendorPackageSummary = vendorDocuments.length
      ? `${vendorDocuments.length} reusable vendor quotation document(s) reviewed.`
      : "No reusable vendor quotation document package found.";
    const clarificationSummary = documentStatus === "NOT_REQUESTED"
      ? "No clarification or additional document requested."
      : `Document request status: ${documentStatus}. Requested document: ${selectedQuotation?.requestedDocumentName || "Not recorded"}. Remark: ${selectedQuotation?.documentRequestNote || "Not recorded"}.`;

    return [
      "BEC Bid Evaluation Checks",
      "",
      "5.2 Preliminary Examination of Bids",
      `Completeness of Quotation Submission Form: ${decision.completenessOfQuotation || "YES"}`,
      `Substantial Responsiveness: ${decision.substantialResponsiveness || "YES"}`,
      `Accepted for detailed Evaluation: ${decision.acceptedForDetailedEvaluation || "YES"}`,
      `Document package: ${vendorPackageSummary}`,
      `Preliminary remark: ${decision.preliminaryRemark || "No preliminary remark."}`,
      "",
      "6.1 Clarifications sought from bidders",
      clarificationSummary,
      "",
      "7.1 Departures from Technical Specifications",
      `Item: ${item.requisitionItemName || item.requisitionItemId || "Quotation item"}`,
      `Requirement: ${item.requiredSpecification || "No RR specification linked."}`,
      `Offered: ${item.vendorSpecification || "No vendor specification submitted."}`,
      `Bid rejected as nonresponsive: ${decision.rejectedAsNonresponsive || (technicallyQualified ? "NO" : "YES")}`,
      `Loading suggested: ${decision.loadingSuggested || "None"}`,
      `Departure remark: ${decision.departureRemark || "No departure recorded."}`,
      "",
      "8.1 Evaluation of Responsive Bids",
      `Bid Price: ${formatMoney(item.quotedTotalPrice)}`,
      `Arithmetical errors (+/-): ${decision.arithmeticErrors || "None"}`,
      `Discounts: ${decision.discounts || "None"}`,
      `Additions / omissions: ${decision.additionsOmissions || "None"}`,
      `Quantity: ${item.quantity ?? "Not set"}`,
      `Evaluated bid price: ${formatMoney(item.quotedTotalPrice)}`,
      "",
      "BEC Final Comment",
      decision.evaluationComment || (technicallyQualified ? "Responsive item approved by BEC." : "Item rejected by BEC."),
    ].join("\n");
  };

  const evaluateQuotationItem = async (item, technicallyQualified) => {
    const itemId = item.bidItemId;
    const decision = quotationItemDecisions[itemId] || {};
    const documentStatus = selectedQuotation?.documentReviewStatus || "NOT_REQUESTED";
    if (technicallyQualified && (documentStatus === "REQUESTED" || documentStatus === "RESUBMITTED")) {
      setError(documentStatus === "REQUESTED"
        ? "Vendor has not submitted the requested document yet."
        : "Accept the vendor's resubmitted document before approving this quotation item.");
      return;
    }
    if (technicallyQualified && (
      decision.completenessOfQuotation === "NO"
      || decision.substantialResponsiveness === "NO"
      || decision.acceptedForDetailedEvaluation === "NO"
      || decision.rejectedAsNonresponsive === "YES"
    )) {
      setError("Preliminary/departure checks mark this bid as nonresponsive. Update the checks or reject the item with a comment.");
      return;
    }
    if (!technicallyQualified && !decision.evaluationComment?.trim()) {
      setError("Rejection comment is required for a quotation item.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await procurementApi.quotations.evaluateItem(token, itemId, {
        technicallyQualified,
        evaluationComment: buildBecEvaluationComment(item, technicallyQualified),
      });
      setMessage(technicallyQualified ? "Quotation item approved and added to its approved list." : "Quotation item rejected with comment.");
      setQuotationItemDecisions((current) => ({ ...current, [itemId]: { technicallyQualified: true, evaluationComment: "" } }));
      if (quotationReviewOnly && technicallyQualified) {
        navigate(becHeadPath("vendor-review"));
        return;
      }
      loadRfqWork();
    } catch (err) {
      setError(err.message || "Could not evaluate quotation item.");
    }
  };

  const updateQuotationDocumentRequest = (quotationId, field, value) => {
    setQuotationDocumentRequests((current) => ({
      ...current,
      [quotationId]: {
        requestedDocumentName: "",
        note: "",
        ...(current[quotationId] || {}),
        [field]: value,
      },
    }));
  };

  const requestQuotationDocument = async () => {
    if (!selectedQuotation?.quotationId) return;
    const form = quotationDocumentRequests[selectedQuotation.quotationId] || {};
    if (!form.requestedDocumentName?.trim()) {
      setError("Enter the missing document name before sending the vendor request.");
      return;
    }

    setError("");
    setMessage("");
    setQuotationDocumentLoadingId(String(selectedQuotation.quotationId));
    try {
      const updatedQuotation = await procurementApi.quotations.requestDocument(token, selectedQuotation.quotationId, {
        requestedDocumentName: form.requestedDocumentName.trim(),
        note: form.note?.trim() || "",
      });
      setSelectedQuotation(updatedQuotation);
      setQuotations((current) => current.map((quotation) =>
        String(quotation.quotationId) === String(updatedQuotation.quotationId) ? updatedQuotation : quotation
      ));
      setQuotationDocumentRequests((current) => ({ ...current, [selectedQuotation.quotationId]: { requestedDocumentName: "", note: "" } }));
      setMessage("Document request sent to vendor.");
    } catch (err) {
      setError(err.message || "Could not send the document request to vendor.");
    } finally {
      setQuotationDocumentLoadingId("");
    }
  };

  const acceptQuotationDocument = async () => {
    if (!selectedQuotation?.quotationId) return;

    setError("");
    setMessage("");
    setQuotationDocumentLoadingId(String(selectedQuotation.quotationId));
    try {
      const updatedQuotation = await procurementApi.quotations.acceptDocument(token, selectedQuotation.quotationId);
      setSelectedQuotation(updatedQuotation);
      setQuotations((current) => current.map((quotation) =>
        String(quotation.quotationId) === String(updatedQuotation.quotationId) ? updatedQuotation : quotation
      ));
      setMessage("Vendor resubmitted document accepted.");
    } catch (err) {
      setError(err.message || "Could not accept the vendor document.");
    } finally {
      setQuotationDocumentLoadingId("");
    }
  };

  const loadQuotationAiReview = async (quotation) => {
    if (!quotation?.quotationId) return;
    setError("");
    setMessage("");
    setAiLoadingQuotationId(String(quotation.quotationId));
    try {
      const review = await procurementApi.quotations.aiReview(token, quotation.quotationId);
      setAiReviewByQuotation((current) => ({
        ...current,
        [quotation.quotationId]: review,
      }));
      setQuotationItemDecisions((current) => {
        const next = { ...current };
        (review?.items || []).forEach((itemReview) => {
          const itemId = String(itemReview.quotationItemId);
          const currentDecision = next[itemId] || {};
          next[itemId] = {
            technicallyQualified: true,
            completenessOfQuotation: "YES",
            substantialResponsiveness: "YES",
            acceptedForDetailedEvaluation: "YES",
            preliminaryRemark: "",
            departureRemark: "",
            rejectedAsNonresponsive: "NO",
            loadingSuggested: "",
            arithmeticErrors: "",
            discounts: "",
            additionsOmissions: "",
            ...currentDecision,
            evaluationComment: currentDecision.evaluationComment || buildAiRecommendationComment(itemReview),
          };
        });
        return next;
      });
      setMessage("AI quotation review generated. Please confirm each item manually before approving.");
    } catch (err) {
      setError(err.message || "Could not generate AI quotation review.");
    } finally {
      setAiLoadingQuotationId("");
    }
  };

  const buildOfferLetterContent = (item) => `Offer Letter

RFQ: ${item.quotation?.rfqNumber || selectedRfq?.rfqNumber || selectedRfq?.rfqId || "Not set"}
Vendor: ${item.quotation?.vendorName || "Vendor"}
Requisition Item: ${item.requisitionItemName || "Selected item"}
Quantity: ${item.quantity || "Not set"}
Unit Price: ${formatMoney(item.quotedUnitPrice)}
Total Offer Amount: ${formatMoney(item.quotedTotalPrice)}

University Specification:
${item.requiredSpecification || "No specification recorded."}

Vendor Specification:
${item.vendorSpecification || "No vendor specification submitted."}

TEC Comment:
${item.tecComment || "Selected by TEC"}

This offer letter is issued for the selected quotation item listed above.`;

  const openOfferLetterDraft = (item) => {
    setOfferLetterDraft({
      item,
      comment: "Selected by TEC",
      content: buildOfferLetterContent(item),
    });
  };

  const decideApprovedQuotationItemVendor = async (item, selected, offerContent = "", commentOverride = "") => {
    const comment = selected
      ? commentOverride || "Selected by TEC"
      : window.prompt("Add a rejection comment for this vendor quotation item:");
    if (!selected && !comment?.trim()) {
      setError("Rejection comment is required when rejecting a vendor from the approved list.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await procurementApi.quotations.selectItemVendor(token, item.bidItemId, {
        selected,
        comment,
        offerLetterContent: selected ? offerContent : "",
      });
      setMessage(selected ? "Vendor selected for this item." : "Vendor rejected for this item.");
      setOfferLetterDraft(null);
      loadRfqWork();
    } catch (err) {
      setError(err.message || "Could not save vendor decision for this item.");
    }
  };

  const submitOfferLetterDraft = async (event) => {
    event.preventDefault();
    if (!offerLetterDraft?.item) return;
    await decideApprovedQuotationItemVendor(
      offerLetterDraft.item,
      true,
      offerLetterDraft.content,
      offerLetterDraft.comment
    );
  };

  const openQuotationDetails = (quotation) => {
    setSelectedQuotation(quotation);
    setQuotationItemDecisions(
      (quotation.items || []).reduce((state, item) => ({
        ...state,
        [item.bidItemId]: {
          technicallyQualified: item.technicalStatus === "APPROVED" || Boolean(item.technicallyCompliant),
          evaluationComment: item.tecComment || "",
          completenessOfQuotation: "YES",
          substantialResponsiveness: "YES",
          acceptedForDetailedEvaluation: "YES",
          preliminaryRemark: "",
          departureRemark: "",
          rejectedAsNonresponsive: item.technicalStatus === "REJECTED" ? "YES" : "NO",
          loadingSuggested: "",
          arithmeticErrors: "",
          discounts: "",
          additionsOmissions: "",
        },
      }), {})
    );
    setQuotationEvaluation({
      quotationId: quotation.quotationId,
      technicallyQualified: quotation.technicallyQualified || quotation.status === "TECHNICALLY_QUALIFIED",
      evaluationComment: quotation.evaluationComment || "",
    });
  };

  const sendQuotationToRelevantBec = async (quotation) => {
    const quotationKey = String(quotation.quotationId);
    const existingItems = quotation.items || [];
    const alreadyAssigned = sentQuotationIds.has(quotationKey) || (existingItems.length > 0 && existingItems.every((item) =>
      item.assignmentStatus || item.becAssignmentStatus || item.assignedBecUserId || item.becUserId
    ));
    if (alreadyAssigned) {
      toast.info("Already sent to the relevant BEC member.", { autoClose: 4000 });
      return;
    }
    const items = quotation.items || [];
    if (!items.length) {
      setError("This quotation has no items to assign.");
      return;
    }
    let assignments = {};
    try {
      const savedAssignments = await procurementApi.becCategoryAssignments.list(token);
      assignments = getArray(savedAssignments).reduce((state, assignment) => ({
        ...state,
        [assignment.category]: {
          becUserId: assignment.becUserId,
          becName: assignment.becName,
        },
      }), {});
    } catch (err) {
      setError(err.message || "Could not load BEC category assignments.");
      return;
    }
    const missingCategories = [];
    const payloads = items.map((item) => {
      const category = item.itemCategory || quotation.rfqVendorCategory || quotation.vendorCategory || rfqContext(selectedRfq) || "General";
      const assignment = assignments[category];
      if (!assignment?.becUserId) {
        missingCategories.push(category);
        return null;
      }
      return { item, category, becUserId: assignment.becUserId };
    }).filter(Boolean);

    if (missingCategories.length) {
      setError(`No BEC member assigned for category: ${[...new Set(missingCategories)].join(", ")}. Use BEC Category Assignment first.`);
      return;
    }

    setError("");
    setMessage("");
    try {
      await Promise.all(payloads.map(({ item, category, becUserId }) =>
        procurementApi.quotations.assignToBec(token, item.bidItemId, { becUserId, category })
      ));
      setSentQuotationIds((current) => new Set(current).add(quotationKey));
      await loadRfqWork();
      setMessage("Quotation sent to the relevant BEC member for assigned category review.");
      toast.success("Quotation sent to the relevant BEC member for assigned category review.", { autoClose: 4500 });
    } catch (err) {
      setError(err.message || "Could not send quotation to relevant BEC member.");
      toast.error(err.message || "Could not send quotation to relevant BEC member.", { autoClose: 5000 });
    }
  };

  const recommendBid = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await procurementApi.rfqs.recommend(token, recommendation.rfqId, recommendation.bidId);
      setMessage("Bid recommended as winning offer.");
      setRecommendation({ rfqId: "", bidId: "" });
    } catch (err) {
      setError(err.message || "Could not recommend bid.");
    }
  };

  const resolveObjection = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await procurementApi.objections.resolve(token, objectionDecision.objectionId, {
        status: objectionDecision.status,
        resolutionComment: objectionDecision.resolutionComment,
      });
      setMessage("Objection updated.");
      setObjectionDecision({ objectionId: "", status: "RESOLVED", resolutionComment: "" });
      loadRfqWork();
    } catch (err) {
      setError(err.message || "Could not resolve objection.");
    }
  };

  const createOffer = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await procurementApi.offers.create(token, offer.rfqId, {
        bidId: Number(offer.bidId),
        letterNumber: offer.letterNumber,
        letterDocumentUrl: offer.letterDocumentUrl,
      });
      setMessage("Offer letter created.");
      setOffer(initialOffer);
    } catch (err) {
      setError(err.message || "Could not create offer letter.");
    }
  };

  return (
    <div className="space-y-6">
      {!quotationReviewOnly && <section className="rounded-2xl border border-[#dce8ef] bg-white p-4 shadow-[0_12px_30px_rgba(15,41,64,0.06)]">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Tender Evaluation</div>
        <h2 className="mt-1 text-xl font-black text-[#10283f]">Choose RFQ and evaluation step</h2>
          <form onSubmit={loadRfqWork} className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
            <SelectField
              value={rfqLookup}
              onChange={(e) => selectLoadedRfq(e.target.value)}
              options={loadedRfqOptions}
              placeholder="Select RFQ"
            />
            <button className={buttonClass} type="submit">Load Tender Data</button>
          </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                activeSection === section.id ? "bg-[#166e8c] text-white" : "bg-[#edf7fb] text-[#166e8c] hover:bg-[#d9edf5]"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </section>}

      {activeSection === "specs" && (
        <ActionCard eyebrow="Specifications" title="Add Tender Specification">
          <form onSubmit={createSpec} className="space-y-4">
            <Field label="RFQ">
              <SelectField value={spec.rfqId} onChange={(e) => setSpec((c) => ({ ...c, rfqId: e.target.value }))} options={loadedRfqOptions} placeholder="Load RFQ first" required />
            </Field>
            <Field label="Specification Title"><input className={inputClass} name="specTitle" value={spec.specTitle} onChange={update(setSpec)} required /></Field>
            <Field label="Specification Description"><textarea className={inputClass} rows={3} name="specDescription" value={spec.specDescription} onChange={update(setSpec)} /></Field>
            <Field label="Specification Document URL"><input className={inputClass} name="documentUrl" value={spec.documentUrl} onChange={update(setSpec)} required /></Field>
            <button className={buttonClass} type="submit">Save Specification</button>
          </form>
        </ActionCard>
      )}

      {activeSection === "meeting" && (
        <div className="grid gap-6">
          <ActionCard eyebrow="Optional Meeting" title="Schedule Pre-Bid Meeting">
            <form onSubmit={scheduleMeeting} className="space-y-4">
              {requestedMeetingRfqId && (
                <div className="rounded-[24px] border border-[#dce8ef] bg-[#fbfdff] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Requested Meeting</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <DetailTile label="Requested Vendor" value={requestedMeetingVendorName || (requestedMeetingVendorId ? `Vendor ID ${requestedMeetingVendorId}` : "Not linked")} />
                    <DetailTile label="RFQ" value={selectedRfq ? `${selectedRfq.rfqNumber || `RFQ ${selectedRfq.rfqId}`} - ${selectedRfq.title || "Untitled"}` : `RFQ ID ${requestedMeetingRfqId}`} />
                  </div>
                </div>
              )}
              <Field label="RFQ">
                <SelectField value={meeting.rfqId} onChange={(e) => setMeeting((c) => ({ ...c, rfqId: e.target.value }))} options={loadedRfqOptions} placeholder="Load RFQ first" required />
              </Field>
              <label className="flex items-center gap-3 text-sm font-bold text-[#10283f]">
                <input type="checkbox" name="meetingRequired" checked={meeting.meetingRequired} onChange={update(setMeeting)} />
                Meeting required
              </label>
              <Field label="Meeting Date and Time"><input className={inputClass} type="datetime-local" name="meetingDateTime" value={meeting.meetingDateTime} onChange={update(setMeeting)} /></Field>
              <Field label="Meeting Link or Location"><input className={inputClass} name="meetingLinkOrLocation" value={meeting.meetingLinkOrLocation} onChange={update(setMeeting)} /></Field>
              <Field label="Agenda"><textarea className={inputClass} rows={3} name="agenda" value={meeting.agenda} onChange={update(setMeeting)} /></Field>
              <button className={buttonClass} type="submit">Schedule Meeting</button>
            </form>
          </ActionCard>
        </div>
      )}

      {activeSection === "bids" && (
        <ActionCard eyebrow="Sealed Bids" title="Evaluate Bids After Opening Time">
          <DataTable
            rows={bids}
            empty="Load an RFQ to see bids. Bids are visible only after the backend opening time allows it."
            columns={[
              { key: "bidId", label: "Bid ID" },
              { key: "vendorName", label: "Vendor" },
              { key: "bidAmount", label: "Amount", render: (row) => formatMoney(row.bidAmount) },
              { key: "technicalQualified", label: "Qualified", render: (row) => String(row.technicalQualified ?? "Pending") },
            ]}
          />
          <form onSubmit={evaluateBid} className="grid gap-4 md:grid-cols-2">
            <Field label="Bid">
              <SelectField value={evaluation.bidId} onChange={(e) => setEvaluation((c) => ({ ...c, bidId: e.target.value }))} options={bidOptions} placeholder="Select loaded bid" required />
            </Field>
            <Field label="Technical Score"><input className={inputClass} name="technicalScore" value={evaluation.technicalScore} onChange={update(setEvaluation)} /></Field>
            <Field label="Financial Score"><input className={inputClass} name="financialScore" value={evaluation.financialScore} onChange={update(setEvaluation)} /></Field>
            <Field label="Total Score"><input className={inputClass} name="totalScore" value={evaluation.totalScore} onChange={update(setEvaluation)} /></Field>
            <label className="flex items-center gap-3 text-sm font-bold text-[#10283f]">
              <input type="checkbox" name="technicalQualified" checked={evaluation.technicalQualified} onChange={update(setEvaluation)} />
              Technically qualified
            </label>
            <Field label="TEC Comment"><textarea className={inputClass} rows={2} name="tecComment" value={evaluation.tecComment} onChange={update(setEvaluation)} /></Field>
            <button className={`${buttonClass} md:col-span-2`} type="submit">Save Evaluation</button>
          </form>
        </ActionCard>
      )}

      {activeSection === "quotations" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#dce8ef] bg-white p-4 shadow-[0_12px_30px_rgba(15,41,64,0.06)]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Published RFQ</div>
            <form onSubmit={loadRfqWork} className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <SelectField value={rfqLookup} onChange={(e) => selectLoadedRfq(e.target.value)} options={publishedRfqOptions} placeholder="Select published RFQ" required />
              <button className={`${buttonClass} self-end`} type="submit">Show Quotations</button>
            </form>
          </section>

        <div ref={quotationResultsRef} className={`scroll-mt-24 ${quotationReviewOnly && !quotationResultsVisible ? "hidden" : ""}`}>
        <ActionCard eyebrow={quotationReviewOnly ? "Submitted Quotations" : "RFQ Quotations"} title={quotationReviewOnly ? (selectedRfq ? rfqDisplayName(selectedRfq) : "Vendor Quotations") : "Check and Evaluate Vendor Quotations"}>
          {!quotationReviewOnly && <div className="mb-4 rounded-xl border border-[#dce8ef] bg-[#f8fcff] p-3">
            <input value={rfqSearch} onChange={(event) => setRfqSearch(event.target.value)} placeholder="Search RFQ number, title or category" className="w-full rounded-xl border border-[#d3e3eb] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#166e8c]" />
          </div>}
          {!quotationReviewOnly && <DataTable
            rows={quotationReviewOnly ? publishedRfqRows : publishedRfqs}
            empty="No published RFQs available for quotation checking."
            columns={[
              { key: "title", label: "Quotation Request", render: (row) => rfqDisplayName(row) },
              { key: "category", label: "Context", render: (row) => rfqContext(row) || "Not recorded" },
              { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
              { key: "bidOpeningDateTime", label: "Closing Time", render: (row) => formatDateTime(row.submissionDeadline || row.bidOpeningDateTime) },
            ]}
          />}
          {selectedRfq && (
            <div className={`rounded-[24px] p-4 text-sm font-semibold ${isSelectedRfqOpen ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {isSelectedRfqOpen
                ? `${rfqDisplayName(selectedRfq)} is open for quotation evaluation.`
                : `${rfqDisplayName(selectedRfq)} quotations are sealed until ${formatDateTime(selectedOpeningTime)}.`}
            </div>
          )}
          <DataTable
            rows={quotations}
            compact
            empty="Select an RFQ and click Show Quotations to see submitted quotations."
            columns={[
              { key: "quotationId", label: "Quotation ID" },
              { key: "vendorName", label: "Vendor", render: (row) => (row.sealed ? "Sealed until closing" : row.vendorName || "Vendor") },
              { key: "quotedAmount", label: "Amount", render: (row) => (row.sealed ? "Sealed" : formatMoney(row.quotedAmount)) },
              { key: "deliveryPeriodDays", label: "Delivery Days", render: (row) => (row.sealed ? "Sealed" : row.deliveryPeriodDays ?? "Not set") },
              { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
              { key: "documentReviewStatus", label: "Docs", render: (row) => (row.sealed ? "Locked" : <StatusPill status={row.documentReviewStatus || "NOT_REQUESTED"} />) },
              { key: "openingDateTime", label: "Closing Time", render: (row) => formatDateTime(row.openingDateTime || selectedOpeningTime) },
              { key: "technicallyQualified", label: "Qualified", render: (row) => (row.sealed ? "Locked" : row.technicallyQualified ? "Yes" : "No") },
              {
                key: "actions",
                label: "Details",
                render: (row) => {
                  if (row.sealed) return "Locked";
                  const sent = quotationReviewOnly && (
                    sentQuotationIds.has(String(row.quotationId)) ||
                    ((row.items || []).length > 0 && (row.items || []).every((item) => item.assignmentStatus || item.becAssignmentStatus || item.assignedBecUserId || item.becUserId))
                  );
                  return (
                    <button
                      className={`rounded-xl px-3 py-2 text-xs font-bold ${sent ? "cursor-not-allowed bg-slate-100 text-slate-500" : "bg-[#edf7fb] text-[#166e8c] hover:bg-[#d9edf5]"}`}
                      type="button"
                      aria-disabled={sent}
                      onClick={() => quotationReviewOnly ? sendQuotationToRelevantBec(row) : openQuotationDetails(row)}
                    >
                      {quotationReviewOnly ? (sent ? "Sent" : "Send to relevant BEC") : "View Details"}
                    </button>
                  );
                },
              },
            ]}
          />
          {quotationsAreSealed && (
            <EmptyState text={`Quotation details are locked. ${reviewerLabel} can open and evaluate these quotations only after the bid closing time.`} />
          )}
          {selectedQuotation ? (
            <div className="rounded-[28px] border border-[#dce8ef] bg-[#fbfdff] p-5">
              {(() => {
                const aiReview = aiReviewByQuotation[selectedQuotation.quotationId];
                const aiItems = Object.fromEntries((aiReview?.items || []).map((item) => [String(item.quotationItemId), item]));
                const documentStatus = selectedQuotation.documentReviewStatus || "NOT_REQUESTED";
                const documentRequestForm = quotationDocumentRequests[selectedQuotation.quotationId] || {};
                const documentActionLoading = quotationDocumentLoadingId === String(selectedQuotation.quotationId);
                const vendorQuotationDocuments = parseVendorQuotationDocuments(selectedQuotation.vendorQuotationDocuments);
                const selectedItems = selectedQuotation.items || [];
                const responsiveBidRows = [...quotations]
                  .filter((quotation) => !quotation.sealed)
                  .sort((a, b) => Number(a.quotedAmount || Infinity) - Number(b.quotedAmount || Infinity));
                return (
                  <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Quotation Details</div>
                  <h3 className="mt-2 text-xl font-black text-[#10283f]">
                    {selectedQuotation.vendorName || "Vendor"} - {formatMoney(selectedQuotation.quotedAmount)}
                  </h3>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    Delivery: {selectedQuotation.deliveryPeriodDays ?? "Not set"} days | Submitted: {formatDateTime(selectedQuotation.submittedAt)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill status={selectedQuotation.status} />
                  <button
                    className="rounded-2xl bg-[#166e8c] px-4 py-2 text-sm font-bold text-white hover:bg-[#145f79] disabled:opacity-60"
                    type="button"
                    onClick={() => loadQuotationAiReview(selectedQuotation)}
                    disabled={aiLoadingQuotationId === String(selectedQuotation.quotationId)}
                  >
                    {aiLoadingQuotationId === String(selectedQuotation.quotationId) ? "Running AI Review..." : "Run AI Review"}
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-[#dce8ef] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Vendor Submitted Documents</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusPill status={documentStatus} />
                      {selectedQuotation.documentRequestedAt ? (
                        <span className="text-xs font-semibold text-slate-500">Requested {formatDateTime(selectedQuotation.documentRequestedAt)}</span>
                      ) : null}
                    </div>
                  </div>
                  {selectedQuotation.attachmentUrl ? (
                    <a className="rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]" href={selectedQuotation.attachmentUrl} target="_blank" rel="noreferrer">
                      Open quotation document
                    </a>
                  ) : (
                    <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">No main document</span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {vendorQuotationDocuments.map((document) => (
                    <div key={`${document.label}-${document.fileName}`} className="rounded-2xl bg-[#f8fcff] p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Vendor Required Document</div>
                      <div className="mt-2 text-sm font-black text-[#10283f]">{document.label}</div>
                      <a className="mt-2 inline-block text-sm font-bold text-[#166e8c]" href={document.url} target="_blank" rel="noreferrer">
                        Open {document.fileName}
                      </a>
                    </div>
                  ))}
                  {(selectedQuotation.items || []).map((item) => (
                    <div key={`doc-${item.bidItemId || item.requisitionItemId}`} className="rounded-2xl bg-[#f8fcff] p-4">
                      <div className="text-sm font-black text-[#10283f]">{item.requisitionItemName || `Item ${item.requisitionItemId}`}</div>
                      {item.specificationDocumentUrl ? (
                        <a className="mt-2 inline-block text-sm font-bold text-[#166e8c]" href={item.specificationDocumentUrl} target="_blank" rel="noreferrer">
                          Open vendor spec document
                        </a>
                      ) : (
                        <div className="mt-2 text-sm font-semibold text-slate-500">No vendor spec document submitted</div>
                      )}
                    </div>
                  ))}
                  {!vendorQuotationDocuments.length && !(selectedQuotation.items || []).some((item) => item.specificationDocumentUrl) ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                      No vendor document package or item documents are available.
                    </div>
                  ) : null}
                </div>

                {documentStatus === "REQUESTED" ? (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Waiting for vendor to resubmit: {selectedQuotation.requestedDocumentName || "requested document"}
                    {selectedQuotation.documentRequestNote ? <div className="mt-2 font-normal">{selectedQuotation.documentRequestNote}</div> : null}
                  </div>
                ) : null}

                {(documentStatus === "RESUBMITTED" || documentStatus === "ACCEPTED") ? (
                  <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
                    <div className="font-black text-[#10283f]">{selectedQuotation.requestedDocumentFileName || selectedQuotation.requestedDocumentName || "Resubmitted document"}</div>
                    <div className="mt-1">Submitted {formatDateTime(selectedQuotation.documentSubmittedAt)}</div>
                    {selectedQuotation.requestedDocumentUrl ? (
                      <a className="mt-3 inline-block font-black text-[#166e8c]" href={selectedQuotation.requestedDocumentUrl} target="_blank" rel="noreferrer">
                        Open resubmitted document
                      </a>
                    ) : null}
                    {documentStatus === "RESUBMITTED" ? (
                      <button
                        type="button"
                        onClick={acceptQuotationDocument}
                        disabled={documentActionLoading}
                        className="mt-3 block rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {documentActionLoading ? "Accepting..." : "Accept Resubmitted Document"}
                      </button>
                    ) : null}
                  </div>
                ) : null}

              </div>

              <div className="mt-5 rounded-[24px] border border-[#dce8ef] bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Preliminary Examination of Bids</div>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#dce8ef] text-left text-sm">
                    <thead className="bg-[#edf7fb] text-xs font-black uppercase tracking-[0.12em] text-[#166e8c]">
                      <tr>
                        <th className="px-3 py-3">Bidder No</th>
                        <th className="px-3 py-3">Name</th>
                        <th className="px-3 py-3">Completeness of Quotation Submission form</th>
                        <th className="px-3 py-3">Substantial Responsiveness</th>
                        <th className="px-3 py-3">Accepted for detailed Evaluation</th>
                        <th className="px-3 py-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8f0f5]">
                      {selectedItems.map((item, index) => {
                        const decision = quotationItemDecisions[item.bidItemId] || {};
                        return (
                          <tr key={`preliminary-${item.bidItemId || item.requisitionItemId}`} className="bg-white">
                            <td className="px-3 py-3 font-bold text-[#10283f]">{String(index + 1).padStart(2, "0")}</td>
                            <td className="px-3 py-3 font-bold text-[#10283f]">{selectedQuotation.vendorName || "Vendor"}</td>
                            <td className="px-3 py-3">
                              <select className={inputClass} value={decision.completenessOfQuotation || "YES"} onChange={(e) => updateQuotationItemDecision(item.bidItemId, { completenessOfQuotation: e.target.value })}>
                                <option value="YES">YES</option>
                                <option value="NO">NO</option>
                              </select>
                            </td>
                            <td className="px-3 py-3">
                              <select className={inputClass} value={decision.substantialResponsiveness || "YES"} onChange={(e) => updateQuotationItemDecision(item.bidItemId, { substantialResponsiveness: e.target.value })}>
                                <option value="YES">YES</option>
                                <option value="NO">NO</option>
                              </select>
                            </td>
                            <td className="px-3 py-3">
                              <select className={inputClass} value={decision.acceptedForDetailedEvaluation || "YES"} onChange={(e) => updateQuotationItemDecision(item.bidItemId, { acceptedForDetailedEvaluation: e.target.value })}>
                                <option value="YES">YES</option>
                                <option value="NO">NO</option>
                              </select>
                            </td>
                            <td className="min-w-[260px] px-3 py-3">
                              <input className={inputClass} value={decision.preliminaryRemark || ""} onChange={(e) => updateQuotationItemDecision(item.bidItemId, { preliminaryRemark: e.target.value })} placeholder="Preliminary remark" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-[#dce8ef] bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Clarifications sought from bidders</div>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#dce8ef] text-left text-sm">
                    <thead className="bg-[#edf7fb] text-xs font-black uppercase tracking-[0.12em] text-[#166e8c]">
                      <tr>
                        <th className="px-3 py-3">Bidder</th>
                        <th className="px-3 py-3">Nature of Clarification</th>
                        <th className="px-3 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8f0f5]">
                      <tr className="bg-white">
                        <td className="px-3 py-3 font-bold text-[#10283f]">{selectedQuotation.vendorName || "Vendor"}</td>
                        <td className="min-w-[420px] px-3 py-3">
                          {documentStatus === "REQUESTED" ? (
                            <div className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                              Waiting for vendor: {selectedQuotation.requestedDocumentName || "requested document"}
                              {selectedQuotation.documentRequestNote ? <div className="mt-1 font-normal">{selectedQuotation.documentRequestNote}</div> : null}
                            </div>
                          ) : (
                            <div className="grid gap-2 md:grid-cols-2">
                              <input className={inputClass} value={documentRequestForm.requestedDocumentName || ""} onChange={(event) => updateQuotationDocumentRequest(selectedQuotation.quotationId, "requestedDocumentName", event.target.value)} placeholder="Missing document name" />
                              <input className={inputClass} value={documentRequestForm.note || ""} onChange={(event) => updateQuotationDocumentRequest(selectedQuotation.quotationId, "note", event.target.value)} placeholder="Remark to vendor" />
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {documentStatus === "RESUBMITTED" ? (
                            <button type="button" onClick={acceptQuotationDocument} disabled={documentActionLoading} className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                              {documentActionLoading ? "Accepting..." : "Accept Document"}
                            </button>
                          ) : documentStatus === "REQUESTED" ? (
                            <StatusPill status="REQUESTED" />
                          ) : (
                            <button type="button" onClick={requestQuotationDocument} disabled={documentActionLoading} className="rounded-2xl bg-[#10283f] px-4 py-2 text-xs font-bold text-white hover:bg-[#1c405f] disabled:opacity-60">
                              {documentActionLoading ? "Sending..." : "Send Request"}
                            </button>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-[#dce8ef] bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Departures from Technical Specifications</div>
                <div className="mt-3 overflow-hidden rounded-2xl border border-[#bfd5e1]">
                  <table className="w-full table-fixed border-collapse text-left text-sm">
                    <thead className="bg-[#edf7fb] text-xs font-black uppercase tracking-[0.12em] text-[#166e8c]">
                      <tr>
                        <th className="w-[7%] border border-[#bfd5e1] px-3 py-3">Bidder No</th>
                        <th className="w-[11%] border border-[#bfd5e1] px-3 py-3">Name</th>
                        <th className="w-[13%] border border-[#bfd5e1] px-3 py-3">Item Descriptions</th>
                        <th className="w-[27%] border border-[#bfd5e1] px-3 py-3">Requirement</th>
                        <th className="w-[24%] border border-[#bfd5e1] px-3 py-3">Offered</th>
                        <th className="w-[9%] border border-[#bfd5e1] px-3 py-3 text-center">Rejected?</th>
                        <th className="w-[9%] border border-[#bfd5e1] px-3 py-3 text-center">Loading</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((item, index) => {
                        const decision = quotationItemDecisions[item.bidItemId] || {};
                        return (
                          <tr key={`departures-${item.bidItemId || item.requisitionItemId}`} className="bg-white">
                            <td className="break-words border border-[#d6e4ec] px-3 py-3 align-top font-bold text-[#10283f]">{String(index + 1).padStart(2, "0")}</td>
                            <td className="break-words border border-[#d6e4ec] px-3 py-3 align-top font-bold text-[#10283f]">{selectedQuotation.vendorName || "Vendor"}</td>
                            <td className="break-words border border-[#d6e4ec] px-3 py-3 align-top text-slate-700">{item.requisitionItemName || `Item ${item.requisitionItemId}`}</td>
                            <td className="border border-[#d6e4ec] px-3 py-3 align-top text-slate-700">
                              <DepartureRequirementCell specificationText={item.vendorSpecification} fallback={item.requiredSpecification} />
                            </td>
                            <td className="border border-[#d6e4ec] px-3 py-3 align-top text-slate-700">
                              <DepartureOfferedCell specificationText={item.vendorSpecification} />
                              <textarea className={`${inputClass} mt-2 min-h-[72px] text-xs`} value={decision.departureRemark || ""} onChange={(e) => updateQuotationItemDecision(item.bidItemId, { departureRemark: e.target.value })} placeholder="Departure remark" />
                            </td>
                            <td className="border border-[#d6e4ec] px-3 py-3 align-top">
                              <div className="flex min-h-[92px] flex-col items-stretch justify-start gap-2">
                                <span className="text-center text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">Yes / No</span>
                                <select className={`${inputClass} px-2 text-center text-xs font-black`} value={decision.rejectedAsNonresponsive || "NO"} onChange={(e) => updateQuotationItemDecision(item.bidItemId, { rejectedAsNonresponsive: e.target.value })}>
                                  <option value="NO">NO</option>
                                  <option value="YES">YES</option>
                                </select>
                              </div>
                            </td>
                            <td className="border border-[#d6e4ec] px-3 py-3 align-top">
                              <div className="flex min-h-[92px] flex-col items-stretch justify-start gap-2">
                                <span className="text-center text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">Suggested</span>
                                <textarea className={`${inputClass} min-h-[58px] resize-none px-2 text-xs`} value={decision.loadingSuggested || ""} onChange={(e) => updateQuotationItemDecision(item.bidItemId, { loadingSuggested: e.target.value })} placeholder="None" />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-[#dce8ef] bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Evaluation of Responsive Bids</div>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#dce8ef] text-left text-sm">
                    <thead className="bg-[#edf7fb] text-xs font-black uppercase tracking-[0.12em] text-[#166e8c]">
                      <tr>
                        <th className="px-3 py-3">Bidder No</th>
                        <th className="px-3 py-3">Name</th>
                        <th className="px-3 py-3 text-right">Bid Price</th>
                        <th className="px-3 py-3">Arithmetical errors (+/-)</th>
                        <th className="px-3 py-3">Discounts</th>
                        <th className="px-3 py-3">Additions / omissions</th>
                        <th className="px-3 py-3 text-center">Qty</th>
                        <th className="px-3 py-3 text-right">Evaluated Price</th>
                        <th className="px-3 py-3 text-center">Rank</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8f0f5]">
                      {responsiveBidRows.map((quotation, index) => {
                        const isSelectedResponsiveBid = String(quotation.quotationId) === String(selectedQuotation.quotationId);
                        const firstItem = selectedItems[0];
                        const decision = quotationItemDecisions[firstItem?.bidItemId] || {};
                        return (
                          <tr key={`responsive-${quotation.quotationId}`} className={isSelectedResponsiveBid ? "bg-emerald-50" : "bg-white"}>
                            <td className="px-3 py-3 font-bold text-[#10283f]">{String(index + 1).padStart(2, "0")}</td>
                            <td className="px-3 py-3 font-bold text-[#10283f]">{quotation.vendorName || "Vendor"}</td>
                            <td className="px-3 py-3 text-right font-semibold text-slate-700">{formatMoney(quotation.quotedAmount)}</td>
                            <td className="min-w-[170px] px-3 py-3">
                              {isSelectedResponsiveBid && firstItem ? (
                                <input className={inputClass} value={decision.arithmeticErrors || ""} onChange={(e) => updateQuotationItemDecision(firstItem.bidItemId, { arithmeticErrors: e.target.value })} placeholder="None" />
                              ) : "-"}
                            </td>
                            <td className="min-w-[150px] px-3 py-3">
                              {isSelectedResponsiveBid && firstItem ? (
                                <input className={inputClass} value={decision.discounts || ""} onChange={(e) => updateQuotationItemDecision(firstItem.bidItemId, { discounts: e.target.value })} placeholder="None" />
                              ) : "-"}
                            </td>
                            <td className="min-w-[170px] px-3 py-3">
                              {isSelectedResponsiveBid && firstItem ? (
                                <input className={inputClass} value={decision.additionsOmissions || ""} onChange={(e) => updateQuotationItemDecision(firstItem.bidItemId, { additionsOmissions: e.target.value })} placeholder="None" />
                              ) : "-"}
                            </td>
                            <td className="px-3 py-3 text-center font-semibold text-slate-700">{isSelectedResponsiveBid ? selectedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || "-" : "-"}</td>
                            <td className="px-3 py-3 text-right font-black text-[#10283f]">{formatMoney(quotation.quotedAmount)}</td>
                            <td className="px-3 py-3 text-center font-black text-[#166e8c]">{index + 1}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {aiReview && (
                <div className="mt-5 rounded-[24px] border border-[#dce8ef] bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Gemini Suggestion</div>
                      <div className="mt-2 text-lg font-black text-[#10283f]">{aiReview.summary || "AI review completed."}</div>
                    </div>
                    <div className={`rounded-full px-3 py-2 text-xs font-bold ${aiStatusTone[aiReview.overallStatus] || aiStatusTone.NOT_MENTIONED}`}>
                      {formatAiStatus(aiReview.overallStatus)}
                    </div>
                  </div>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Model {aiReview.model || "Gemini"} | Reviewed {formatDateTime(aiReview.reviewedAt)}
                  </div>
                </div>
              )}

              <div className="mt-5 space-y-4">
                {(selectedQuotation.items || []).map((item) => (
                  <div key={item.bidItemId || item.requisitionItemId} className="rounded-[24px] border border-[#e0ebf1] bg-white p-4">
                    {(() => {
                      const itemApproved = item.technicalStatus === "APPROVED" || item.technicallyCompliant;
                      const aiSuggestion = aiItems[String(item.bidItemId)];
                      return (
                        <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-black text-[#10283f]">{item.requisitionItemName || `Item ${item.requisitionItemId}`}</div>
                      <div className="text-sm font-bold text-[#166e8c]">{formatMoney(item.quotedTotalPrice)}</div>
                    </div>
                    <div className="mt-4 grid gap-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">University / RR Specification</div>
                        <div className="mt-2 text-sm leading-7 text-slate-700">{item.requiredSpecification || "No RR specification linked to this item."}</div>
                        {item.requiredSpecificationDocumentUrl && (
                          <a className="mt-3 inline-block text-sm font-bold text-[#166e8c]" href={item.requiredSpecificationDocumentUrl} target="_blank" rel="noreferrer">Open university spec document</a>
                        )}
                      </div>
                      <div className="rounded-2xl bg-[#edf7fb] p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Vendor Specification</div>
                        <VendorSpecificationTable specificationText={item.vendorSpecification} />
                        {item.specificationDocumentUrl && (
                          <a className="mt-3 inline-block text-sm font-bold text-[#166e8c]" href={item.specificationDocumentUrl} target="_blank" rel="noreferrer">Open vendor spec document</a>
                        )}
                      </div>
                    </div>
                    {aiSuggestion && (
                      <div className="mt-4 rounded-2xl border border-[#dce8ef] bg-[#f8fcff] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">AI Suggestion</div>
                          <div className={`rounded-full px-3 py-1 text-xs font-bold ${aiStatusTone[aiSuggestion.suggestedStatus] || aiStatusTone.NOT_MENTIONED}`}>
                            {formatAiStatus(aiSuggestion.suggestedStatus)}
                          </div>
                          <div className={`rounded-full px-3 py-1 text-xs font-bold ${aiConfidenceTone[aiSuggestion.confidence] || aiConfidenceTone.LOW}`}>
                            {aiSuggestion.confidence || "LOW"} confidence
                          </div>
                        </div>
                        <div className="mt-3 text-sm leading-7 text-slate-700">
                          <span className="font-bold text-[#10283f]">Reason:</span> {aiSuggestion.reason || "No reason provided."}
                        </div>
                        <div className="mt-2 text-sm leading-7 text-slate-700">
                          <span className="font-bold text-[#10283f]">Evidence:</span> {aiSuggestion.evidence || "No matching vendor evidence found."}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateQuotationItemDecision(item.bidItemId, { evaluationComment: buildAiRecommendationComment(aiSuggestion) })}
                          className="mt-3 rounded-2xl bg-[#10283f] px-4 py-2 text-xs font-bold text-white hover:bg-[#1c405f]"
                        >
                          Use AI recommendation in comment
                        </button>
                      </div>
                    )}
                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Qty {item.quantity ?? "Not set"} | Unit price {formatMoney(item.quotedUnitPrice)}
                    </div>
                    <div className="mt-4 rounded-2xl border border-[#dce8ef] bg-[#fbfdff] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Item Technical Decision</div>
                          <div className="mt-2 flex items-center gap-2 text-sm font-bold text-[#10283f]">
                            Current status <StatusPill status={item.technicalStatus || "PENDING"} />
                          </div>
                        </div>
                      </div>
                      {item.tecComment && (
                        <div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm leading-6 text-slate-700">
                          {reviewerLabel} comment: {item.tecComment}
                        </div>
                      )}
                      {itemApproved ? (
                        <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                          This item is already approved.
                        </div>
                      ) : (
                        <>
                          <Field label="Item Comment">
                            <textarea
                              className={inputClass}
                              rows={5}
                              value={quotationItemDecisions[item.bidItemId]?.evaluationComment || ""}
                              onChange={(e) => updateQuotationItemDecision(item.bidItemId, { evaluationComment: e.target.value })}
                              placeholder="Add the vendor-facing rejection note. AI recommendation can be inserted and edited here."
                            />
                          </Field>
                          <div className="mt-3 flex flex-wrap gap-3">
                            <button
                              className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                              type="button"
                              onClick={() => evaluateQuotationItem(item, true)}
                            >
                              Approve Item
                            </button>
                            <button
                              className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
                              type="button"
                              onClick={() => evaluateQuotationItem(item, false)}
                            >
                              Reject Item
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200" type="button" onClick={() => setSelectedQuotation(null)}>
                  Close Details
                </button>
              </div>
                  </>
                );
              })()}
            </div>
          ) : !quotationsAreSealed ? (
            <EmptyState text={quotationReviewOnly ? "Click Send to relevant BEC to route quotation items to assigned BEC members for category review." : "Click View Details on a quotation to compare RR specifications with vendor specifications and approve or reject each item separately."} />
          ) : null}

          {!quotationReviewOnly && <div className="rounded-[28px] border border-[#dce8ef] bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Approved Quotation Lists By Item</div>
            <div className="mt-4">
              {!Object.keys(approvedQuotationItemsByItem).length ? (
                <EmptyState text="No quotation items have been approved for this RFQ yet." />
              ) : (
                <div className="space-y-5">
                  {Object.entries(approvedQuotationItemsByItem).map(([itemKey, approvedItems]) => {
                    const sortedApprovedItems = [...approvedItems].sort((a, b) => Number(a.quotedUnitPrice || 0) - Number(b.quotedUnitPrice || 0));
                    return (
                    <div key={itemKey} className="rounded-[24px] border border-[#dce8ef] bg-[#fbfdff] p-4">
                      <div className="text-sm font-black text-[#10283f]">
                        {approvedItems[0]?.requisitionItemName || `Item ${itemKey}`}
                      </div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Sorted by lowest unit price
                      </div>
                      <div className="mt-3">
                        <DataTable
                          rows={sortedApprovedItems}
                          empty="No approved quotations for this item."
                          columns={[
                            { key: "quotationId", label: "Quotation ID", render: (row) => row.quotation?.quotationId || "Not set" },
                            { key: "vendorName", label: "Vendor", render: (row) => row.quotation?.vendorName || "Vendor" },
                            { key: "quotedUnitPrice", label: "Unit Price", render: (row) => formatMoney(row.quotedUnitPrice) },
                            { key: "quantity", label: "Qty" },
                            { key: "quotedTotalPrice", label: "Total", render: (row) => formatMoney(row.quotedTotalPrice) },
                            { key: "technicalStatus", label: "Decision", render: (row) => <StatusPill status={row.vendorSelected ? "SELECTED" : row.technicalStatus || "APPROVED"} /> },
                            { key: "tecComment", label: "TEC Comment", render: (row) => row.tecComment || "Approved" },
                            {
                              key: "actions",
                              label: "Action",
                              render: (row) => row.vendorSelected ? (
                                <span className="text-xs font-bold text-emerald-700">Selected</span>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openOfferLetterDraft(row)}
                                    className="rounded-2xl border border-[#166e8c] bg-[#e8f6fa] px-4 py-2 text-xs font-black text-[#0f5e78] shadow-sm transition hover:bg-[#d4edf5] hover:shadow-md"
                                  >
                                    Select Vendor
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => decideApprovedQuotationItemVendor(row, false)}
                                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 shadow-sm transition hover:bg-red-100 hover:shadow-md"
                                  >
                                    Reject Vendor
                                  </button>
                                </div>
                              ),
                            },
                          ]}
                        />
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </div>
          </div>}
          {!quotationReviewOnly && offerLetterDraft && (
            <div className="rounded-[28px] border border-[#b9dce8] bg-[#f8fcff] p-5 shadow-[0_18px_45px_rgba(15,41,64,0.08)]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Offer Letter</div>
              <h3 className="mt-2 text-xl font-black text-[#10283f]">
                Edit Offer Letter for {offerLetterDraft.item.quotation?.vendorName || "Vendor"}
              </h3>
              <form onSubmit={submitOfferLetterDraft} className="mt-5 space-y-4">
                <Field label="TEC Selection Comment">
                  <input
                    className={inputClass}
                    value={offerLetterDraft.comment}
                    onChange={(event) => setOfferLetterDraft((current) => ({ ...current, comment: event.target.value }))}
                  />
                </Field>
                <Field label="Offer Letter Content">
                  <textarea
                    className={`${inputClass} font-mono leading-7`}
                    rows={16}
                    value={offerLetterDraft.content}
                    onChange={(event) => setOfferLetterDraft((current) => ({ ...current, content: event.target.value }))}
                    required
                  />
                </Field>
                <div className="flex flex-wrap gap-3">
                  <button className={buttonClass} type="submit">
                    Send Offer Letter
                  </button>
                  <button
                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    type="button"
                    onClick={() => setOfferLetterDraft(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </ActionCard>
        </div>

        {quotationReviewOnly && <ActionCard eyebrow="RFQ Quotations" title="BEC Vendor Specification Review">
          <div className="mb-4 rounded-xl border border-[#dce8ef] bg-[#f8fcff] p-3">
            <input value={rfqSearch} onChange={(event) => setRfqSearch(event.target.value)} placeholder="Search RFQ number, title or category" className="w-full rounded-xl border border-[#d3e3eb] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#166e8c]" />
          </div>
          <DataTable
            rows={publishedRfqRows}
            compact
            empty="No published RFQs available for quotation checking."
            columns={[
              { key: "title", label: "Quotation Request", render: (row) => rfqDisplayName(row) },
              { key: "category", label: "Context", render: (row) => rfqContext(row) || "Not recorded" },
              { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
              { key: "bidOpeningDateTime", label: "Closing Time", render: (row) => formatDateTime(row.submissionDeadline || row.bidOpeningDateTime) },
            ]}
          />
          <PaginationControls page={rfqPage} setPage={setRfqPage} totalPages={rfqTotalPages} totalItems={rfqTotalItems} pageSize={10} alwaysShow />
        </ActionCard>}
        </div>
      )}

      {activeSection === "objections" && (
        <ActionCard eyebrow="Objections" title="Vendor Objection Handling">
          <DataTable
            rows={objections}
            empty="No objections for the loaded RFQ."
            columns={[
              { key: "objectionId", label: "ID" },
              { key: "vendorName", label: "Vendor" },
              { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
              { key: "reason", label: "Reason" },
            ]}
          />
          <form onSubmit={resolveObjection} className="space-y-4">
            <Field label="Objection">
              <SelectField value={objectionDecision.objectionId} onChange={(e) => setObjectionDecision((c) => ({ ...c, objectionId: e.target.value }))} options={objectionOptions} placeholder="Select loaded objection" required />
            </Field>
            <Field label="Status">
              <select className={inputClass} value={objectionDecision.status} onChange={(e) => setObjectionDecision((c) => ({ ...c, status: e.target.value }))}>
                <option value="RESOLVED">RESOLVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </Field>
            <Field label="Resolution Comment"><textarea className={inputClass} rows={2} value={objectionDecision.resolutionComment} onChange={(e) => setObjectionDecision((c) => ({ ...c, resolutionComment: e.target.value }))} /></Field>
            <button className={buttonClass} type="submit">Update Objection</button>
          </form>
        </ActionCard>
      )}

      {activeSection === "reports" && (
        <ActionCard eyebrow="Rejected Vendors" title="Evaluation Report Records">
          <DataTable
            rows={reports}
            empty="No rejected vendor reports for the loaded RFQ."
            columns={[
              { key: "reportId", label: "Report ID" },
              { key: "vendorName", label: "Vendor" },
              { key: "reasonForRejection", label: "Reason" },
              { key: "technicalComment", label: "TEC Comment" },
            ]}
          />
        </ActionCard>
      )}

      {activeSection === "offer" && (
        <ActionCard eyebrow="Recommendation" title="Recommend Winner and Create Offer Letter">
          <form onSubmit={recommendBid} className="grid gap-4 md:grid-cols-2">
            <Field label="RFQ">
              <SelectField value={recommendation.rfqId} onChange={(e) => setRecommendation((c) => ({ ...c, rfqId: e.target.value }))} options={loadedRfqOptions} placeholder="Load RFQ first" required />
            </Field>
            <Field label="Winning Bid">
              <SelectField value={recommendation.bidId} onChange={(e) => setRecommendation((c) => ({ ...c, bidId: e.target.value }))} options={qualifiedBidOptions.length ? qualifiedBidOptions : bidOptions} placeholder="Select evaluated bid" required />
            </Field>
            <button className={`${buttonClass} md:col-span-2`} type="submit">Recommend Bid</button>
          </form>
          <form onSubmit={createOffer} className="space-y-4 border-t border-[#edf3f6] pt-4">
            <Field label="RFQ">
              <SelectField value={offer.rfqId} onChange={(e) => setOffer((c) => ({ ...c, rfqId: e.target.value }))} options={loadedRfqOptions} placeholder="Load RFQ first" required />
            </Field>
            <Field label="Recommended Bid">
              <SelectField value={offer.bidId} onChange={(e) => setOffer((c) => ({ ...c, bidId: e.target.value }))} options={qualifiedBidOptions.length ? qualifiedBidOptions : bidOptions} placeholder="Select recommended bid" required />
            </Field>
            <Field label="Letter Number"><input className={inputClass} name="letterNumber" value={offer.letterNumber} onChange={update(setOffer)} /></Field>
            <Field label="Offer Letter Document URL"><input className={inputClass} name="letterDocumentUrl" value={offer.letterDocumentUrl} onChange={update(setOffer)} required /></Field>
            <button className={buttonClass} type="submit">Create Offer Letter</button>
          </form>
        </ActionCard>
      )}
    </div>
  );
}

function VendorWorkspace({ token, setError, setMessage, focusQuotation = false, initialRfqId = "" }) {
  const [rfqs, setRfqs] = useState([]);
  const [bids, setBids] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [reports, setReports] = useState([]);
  const [offers, setOffers] = useState([]);
  const [pos, setPos] = useState([]);
  const [bidForm, setBidForm] = useState(initialVendorBid);
  const [quotationForm, setQuotationForm] = useState(initialVendorQuotation);
  const [quotationItems, setQuotationItems] = useState({});
  const [meetingRequestComment, setMeetingRequestComment] = useState("");
  const [objection, setObjection] = useState({ rfqId: "", bidId: "", reason: "", documentUrl: "" });
  const [offerResponse, setOfferResponse] = useState({ offerLetterId: "", decision: "ACCEPTED", comment: "" });
  const [loading, setLoading] = useState(false);

  const rfqOptions = rfqs.map((rfq) => ({
    value: rfq.rfqId,
    label: `${rfqDisplayName(rfq)} - ${rfqContext(rfq) || rfq.status || "PUBLISHED"}`,
  }));
  const selectedQuotationRfq = rfqs.find((rfq) => String(rfq.rfqId) === String(quotationForm.rfqId));
  const selectedQuotationItems = selectedQuotationRfq?.requisitionRequests?.flatMap((rr) =>
    (rr.items || []).map((item) => ({ ...item, requestName: requestDisplayName(rr), rrTitle: rr.title }))
  ) || [];
  const quotedItemIdsForSelectedRfq = new Set(
    quotations
      .filter((quotation) => String(quotation.rfqId) === String(quotationForm.rfqId))
      .flatMap((quotation) => quotation.items || [])
      .map((item) => item.requisitionItemId)
      .filter(Boolean)
  );
  const selectedQuotationTotal = selectedQuotationItems.reduce((sum, item) => {
    const quote = quotationItems[item.itemId];
    if (!quote?.selected) return sum;
    return sum + (Number(quote.quotedUnitPrice || 0) * Number(quote.quantity || 0));
  }, 0);

  const load = async () => {
    setLoading(true);
    try {
      const [rfqData, bidData, quotationData, reportData, offerData, poData] = await Promise.all([
        vendorProcurementApi.rfqs.list(token),
        vendorProcurementApi.bids.list(token),
        vendorProcurementApi.quotations.list(token),
        vendorProcurementApi.reports.list(token),
        vendorProcurementApi.offers.list(token),
        vendorProcurementApi.purchaseOrders.list(token),
      ]);
      setRfqs(getArray(rfqData));
      setBids(getArray(bidData));
      setQuotations(getArray(quotationData));
      setReports(getArray(reportData));
      setOffers(getArray(offerData));
      setPos(getArray(poData));
    } catch (err) {
      setError(err.message || "Could not load vendor procurement data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    if (focusQuotation && initialRfqId) {
      setQuotationForm((current) => ({ ...current, rfqId: initialRfqId }));
      setQuotationItems({});
    }
  }, [focusQuotation, initialRfqId]);

  const updateBid = (event) => {
    const { name, value } = event.target;
    setBidForm((current) => ({ ...current, [name]: value }));
  };

  const updateQuotation = (event) => {
    const { name, value } = event.target;
    setQuotationForm((current) => ({ ...current, [name]: value }));
  };

  const updateQuotationItem = (item, patch) => {
    setQuotationItems((current) => ({
      ...current,
      [item.itemId]: {
        selected: false,
        quotedUnitPrice: "",
        quantity: item.quantity || 1,
        vendorSpecification: "",
        specificationDocumentUrl: "",
        ...(current[item.itemId] || {}),
        ...patch,
      },
    }));
  };

  const submitBid = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await vendorProcurementApi.rfqs.submitBid(token, bidForm.rfqId, {
        bidAmount: Number(bidForm.bidAmount),
        technicalDocumentUrl: bidForm.technicalDocumentUrl,
        financialDocumentUrl: bidForm.financialDocumentUrl,
        encryptedBidData: bidForm.encryptedBidData,
      });
      setMessage("Bid submitted.");
      setBidForm(initialVendorBid);
      load();
    } catch (err) {
      setError(err.message || "Could not submit bid.");
    }
  };

  const submitQuotation = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const items = selectedQuotationItems
      .map((item) => ({ item, quote: quotationItems[item.itemId] }))
      .filter(({ quote }) => quote?.selected)
      .map(({ item, quote }) => ({
        requisitionItemId: item.itemId,
        quotedUnitPrice: Number(quote.quotedUnitPrice),
        quantity: Number(quote.quantity || item.quantity || 1),
        vendorSpecification: quote.vendorSpecification || "",
        specificationDocumentUrl: quote.specificationDocumentUrl || "",
      }));
    if (!items.length) {
      setError("Select at least one tender item you can supply before submitting a quotation.");
      return;
    }
    try {
      await vendorProcurementApi.rfqs.submitQuotation(token, quotationForm.rfqId, {
        quotedAmount: selectedQuotationTotal,
        items,
        deliveryPeriodDays: toNumberOrNull(quotationForm.deliveryPeriodDays),
        remarks: quotationForm.remarks,
        attachmentUrl: quotationForm.attachmentUrl,
      });
      setMessage("Quotation submitted.");
      setQuotationForm(initialVendorQuotation);
      setQuotationItems({});
      load();
    } catch (err) {
      setError(err.message || "Could not submit quotation.");
    }
  };

  const requestTecMeeting = async () => {
    setError("");
    setMessage("");
    if (!quotationForm.rfqId) {
      setError("Select an RFQ before requesting a TEC meeting.");
      return;
    }
    try {
      await vendorProcurementApi.rfqs.requestMeeting(token, quotationForm.rfqId, {
        comment: meetingRequestComment,
      });
      setMessage("Pre-bid meeting request sent to TEC.");
      setMeetingRequestComment("");
    } catch (err) {
      setError(err.message || "Could not send the meeting request.");
    }
  };

  const submitObjection = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await vendorProcurementApi.rfqs.object(token, objection.rfqId, {
        bidId: objection.bidId ? Number(objection.bidId) : null,
        reason: objection.reason,
        documentUrl: objection.documentUrl,
      });
      setMessage("Objection submitted.");
      setObjection({ rfqId: "", bidId: "", reason: "", documentUrl: "" });
      load();
    } catch (err) {
      setError(err.message || "Could not submit objection.");
    }
  };

  const respondOffer = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await vendorProcurementApi.offers.respond(token, offerResponse.offerLetterId, {
        decision: offerResponse.decision,
        comment: offerResponse.comment,
      });
      setMessage("Offer response submitted.");
      setOfferResponse({ offerLetterId: "", decision: "ACCEPTED", comment: "" });
      load();
    } catch (err) {
      setError(err.message || "Could not respond to offer.");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      {!focusQuotation && (
      <ActionCard eyebrow="Invitations" title="My Invited RFQs">
        {loading ? <EmptyState text="Loading vendor workspace..." /> : <RfqList rfqs={rfqs} />}
      </ActionCard>
      )}

      {!focusQuotation && (
      <ActionCard eyebrow="Bid Submission" title="Submit Sealed Bid">
        <form onSubmit={submitBid} className="space-y-4">
          <Field label="RFQ">
            <SelectField
              value={bidForm.rfqId}
              onChange={(e) => setBidForm((current) => ({ ...current, rfqId: e.target.value }))}
              options={rfqOptions}
              placeholder="Select invited RFQ"
              required
            />
          </Field>
          <Field label="Bid Amount"><input className={inputClass} name="bidAmount" value={bidForm.bidAmount} onChange={updateBid} required /></Field>
          <Field label="Technical Document URL"><input className={inputClass} name="technicalDocumentUrl" value={bidForm.technicalDocumentUrl} onChange={updateBid} /></Field>
          <Field label="Financial Document URL"><input className={inputClass} name="financialDocumentUrl" value={bidForm.financialDocumentUrl} onChange={updateBid} /></Field>
          <Field label="Encrypted Bid Data"><textarea className={inputClass} rows={3} name="encryptedBidData" value={bidForm.encryptedBidData} onChange={updateBid} /></Field>
          <button className={buttonClass} type="submit">Submit Bid</button>
        </form>
      </ActionCard>
      )}

      <ActionCard eyebrow="Quotation Submission" title="Submit Price Quotation">
        <form onSubmit={submitQuotation} className="space-y-4">
          <Field label="RFQ">
            <SelectField
              value={quotationForm.rfqId}
              onChange={(e) => {
                setQuotationForm((current) => ({ ...current, rfqId: e.target.value }));
                setQuotationItems({});
              }}
              options={rfqOptions}
              placeholder="Select invited RFQ"
              required
            />
          </Field>
          {selectedQuotationRfq && (
            <div className="rounded-[24px] border border-[#dce8ef] bg-[#fbfdff] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Tender Items</div>
              <h3 className="mt-2 text-lg font-black text-[#10283f]">
                {rfqDisplayName(selectedQuotationRfq)}
              </h3>
              <div className="mt-4 space-y-3">
                {!selectedQuotationItems.length && <EmptyState text="No RR items are linked to this RFQ." />}
                {selectedQuotationItems.map((item) => {
                  const quote = quotationItems[item.itemId] || {};
                  const alreadyQuoted = quotedItemIdsForSelectedRfq.has(item.itemId);
                  return (
                    <div key={item.itemId} className={`rounded-2xl border border-[#e0ebf1] p-4 ${alreadyQuoted ? "bg-slate-100" : "bg-white"}`}>
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={Boolean(quote.selected) && !alreadyQuoted}
                          disabled={alreadyQuoted}
                          onChange={(event) => updateQuotationItem(item, { selected: event.target.checked })}
                        />
                        <span>
                          <span className="block text-sm font-black text-[#10283f]">{item.itemName}</span>
                          <span className="block text-xs leading-6 text-slate-600">
                            {item.requestName || item.rrTitle || "Related request"} | Requested qty {item.quantity} {item.unitOfMeasure || ""}
                          </span>
                          {alreadyQuoted && <span className="mt-1 block text-xs font-bold text-emerald-700">Quotation already submitted for this item</span>}
                          {item.description && <span className="block text-xs leading-6 text-slate-600">{item.description}</span>}
                        </span>
                      </label>
                      {quote.selected && !alreadyQuoted && (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <Field label="Quoted Unit Price">
                            <input
                              className={inputClass}
                              type="number"
                              value={quote.quotedUnitPrice || ""}
                              onChange={(event) => updateQuotationItem(item, { quotedUnitPrice: event.target.value })}
                              required
                            />
                          </Field>
                          <Field label="Quantity You Can Supply">
                            <input
                              className={inputClass}
                              type="number"
                              value={quote.quantity || item.quantity || 1}
                              onChange={(event) => updateQuotationItem(item, { quantity: event.target.value })}
                              required
                            />
                          </Field>
                          <Field label="Vendor Specification">
                            <textarea
                              className={inputClass}
                              rows={2}
                              value={quote.vendorSpecification || ""}
                              onChange={(event) => updateQuotationItem(item, { vendorSpecification: event.target.value })}
                            />
                          </Field>
                          <Field label="Specification Document URL">
                            <input
                              className={inputClass}
                              value={quote.specificationDocumentUrl || ""}
                              onChange={(event) => updateQuotationItem(item, { specificationDocumentUrl: event.target.value })}
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-2xl bg-[#edf7fb] p-4 text-sm font-black text-[#166e8c]">
                Quotation total for selected items: {formatMoney(selectedQuotationTotal)}
              </div>
            </div>
          )}
          {selectedQuotationRfq && (
            <div className="rounded-[24px] border border-[#dce8ef] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Pre-Bid Meeting</div>
              <h3 className="mt-2 text-lg font-black text-[#10283f]">Request a TEC meeting before quotation</h3>
              <Field label="Message to TEC">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={meetingRequestComment}
                  onChange={(event) => setMeetingRequestComment(event.target.value)}
                  placeholder="Add the clarification or meeting reason"
                />
              </Field>
              <button className={buttonClass} type="button" onClick={requestTecMeeting}>
                Request Meeting from TEC
              </button>
            </div>
          )}
          <Field label="Delivery Period Days"><input className={inputClass} name="deliveryPeriodDays" value={quotationForm.deliveryPeriodDays} onChange={updateQuotation} /></Field>
          <Field label="Attachment URL"><input className={inputClass} name="attachmentUrl" value={quotationForm.attachmentUrl} onChange={updateQuotation} /></Field>
          <Field label="Remarks"><textarea className={inputClass} rows={3} name="remarks" value={quotationForm.remarks} onChange={updateQuotation} /></Field>
          <button className={buttonClass} type="submit">Submit Quotation</button>
        </form>
      </ActionCard>

      {!focusQuotation && (
      <ActionCard eyebrow="My Bids" title="Submission Status">
        <DataTable
          rows={bids}
          empty="No bids submitted yet."
          columns={[
            { key: "bidId", label: "Bid ID" },
            { key: "title", label: "Quotation Request", render: (row) => rfqDisplayName(row, "Submitted bid") },
            { key: "bidAmount", label: "Amount", render: (row) => formatMoney(row.bidAmount) },
            { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
          ]}
        />
      </ActionCard>
      )}

      {!focusQuotation && (
      <ActionCard eyebrow="My Quotations" title="Quotation Status">
        <DataTable
          rows={quotations}
          empty="No quotations submitted yet."
          columns={[
            { key: "quotationId", label: "Quotation ID" },
            { key: "title", label: "Quotation Request", render: (row) => rfqDisplayName(row, "Submitted quotation") },
            { key: "quotedAmount", label: "Amount", render: (row) => formatMoney(row.quotedAmount) },
            { key: "deliveryPeriodDays", label: "Delivery Days" },
            { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
          ]}
        />
      </ActionCard>
      )}

      {!focusQuotation && (
      <ActionCard eyebrow="Appeals" title="Submit Objection">
        <form onSubmit={submitObjection} className="space-y-4">
          <Field label="RFQ ID"><input className={inputClass} value={objection.rfqId} onChange={(e) => setObjection((c) => ({ ...c, rfqId: e.target.value }))} required /></Field>
          <Field label="Bid ID"><input className={inputClass} value={objection.bidId} onChange={(e) => setObjection((c) => ({ ...c, bidId: e.target.value }))} /></Field>
          <Field label="Reason"><textarea className={inputClass} rows={3} value={objection.reason} onChange={(e) => setObjection((c) => ({ ...c, reason: e.target.value }))} required /></Field>
          <Field label="Document URL"><input className={inputClass} value={objection.documentUrl} onChange={(e) => setObjection((c) => ({ ...c, documentUrl: e.target.value }))} /></Field>
          <button className={buttonClass} type="submit">Submit Objection</button>
        </form>
      </ActionCard>
      )}

      {!focusQuotation && (
      <ActionCard eyebrow="Offer Letter" title="Accept or Reject Offer">
        <DataTable
          rows={offers}
          empty="No offer letters available."
          columns={[
            { key: "offerLetterId", label: "Offer ID" },
            { key: "letterNumber", label: "Letter" },
            { key: "requisitionItemName", label: "Item", render: (row) => row.requisitionItemName || "Full offer" },
            { key: "offerAmount", label: "Amount", render: (row) => formatMoney(row.offerAmount) },
            { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
          ]}
        />
        <div className="space-y-3">
          {offers.map((offerLetter) => (
            <details key={offerLetter.offerLetterId} className="rounded-[22px] border border-[#dce8ef] bg-[#fbfdff] p-4">
              <summary className="cursor-pointer text-sm font-black text-[#10283f]">
                View letter {offerLetter.letterNumber || offerLetter.offerLetterId}
              </summary>
              <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-7 text-slate-700">
                {offerLetter.letterContent || "No letter content available."}
              </pre>
            </details>
          ))}
        </div>
        <form onSubmit={respondOffer} className="space-y-4">
          <Field label="Offer Letter ID"><input className={inputClass} value={offerResponse.offerLetterId} onChange={(e) => setOfferResponse((c) => ({ ...c, offerLetterId: e.target.value }))} required /></Field>
          <Field label="Decision">
            <select className={inputClass} value={offerResponse.decision} onChange={(e) => setOfferResponse((c) => ({ ...c, decision: e.target.value }))}>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </Field>
          <Field label="Comment"><textarea className={inputClass} rows={2} value={offerResponse.comment} onChange={(e) => setOfferResponse((c) => ({ ...c, comment: e.target.value }))} /></Field>
          <button className={buttonClass} type="submit">Send Response</button>
        </form>
      </ActionCard>
      )}

      {!focusQuotation && (
      <ActionCard eyebrow="Reports and PO" title="Rejected Reports and Purchase Orders">
        <DataTable
          rows={reports}
          empty="No rejected bid reports yet."
          columns={[
            { key: "reportId", label: "Report ID" },
            { key: "rfqNumber", label: "RFQ" },
            { key: "reason", label: "Reason" },
          ]}
        />
        <DataTable
          rows={pos}
          empty="No purchase orders yet."
          columns={[
            { key: "purchaseOrderId", label: "PO ID" },
            { key: "poNumber", label: "PO Number" },
            { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
          ]}
        />
      </ActionCard>
      )}
    </div>
  );
}

export default function ProcurementWorkspace() {
  const { user, token } = useAuth();
  const location = useLocation();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const focusQuotation = user?.mainRole === "VENDOR" && query.get("section") === "quotation";
  const initialRfqId = query.get("rfqId") || "";

  const role = useMemo(() => {
    if (user?.mainRole === "VENDOR") return "VENDOR";
    if (user?.mainRole === "FINANCE" && user?.subRole === "PROCUREMENT_OFFICER") return "PROCUREMENT_OFFICER";
    if (user?.mainRole === "FINANCE" && user?.subRole === "BEC_HEAD") return "BEC_HEAD";
    if (user?.mainRole === "FACULTY_STAFF" && user?.subRole === "TEC") return "TEC";
    return "UNSUPPORTED";
  }, [user]);

  const hero = {
    PROCUREMENT_OFFICER: {
      eyebrow: "Procurement Office",
      title: "Tender Workspace",
      description: "Create RFQs from approved requisitions, invite vendors, and generate purchase orders after accepted offer letters.",
    },
    TEC: {
      eyebrow: "Technical Evaluation Committee",
      title: "Bid Evaluation Workspace",
      description: "Manage specifications, optional pre-bid meetings, sealed bid evaluation, objections, recommendations, and offer letters.",
    },
    BEC_HEAD: {
      eyebrow: "Bid Evaluation Committee",
      title: "Quotation Category Routing",
      description: "Send vendor quotation items to the BEC member assigned for each category after the bid closing time.",
    },
    VENDOR: {
      eyebrow: "Vendor Portal",
      title: "Tender Participation",
      description: "View invited RFQs, submit sealed bids, raise objections, respond to offer letters, and track purchase orders.",
    },
    UNSUPPORTED: {
      eyebrow: "Procurement",
      title: "Workspace Unavailable",
      description: "This screen is available for Procurement Officer, TEC, and Vendor users.",
    },
  }[role];

  return (
    <div className="space-y-8">
      <PageHero eyebrow={hero.eyebrow} title={hero.title} description={hero.description}>
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Logged in as</div>
          <div className="mt-2 text-2xl font-black">{user?.subRole || user?.mainRole}</div>
        </div>
      </PageHero>

      <Notice error={error} message={message} />

      {role === "PROCUREMENT_OFFICER" && <ProcurementOfficerWorkspace token={token} setError={setError} setMessage={setMessage} />}
      {role === "TEC" && <TecWorkspace token={token} setError={setError} setMessage={setMessage} />}
      {role === "BEC_HEAD" && <TecWorkspace token={token} setError={setError} setMessage={setMessage} quotationReviewOnly />}
      {role === "VENDOR" && (
        <VendorWorkspace
          token={token}
          setError={setError}
          setMessage={setMessage}
          focusQuotation={focusQuotation}
          initialRfqId={initialRfqId}
        />
      )}
      {role === "UNSUPPORTED" && <EmptyState text="Please login using PROCUREMENT_OFFICER, BEC_HEAD, TEC, or VENDOR role to use this module." />}
    </div>
  );
}

