import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PageHero from "../../components/PageHero";
import { useAuth } from "../../contexts/AuthContext";
import { dpcApi } from "../../api/dpcApi";
import { formatDateTime, statusLabel } from "../../services/apiClient";

const statusTone = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  BLACK_LISTED: "bg-slate-900 text-white",
  REJECTED: "bg-red-50 text-red-700",
};

const docs = (vendor) => [
  { label: "Business Registration", name: vendor.businessRegistrationDocumentName, data: vendor.businessRegistrationDocument },
  { label: "VAT / Exemption", name: vendor.vatDocumentName, data: vendor.vatDocument },
  { label: "CIDA", name: vendor.cidaDocumentName, data: vendor.cidaDocument },
].filter((doc) => doc.name && doc.data);

const displayVendor = (vendor) => vendor.vendorName || vendor.username || "Unnamed vendor";

const emptyDocumentIssues = {
  "Business Registration": { selected: false, remarks: "" },
  "VAT / Exemption": { selected: false, remarks: "" },
  CIDA: { selected: false, remarks: "" },
};

const isImageDocument = (data = "", name = "") =>
  data.startsWith("data:image/") || /\.(png|jpe?g|gif|webp)$/i.test(name);

const buildDocumentRemarks = (issues) =>
  Object.entries(issues)
    .filter(([, issue]) => issue.selected && issue.remarks.trim())
    .map(([label, issue]) => `${label}: ${issue.remarks.trim()}`)
    .join("\n");

export default function DpcVendorWorkspace({ fixedStatus = "" }) {
  const { token } = useAuth();
  const location = useLocation();
  const queryStatus = new URLSearchParams(location.search).get("status") || "";
  const [vendors, setVendors] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState(fixedStatus || queryStatus);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [documentIssues, setDocumentIssues] = useState(emptyDocumentIssues);
  const [decisionRemarks, setDecisionRemarks] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  const loadVendors = () => {
    setLoading(true);
    setError("");
    dpcApi.vendors.list(token, { status: fixedStatus || status, search, page, size: pageSize })
      .then((list) => {
        const next = Array.isArray(list) ? list : Array.isArray(list?.content) ? list.content : [];
        setVendors(next);
        setTotalPages(Math.max(Number(list?.totalPages || 1), 1));
        setTotalElements(Number(list?.totalElements ?? next.length));
        setSelectedId((current) => next.some((vendor) => vendor.userId === current) ? current : null);
      })
      .catch((err) => {
        const errorMessage = err.message || "Could not load vendors.";
        setError(errorMessage);
        toast.error(errorMessage, { toastId: "dpc-vendors-load-error", autoClose: 5000 });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (token) loadVendors();
  }, [token, fixedStatus, status, page]);

  useEffect(() => {
    if (!fixedStatus) {
      setStatus(queryStatus);
    }
  }, [fixedStatus, queryStatus]);

  const counts = useMemo(() => vendors.reduce((acc, vendor) => {
    const key = vendor.vendorStatus || "PENDING";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}), [vendors]);

  const selected = vendors.find((vendor) => vendor.userId === selectedId) || null;

  useEffect(() => {
    setDocumentIssues(emptyDocumentIssues);
    setDecisionRemarks(selected?.decisionRemarks || "");
  }, [selectedId]);

  const action = async (kind, vendor) => {
    setError("");
    const documentReviewRemarks = buildDocumentRemarks(documentIssues);
    if ((kind === "reject" || kind === "blacklist") && !decisionRemarks.trim() && !documentReviewRemarks) {
      const validationMessage = "Please add a rejection reason or document remarks before changing this status.";
      setError(validationMessage);
      toast.error(validationMessage);
      return;
    }

    try {
      const updated = await dpcApi.vendors[kind](token, vendor.userId, {
        documentReviewRemarks,
        decisionRemarks: decisionRemarks.trim(),
      });
      setVendors((current) => current.map((item) => item.userId === updated.userId ? updated : item)
        .filter((item) => !fixedStatus || item.vendorStatus === fixedStatus));
      setSelectedId(updated.userId);
      const notificationMessage = `${displayVendor(updated)} status changed to ${statusLabel(updated.vendorStatus)}. Vendor notification sent.`;
      if (kind === "reject" || kind === "blacklist") {
        toast.warning(notificationMessage, { autoClose: 5000 });
      } else {
        toast.success(notificationMessage, { autoClose: 5000 });
      }
    } catch (err) {
      const errorMessage = err.message || "Could not update vendor status.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="DPC Workspace"
        title={fixedStatus === "BLACK_LISTED" ? "Black Listed Vendors" : "Vendor Registration Review"}
        description="Check submitted supplier details and registration documents before deciding vendor status."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Vendors</div>
          <div className="mt-2 text-3xl font-black">{totalElements}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      {!fixedStatus && <section className="grid gap-4 md:grid-cols-4">
        {["PENDING", "APPROVED", "REJECTED", "BLACK_LISTED"].map((item) => (
          <div key={item} className="rounded-[24px] border border-[#dce8ef] bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{statusLabel(item)}</div>
            <div className="mt-2 text-2xl font-black text-[#10283f]">{counts[item] || 0}</div>
          </div>
        ))}
      </section>}

      <section className="space-y-6">
        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { setPage(0); loadVendors(); } }}
              placeholder="Search vendors"
              className="rounded-2xl border border-[#dce8ef] px-4 py-2 text-sm outline-none focus:border-[#166e8c]"
            />
            {!fixedStatus && (
              <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} className="rounded-2xl border border-[#dce8ef] px-4 py-2 text-sm outline-none focus:border-[#166e8c]">
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="BLACK_LISTED">Black Listed</option>
              </select>
            )}
          </div>
          <button type="button" onClick={() => { setPage(0); loadVendors(); }} className="mt-3 rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
            Refresh
          </button>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[#dce8ef]">
            {loading && <div className="rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600">Loading vendors...</div>}
            {!loading && vendors.length === 0 && <div className="rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600">No vendors found.</div>}
            {vendors.map((vendor) => (
              <button
                type="button"
                key={vendor.userId}
                onClick={() => { setSelectedId(vendor.userId); requestAnimationFrame(() => document.getElementById("dpc-vendor-details")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}
                className={`grid w-full gap-2 border-b border-[#e8f0f5] px-4 py-3 text-left text-sm transition last:border-b-0 md:grid-cols-[1.2fr_1.2fr_1fr_auto] md:items-center ${selectedId === vendor.userId ? "bg-[#eaf7fb]" : "bg-white hover:bg-[#f7fbfd]"}`}
              >
                <span className="font-black text-[#10283f]">{displayVendor(vendor)}</span>
                <span className="truncate text-slate-600">{vendor.email || vendor.vendorEmail}</span>
                <span className="truncate text-xs text-slate-500">{vendor.vendorCategory || "No category selected"}</span>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusTone[vendor.vendorStatus] || statusTone.PENDING}`}>{statusLabel(vendor.vendorStatus || "PENDING")}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-500">Page {page + 1} of {totalPages} · {totalElements} vendors</span>
            <div className="flex gap-2"><button type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(value - 1, 0))} className="rounded-xl bg-[#edf7fb] px-4 py-2 font-black text-[#166e8c] disabled:opacity-40">Previous</button><button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-xl bg-[#166e8c] px-4 py-2 font-black text-white disabled:opacity-40">Next</button></div>
          </div>
        </div>

        <div id="dpc-vendor-details" className="scroll-mt-28 rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          {!selected ? (
            <div className="rounded-[22px] bg-slate-50 p-5 text-sm text-slate-600">Select a vendor to review details.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Vendor Details</div>
                  <h2 className="mt-2 text-2xl font-black text-[#10283f]">{displayVendor(selected)}</h2>
                  <div className="mt-1 text-sm text-slate-600">{selected.email || selected.vendorEmail}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone[selected.vendorStatus] || statusTone.PENDING}`}>
                  {statusLabel(selected.vendorStatus || "PENDING")}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Detail label="Company Reg. No" value={selected.companyRegistrationNumber} />
                <Detail label="Contact Person" value={selected.vendorContactPerson} />
                <Detail label="Phone" value={selected.vendorPhone || selected.phoneNumber} />
                <Detail label="Registered At" value={formatDateTime(selected.createdAt)} />
                <Detail label="Address" value={selected.vendorAddress || selected.address} wide />
                <Detail label="Categories" value={selected.vendorCategory} wide />
              </div>

              <div>
                <div className="text-sm font-black text-[#10283f]">Submitted Documents</div>
                <div className="mt-3 grid gap-3">
                  {docs(selected).length === 0 && <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">No documents uploaded.</div>}
                  {docs(selected).map((doc) => (
                    <div key={doc.label} className="rounded-[18px] border border-[#dce8ef] bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-black text-[#10283f]">{doc.label}</div>
                          <div className="mt-1 text-xs text-slate-500">{doc.name}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setSelectedDoc(doc)} className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100">
                            <VisibilityRoundedIcon fontSize="small" />
                            View
                          </button>
                          <a href={doc.data} download={doc.name} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-[#166e8c] ring-1 ring-[#dce8ef] hover:bg-[#f5fbff]">
                            <DownloadRoundedIcon fontSize="small" />
                            Download
                          </a>
                        </div>
                      </div>
                      <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={documentIssues[doc.label]?.selected || false}
                          onChange={(event) => setDocumentIssues((current) => ({
                            ...current,
                            [doc.label]: { ...(current[doc.label] || { remarks: "" }), selected: event.target.checked },
                          }))}
                          className="h-4 w-4 accent-[#166e8c]"
                        />
                        Mark document issue
                      </label>
                      {documentIssues[doc.label]?.selected && (
                        <textarea
                          value={documentIssues[doc.label]?.remarks || ""}
                          onChange={(event) => setDocumentIssues((current) => ({
                            ...current,
                            [doc.label]: { ...(current[doc.label] || { selected: true }), selected: true, remarks: event.target.value },
                          }))}
                          rows={3}
                          placeholder={`Remarks for ${doc.label}`}
                          className="mt-3 w-full rounded-2xl border border-[#dce8ef] px-4 py-3 text-sm outline-none focus:border-[#166e8c]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-black text-[#10283f]" htmlFor="vendor-decision-remarks">Decision Remarks</label>
                <textarea
                  id="vendor-decision-remarks"
                  value={decisionRemarks}
                  onChange={(event) => setDecisionRemarks(event.target.value)}
                  rows={4}
                  placeholder="Add rejection reason or other DPC decision remarks"
                  className="mt-3 w-full rounded-2xl border border-[#dce8ef] px-4 py-3 text-sm outline-none focus:border-[#166e8c]"
                />
                {selected.rejectionReason && (
                  <div className="mt-3 rounded-[18px] bg-red-50 p-4 text-sm text-red-700">
                    <div className="font-black">Saved rejection reason</div>
                    <div className="mt-2 whitespace-pre-wrap">{selected.rejectionReason}</div>
                  </div>
                )}
                {selected.documentReviewRemarks && (
                  <div className="mt-3 rounded-[18px] bg-amber-50 p-4 text-sm text-amber-800">
                    <div className="font-black">Saved document remarks</div>
                    <div className="mt-2 whitespace-pre-wrap">{selected.documentReviewRemarks}</div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                {selected.vendorStatus !== "APPROVED" && (
                  <ActionButton icon={CheckRoundedIcon} label="Approve" onClick={() => action("approve", selected)} tone="bg-emerald-600 text-white hover:bg-emerald-700" />
                )}
                {selected.vendorStatus !== "REJECTED" && (
                  <ActionButton icon={CloseRoundedIcon} label="Reject" onClick={() => action("reject", selected)} tone="bg-red-50 text-red-700 hover:bg-red-100" />
                )}
                {selected.vendorStatus !== "BLACK_LISTED" && (
                  <ActionButton icon={BlockRoundedIcon} label="Black List" onClick={() => action("blacklist", selected)} tone="bg-slate-900 text-white hover:bg-slate-800" />
                )}
                {selected.vendorStatus !== "PENDING" && (
                  <ActionButton icon={ReplayRoundedIcon} label="Move to Pending" onClick={() => action("pending", selected)} tone="bg-amber-50 text-amber-700 hover:bg-amber-100" />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#166e8c]">Document Preview</div>
                <div className="mt-1 font-black text-[#10283f]">{selectedDoc.label}</div>
                <div className="mt-1 text-xs text-slate-500">{selectedDoc.name}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={selectedDoc.data} download={selectedDoc.name} className="inline-flex items-center gap-2 rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
                  <DownloadRoundedIcon fontSize="small" />
                  Download
                </a>
                <button type="button" onClick={() => setSelectedDoc(null)} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                  Close
                </button>
              </div>
            </div>
            <div className="min-h-[60vh] overflow-auto bg-slate-100 p-4">
              {isImageDocument(selectedDoc.data, selectedDoc.name) ? (
                <img src={selectedDoc.data} alt={selectedDoc.name} className="mx-auto max-h-[70vh] max-w-full rounded-xl bg-white object-contain" />
              ) : (
                <iframe title={selectedDoc.name} src={selectedDoc.data} className="h-[70vh] w-full rounded-xl bg-white" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, wide = false }) {
  return (
    <div className={`rounded-[18px] bg-slate-50 p-4 ${wide ? "md:col-span-2" : ""}`}>
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#166e8c]">{label}</div>
      <div className="mt-2 whitespace-pre-wrap text-sm font-semibold text-[#10283f]">{value || "Not provided"}</div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, tone }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold ${tone}`}>
      <Icon fontSize="small" />
      {label}
    </button>
  );
}
