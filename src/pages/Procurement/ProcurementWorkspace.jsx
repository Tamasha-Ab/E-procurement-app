import { useEffect, useMemo, useState } from "react";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { procurementApi, vendorProcurementApi } from "../../api/procurementApi";
import { formatDateTime, formatMoney } from "../../services/apiClient";

const cardClass = "rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]";
const inputClass = "w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#166e8c]";
const buttonClass = "rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79] disabled:opacity-60";

const initialRfq = {
  rrId: "",
  title: "",
  description: "",
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
  submitToVc: true,
};

const initialMeeting = {
  rfqId: "",
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
  submitToVc: true,
};

const initialVendorBid = {
  rfqId: "",
  bidAmount: "",
  technicalDocumentUrl: "",
  financialDocumentUrl: "",
  encryptedBidData: "",
};

function asLocalDateTime(value) {
  return value ? value : null;
}

function toNumberOrNull(value) {
  return value === "" || value === null || value === undefined ? null : Number(value);
}

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
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
            <h3 className="text-lg font-black text-[#10283f]">{rfq.title || rfq.rfqNumber || `RFQ ${rfq.rfqId}`}</h3>
            <StatusPill status={rfq.status} />
          </div>
          <div className="mt-2 text-sm leading-7 text-slate-600">
            ID {rfq.rfqId} | {rfq.rfqNumber || "No RFQ number"} | Opens {formatDateTime(rfq.bidOpeningDateTime)}
          </div>
        </button>
      ))}
    </div>
  );
}

function DataTable({ rows, columns, empty }) {
  if (!rows.length) return <EmptyState text={empty} />;

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
            <tr key={row.id || row.rfqId || row.bidId || row.offerLetterId || row.purchaseOrderId || index}>
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-4 text-slate-700">
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
      {options.map((option) => (
        <option key={option.value} value={option.value}>
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
  const [rfqs, setRfqs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
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
    label: `${request.rrNumber || `RR ${request.rrId}`} - ${request.title || "Untitled"} - ${formatMoney(request.estimatedTotalAmount)}`,
  }));
  const rfqOptions = rfqs.map((rfq) => ({
    value: rfq.rfqId,
    label: `${rfq.rfqNumber || `RFQ ${rfq.rfqId}`} - ${rfq.title || "Untitled"} - ${rfq.status || "DRAFT"}`,
  }));
  const acceptedOfferOptions = acceptedOffers.map((offer) => ({
    value: offer.offerLetterId,
    label: `${offer.letterNumber || `Offer ${offer.offerLetterId}`} - ${offer.vendorName || "Vendor"} - ${formatMoney(offer.offerAmount)}`,
  }));

  const load = async () => {
    setLoading(true);
    try {
      const [readyData, rfqData, offerData, poData] = await Promise.all([
        procurementApi.requisitions.ready(token),
        procurementApi.rfqs.list(token),
        procurementApi.purchaseOrders.acceptedOffers(token),
        procurementApi.purchaseOrders.list(token),
      ]);
      setReadyRequests(getArray(readyData));
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
      const users = getArray(data).filter((user) => user.vendorId);
      setVendors(users);
      if (!users.length) {
        setMessage("No approved vendors found for that business name.");
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
        rrId: Number(rfqForm.rrId),
        title: rfqForm.title,
        description: rfqForm.description,
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
        <ActionCard eyebrow="RFQ Setup" title="Create RFQ from Approved RR">
          <form onSubmit={createRfq} className="space-y-4">
            <Field label="Approved Requisition Request">
              <SelectField
                value={rfqForm.rrId}
                onChange={(e) => setRfqForm((current) => ({ ...current, rrId: e.target.value }))}
                options={readyRequestOptions}
                placeholder={loading ? "Loading approved requests..." : "Select approved RR"}
                required
              />
            </Field>
            <Field label="RFQ Title"><input className={inputClass} name="title" value={rfqForm.title} onChange={updateRfq} required /></Field>
            <Field label="Description"><textarea className={inputClass} name="description" rows={3} value={rfqForm.description} onChange={updateRfq} /></Field>
            <div className="grid gap-4 md:grid-cols-2">
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
                onChange={(e) => setSelectedRfq(rfqs.find((rfq) => String(rfq.rfqId) === e.target.value) || null)}
                options={rfqOptions}
                placeholder={loading ? "Loading RFQs..." : "Select RFQ"}
                required
              />
            </Field>
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
                {!vendors.length && <EmptyState text="Search approved vendors by business name, then select one or more vendors." />}
                {vendors.map((vendor) => (
                  <label key={`${vendor.userId}-${vendor.vendorId}`} className="flex items-start gap-3 rounded-[20px] bg-[#f8fcff] p-4">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedVendorIds.includes(String(vendor.vendorId))}
                      onChange={(event) => {
                        setSelectedVendorIds((current) =>
                          event.target.checked
                            ? [...current, String(vendor.vendorId)]
                            : current.filter((id) => id !== String(vendor.vendorId))
                        );
                      }}
                    />
                    <span>
                      <span className="block text-sm font-black text-[#10283f]">{vendor.vendorName || vendor.username}</span>
                      <span className="block text-xs leading-6 text-slate-600">
                        Vendor ID {vendor.vendorId} | {vendor.email}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <button className={buttonClass} type="submit" disabled={!selectedRfq || !selectedVendorIds.length}>
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

function TecWorkspace({ token, setError, setMessage }) {
  const [activeSection, setActiveSection] = useState("specs");
  const [spec, setSpec] = useState(initialSpec);
  const [meeting, setMeeting] = useState(initialMeeting);
  const [completeMeeting, setCompleteMeeting] = useState({ meetingId: "", minutesDocumentUrl: "", changeSummary: "" });
  const [rfqLookup, setRfqLookup] = useState("");
  const [bids, setBids] = useState([]);
  const [objections, setObjections] = useState([]);
  const [reports, setReports] = useState([]);
  const [meetingRecord, setMeetingRecord] = useState(null);
  const [evaluation, setEvaluation] = useState(initialBidEvaluation);
  const [recommendation, setRecommendation] = useState({ rfqId: "", bidId: "" });
  const [objectionDecision, setObjectionDecision] = useState({ objectionId: "", status: "RESOLVED", resolutionComment: "" });
  const [offer, setOffer] = useState(initialOffer);

  const loadedRfqOptions = rfqLookup
    ? [{ value: rfqLookup, label: `RFQ ID ${rfqLookup}` }]
    : [];
  const bidOptions = bids.map((bid) => ({
    value: bid.bidId,
    label: `Bid ${bid.bidId} - ${bid.vendorName || "Vendor"} - ${formatMoney(bid.bidAmount)}`,
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
  const sections = [
    { id: "specs", label: "Specifications" },
    { id: "meeting", label: "Pre-Bid Meeting" },
    { id: "bids", label: "Bid Evaluation" },
    { id: "objections", label: "Objections" },
    { id: "reports", label: "Rejected Reports" },
    { id: "offer", label: "Offer Letter" },
  ];

  const update = (setter) => (event) => {
    const { name, value, type, checked } = event.target;
    setter((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const selectLoadedRfq = (rfqId) => {
    setRfqLookup(rfqId);
    setSpec((current) => ({ ...current, rfqId }));
    setMeeting((current) => ({ ...current, rfqId }));
    setRecommendation((current) => ({ ...current, rfqId }));
    setOffer((current) => ({ ...current, rfqId }));
  };

  const loadRfqWork = async (event) => {
    event?.preventDefault();
    if (!rfqLookup) return;
    setError("");
    setMessage("");
    try {
      const [bidData, objectionData, reportData, meetingData] = await Promise.all([
        procurementApi.rfqs.bids(token, rfqLookup),
        procurementApi.rfqs.objections(token, rfqLookup),
        procurementApi.rfqs.reports(token, rfqLookup),
        procurementApi.meetings.get(token, rfqLookup).catch(() => null),
      ]);
      setBids(getArray(bidData));
      setObjections(getArray(objectionData));
      setReports(getArray(reportData));
      setMeetingRecord(meetingData);
      setSpec((current) => ({ ...current, rfqId: rfqLookup }));
      setMeeting((current) => ({ ...current, rfqId: rfqLookup }));
      setRecommendation((current) => ({ ...current, rfqId: rfqLookup }));
      setOffer((current) => ({ ...current, rfqId: rfqLookup }));
      setMessage("RFQ evaluation data loaded.");
    } catch (err) {
      setError(err.message || "Could not load RFQ evaluation data.");
    }
  };

  const createSpec = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await procurementApi.specifications.create(token, spec.rfqId, {
        specTitle: spec.specTitle,
        specDescription: spec.specDescription,
        documentUrl: spec.documentUrl,
        submitToVc: spec.submitToVc,
      });
      setMessage("Specification document saved.");
      setSpec(initialSpec);
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
        meetingDateTime: asLocalDateTime(meeting.meetingDateTime),
        meetingLinkOrLocation: meeting.meetingLinkOrLocation,
        agenda: meeting.agenda,
      });
      setMessage("Pre-bid meeting details saved.");
      setMeeting(initialMeeting);
      loadRfqWork();
    } catch (err) {
      setError(err.message || "Could not save meeting.");
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
        submitToVc: offer.submitToVc,
      });
      setMessage("Offer letter sent for VC approval.");
      setOffer(initialOffer);
    } catch (err) {
      setError(err.message || "Could not create offer letter.");
    }
  };

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Tender Evaluation</div>
        <h2 className="mt-3 text-2xl font-black text-[#10283f]">Choose RFQ and evaluation step</h2>
        <form onSubmit={loadRfqWork} className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className={inputClass}
            value={rfqLookup}
            onChange={(e) => selectLoadedRfq(e.target.value)}
            placeholder="Enter RFQ ID once, then use dropdowns below"
          />
          <button className={buttonClass} type="submit">Load Tender Data</button>
        </form>
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

      {activeSection === "specs" && (
        <ActionCard eyebrow="Specifications" title="Add Tender Specification">
          <form onSubmit={createSpec} className="space-y-4">
            <Field label="RFQ">
              <SelectField value={spec.rfqId} onChange={(e) => setSpec((c) => ({ ...c, rfqId: e.target.value }))} options={loadedRfqOptions} placeholder="Load RFQ first" required />
            </Field>
            <Field label="Specification Title"><input className={inputClass} name="specTitle" value={spec.specTitle} onChange={update(setSpec)} required /></Field>
            <Field label="Specification Description"><textarea className={inputClass} rows={3} name="specDescription" value={spec.specDescription} onChange={update(setSpec)} /></Field>
            <Field label="Specification Document URL"><input className={inputClass} name="documentUrl" value={spec.documentUrl} onChange={update(setSpec)} required /></Field>
            <label className="flex items-center gap-3 text-sm font-bold text-[#10283f]">
              <input type="checkbox" name="submitToVc" checked={spec.submitToVc} onChange={update(setSpec)} />
              Submit to VC
            </label>
            <button className={buttonClass} type="submit">Save Specification</button>
          </form>
        </ActionCard>
      )}

      {activeSection === "meeting" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <ActionCard eyebrow="Optional Meeting" title="Schedule Pre-Bid Meeting">
            <form onSubmit={scheduleMeeting} className="space-y-4">
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
              <button className={buttonClass} type="submit">Save Meeting</button>
            </form>
          </ActionCard>

          <ActionCard eyebrow="Meeting Minutes" title="Complete Pre-Bid Meeting">
            <form onSubmit={markMeetingComplete} className="space-y-4">
              <Field label="Meeting">
                <SelectField
                  value={completeMeeting.meetingId}
                  onChange={(e) => setCompleteMeeting((c) => ({ ...c, meetingId: e.target.value }))}
                  options={meetingOptions}
                  placeholder="Load RFQ with saved meeting first"
                  required
                />
              </Field>
              <Field label="Minutes Document URL"><input className={inputClass} value={completeMeeting.minutesDocumentUrl} onChange={(e) => setCompleteMeeting((c) => ({ ...c, minutesDocumentUrl: e.target.value }))} /></Field>
              <Field label="Specification Change Summary"><textarea className={inputClass} rows={2} value={completeMeeting.changeSummary} onChange={(e) => setCompleteMeeting((c) => ({ ...c, changeSummary: e.target.value }))} /></Field>
              <button className={buttonClass} type="submit">Complete Meeting</button>
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
            <label className="flex items-center gap-3 text-sm font-bold text-[#10283f]">
              <input type="checkbox" name="submitToVc" checked={offer.submitToVc} onChange={update(setOffer)} />
              Submit to VC
            </label>
            <button className={buttonClass} type="submit">Create Offer Letter</button>
          </form>
        </ActionCard>
      )}
    </div>
  );
}

function VcWorkspace({ token, setError, setMessage }) {
  const [specDecision, setSpecDecision] = useState({ specId: "", decision: "APPROVED", comment: "" });
  const [offerDecision, setOfferDecision] = useState({ offerLetterId: "", decision: "APPROVED", comment: "" });

  const decideSpec = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await procurementApi.specifications.decide(token, specDecision.specId, {
        decision: specDecision.decision,
        comment: specDecision.comment,
      });
      setMessage("Specification decision saved.");
      setSpecDecision({ specId: "", decision: "APPROVED", comment: "" });
    } catch (err) {
      setError(err.message || "Could not approve specification.");
    }
  };

  const decideOffer = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await procurementApi.offers.decide(token, offerDecision.offerLetterId, {
        decision: offerDecision.decision,
        comment: offerDecision.comment,
      });
      setMessage("Offer letter decision saved.");
      setOfferDecision({ offerLetterId: "", decision: "APPROVED", comment: "" });
    } catch (err) {
      setError(err.message || "Could not approve offer letter.");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ActionCard eyebrow="VC Decision" title="Approve Tender Specification">
        <form onSubmit={decideSpec} className="space-y-4">
          <Field label="Specification ID"><input className={inputClass} value={specDecision.specId} onChange={(e) => setSpecDecision((c) => ({ ...c, specId: e.target.value }))} required /></Field>
          <Field label="Decision">
            <select className={inputClass} value={specDecision.decision} onChange={(e) => setSpecDecision((c) => ({ ...c, decision: e.target.value }))}>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </Field>
          <Field label="Comment"><textarea className={inputClass} rows={3} value={specDecision.comment} onChange={(e) => setSpecDecision((c) => ({ ...c, comment: e.target.value }))} /></Field>
          <button className={buttonClass} type="submit">Submit Decision</button>
        </form>
      </ActionCard>

      <ActionCard eyebrow="VC Decision" title="Approve Offer Letter">
        <form onSubmit={decideOffer} className="space-y-4">
          <Field label="Offer Letter ID"><input className={inputClass} value={offerDecision.offerLetterId} onChange={(e) => setOfferDecision((c) => ({ ...c, offerLetterId: e.target.value }))} required /></Field>
          <Field label="Decision">
            <select className={inputClass} value={offerDecision.decision} onChange={(e) => setOfferDecision((c) => ({ ...c, decision: e.target.value }))}>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </Field>
          <Field label="Comment"><textarea className={inputClass} rows={3} value={offerDecision.comment} onChange={(e) => setOfferDecision((c) => ({ ...c, comment: e.target.value }))} /></Field>
          <button className={buttonClass} type="submit">Submit Decision</button>
        </form>
      </ActionCard>
    </div>
  );
}

function VendorWorkspace({ token, setError, setMessage }) {
  const [rfqs, setRfqs] = useState([]);
  const [bids, setBids] = useState([]);
  const [reports, setReports] = useState([]);
  const [offers, setOffers] = useState([]);
  const [pos, setPos] = useState([]);
  const [bidForm, setBidForm] = useState(initialVendorBid);
  const [objection, setObjection] = useState({ rfqId: "", bidId: "", reason: "", documentUrl: "" });
  const [offerResponse, setOfferResponse] = useState({ offerLetterId: "", decision: "ACCEPTED", comment: "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [rfqData, bidData, reportData, offerData, poData] = await Promise.all([
        vendorProcurementApi.rfqs.list(token),
        vendorProcurementApi.bids.list(token),
        vendorProcurementApi.reports.list(token),
        vendorProcurementApi.offers.list(token),
        vendorProcurementApi.purchaseOrders.list(token),
      ]);
      setRfqs(getArray(rfqData));
      setBids(getArray(bidData));
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

  const updateBid = (event) => {
    const { name, value } = event.target;
    setBidForm((current) => ({ ...current, [name]: value }));
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
      <ActionCard eyebrow="Invitations" title="My Invited RFQs">
        {loading ? <EmptyState text="Loading vendor workspace..." /> : <RfqList rfqs={rfqs} />}
      </ActionCard>

      <ActionCard eyebrow="Bid Submission" title="Submit Sealed Bid">
        <form onSubmit={submitBid} className="space-y-4">
          <Field label="RFQ ID"><input className={inputClass} name="rfqId" value={bidForm.rfqId} onChange={updateBid} required /></Field>
          <Field label="Bid Amount"><input className={inputClass} name="bidAmount" value={bidForm.bidAmount} onChange={updateBid} required /></Field>
          <Field label="Technical Document URL"><input className={inputClass} name="technicalDocumentUrl" value={bidForm.technicalDocumentUrl} onChange={updateBid} /></Field>
          <Field label="Financial Document URL"><input className={inputClass} name="financialDocumentUrl" value={bidForm.financialDocumentUrl} onChange={updateBid} /></Field>
          <Field label="Encrypted Bid Data"><textarea className={inputClass} rows={3} name="encryptedBidData" value={bidForm.encryptedBidData} onChange={updateBid} /></Field>
          <button className={buttonClass} type="submit">Submit Bid</button>
        </form>
      </ActionCard>

      <ActionCard eyebrow="My Bids" title="Submission Status">
        <DataTable
          rows={bids}
          empty="No bids submitted yet."
          columns={[
            { key: "bidId", label: "Bid ID" },
            { key: "rfqNumber", label: "RFQ" },
            { key: "bidAmount", label: "Amount", render: (row) => formatMoney(row.bidAmount) },
            { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
          ]}
        />
      </ActionCard>

      <ActionCard eyebrow="Appeals" title="Submit Objection">
        <form onSubmit={submitObjection} className="space-y-4">
          <Field label="RFQ ID"><input className={inputClass} value={objection.rfqId} onChange={(e) => setObjection((c) => ({ ...c, rfqId: e.target.value }))} required /></Field>
          <Field label="Bid ID"><input className={inputClass} value={objection.bidId} onChange={(e) => setObjection((c) => ({ ...c, bidId: e.target.value }))} /></Field>
          <Field label="Reason"><textarea className={inputClass} rows={3} value={objection.reason} onChange={(e) => setObjection((c) => ({ ...c, reason: e.target.value }))} required /></Field>
          <Field label="Document URL"><input className={inputClass} value={objection.documentUrl} onChange={(e) => setObjection((c) => ({ ...c, documentUrl: e.target.value }))} /></Field>
          <button className={buttonClass} type="submit">Submit Objection</button>
        </form>
      </ActionCard>

      <ActionCard eyebrow="Offer Letter" title="Accept or Reject Offer">
        <DataTable
          rows={offers}
          empty="No offer letters available."
          columns={[
            { key: "offerLetterId", label: "Offer ID" },
            { key: "letterNumber", label: "Letter" },
            { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
          ]}
        />
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
    </div>
  );
}

export default function ProcurementWorkspace() {
  const { user, token } = useAuth();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const role = useMemo(() => {
    if (user?.mainRole === "VENDOR") return "VENDOR";
    if (user?.mainRole === "FINANCE" && user?.subRole === "PROCUREMENT_OFFICER") return "PROCUREMENT_OFFICER";
    if (user?.mainRole === "FACULTY_STAFF" && user?.subRole === "TEC") return "TEC";
    if (user?.mainRole === "FACULTY_STAFF" && user?.subRole === "VC") return "VC";
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
    VC: {
      eyebrow: "Vice Chancellor",
      title: "Procurement Approvals",
      description: "Approve or reject tender specifications and offer letters before vendors receive the final award decision.",
    },
    VENDOR: {
      eyebrow: "Vendor Portal",
      title: "Tender Participation",
      description: "View invited RFQs, submit sealed bids, raise objections, respond to offer letters, and track purchase orders.",
    },
    UNSUPPORTED: {
      eyebrow: "Procurement",
      title: "Workspace Unavailable",
      description: "This screen is available for Procurement Officer, TEC, VC, and Vendor users.",
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
      {role === "VC" && <VcWorkspace token={token} setError={setError} setMessage={setMessage} />}
      {role === "VENDOR" && <VendorWorkspace token={token} setError={setError} setMessage={setMessage} />}
      {role === "UNSUPPORTED" && <EmptyState text="Please login using PROCUREMENT_OFFICER, TEC, VC, or VENDOR role to use this module." />}
    </div>
  );
}
