import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PageHero from "../../components/PageHero";
import PaginationControls, { usePagination } from "../../components/PaginationControls";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";
import { divisionHeadPath } from "../../utils/roleRoutes";

export default function HodAuditTrail() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const detailsRef = useRef(null);
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { page, setPage, totalPages, pageItems, pageSize } = usePagination(requests);
  const selectedIsOutsideProcurementPlan = selected?.description
    ?.split(/\r?\n/)
    .some((line) => /^included in procurement plan:\s*no\s*$/i.test(line.trim()));

  const loadAuditTrail = () => {
    setIsLoading(true);
    setError("");
    apiRequest("/api/approvals/hod/audit-trail?page=0&size=50", { token })
      .then((data) => {
        const list = data?.content || [];
        setRequests(list);
        setSelected((current) => current ? list.find((item) => item.rrId === current.rrId) || null : null);
      })
      .catch((err) => setError(err.message || "Could not load Division Head audit trail."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAuditTrail();
  }, [token]);

  const selectRequest = (request) => {
    setSelected(request);
    window.requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Audit Trail"
        title="Division Head RR Timeline"
        description="Review every requisition in your division with item details, specifications, comments, and timeline actions."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Records</div>
          <div className="mt-2 text-3xl font-black">{requests.length}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="space-y-6">
        <div className="overflow-hidden rounded-[30px] border border-[#dce8ef] bg-white shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#e6eef3] px-5 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Timeline RR List</div>
            <button type="button" onClick={loadAuditTrail} className="rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
              Refresh
            </button>
          </div>

          <div className="space-y-3 overflow-x-auto p-5">
            <div className="grid min-w-[1040px] grid-cols-[48px_220px_220px_130px_170px_210px] gap-1 rounded-xl bg-[#f5fbff] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#166e8c]">
              <span></span><span>RR</span><span>Details</span><span>Amount</span><span>Status</span><span className="pl-10">Date / Time</span>
            </div>
            {isLoading && <div className="p-5 text-sm text-slate-600">Loading audit trail...</div>}
            {!isLoading && requests.length === 0 && <div className="p-5 text-sm text-slate-600">No RR audit records found.</div>}
            {pageItems.map((request) => (
              <button
                key={request.rrId}
                type="button"
                onClick={() => selectRequest(request)}
                className={`grid min-w-[1040px] w-full grid-cols-[48px_220px_220px_130px_170px_210px] items-center gap-1 rounded-xl border px-3 py-2.5 text-left transition ${selected?.rrId === request.rrId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf7fb] text-[#166e8c]"><HistoryRoundedIcon sx={{ fontSize: 17 }} /></span>
                <span className="min-w-0"><span className="block truncate text-sm font-bold text-[#10283f]">{request.title}</span><span className="mt-0.5 block truncate text-[10px] font-semibold text-[#166e8c]">{request.rrNumber}</span></span>
                <span className="truncate text-xs text-slate-600">{request.requestedByName || "Staff member"}</span>
                <span className="whitespace-nowrap text-xs font-bold text-[#10283f]">{formatMoney(request.estimatedTotalAmount)}</span>
                <span><StatusPill status={request.status} /></span>
                <span className="whitespace-nowrap border-l border-[#dce8ef] pl-10 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#166e8c]">{formatDateTime(request.updatedAt)}</span>
              </button>
            ))}
          </div>
          <div className="px-5 pb-5"><PaginationControls page={page} setPage={setPage} totalPages={totalPages} totalItems={requests.length} pageSize={pageSize} /></div>
        </div>

        {selected && (
        <div ref={detailsRef} className="scroll-mt-24 rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RR Details</div>
            <div className="mt-6 space-y-5">
              {selectedIsOutsideProcurementPlan && (
                <div className="rounded-[22px] border border-amber-300 bg-amber-50 p-5">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">Outside the procurement plan</div>
                  <div className="mt-1 text-sm font-bold text-[#6f4808]">Included in procurement plan: No</div>
                  <p className="mt-2 text-sm leading-6 text-amber-900/80">VC approval is required regardless of the RR amount before it can continue to BEC review.</p>
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black text-[#10283f]">{selected.title}</h2>
                  <StatusPill status={selected.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">Review the audit summary below or open the complete requisition form with every submitted field and item specification.</p>
                <button
                  type="button"
                  onClick={() => navigate(`${divisionHeadPath("approvals")}/${selected.rrId}`)}
                  className="mt-4 rounded-2xl bg-[#166e8c] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#125d77]"
                >
                  View Details
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <DetailTile label="RR Number" value={selected.rrNumber} />
                <DetailTile label="Requested By" value={selected.requestedByName || "Staff member"} />
                <DetailTile label="Faculty" value={selected.facultyName || "Not recorded"} />
                <DetailTile label="Division" value={selected.divisionName || "Not recorded"} />
                <DetailTile label="Estimated Total" value={formatMoney(selected.estimatedTotalAmount)} />
                <DetailTile label="Stage" value={statusLabel(selected.currentStage)} />
              </div>

              <DetailBlock title="Justification" value={selected.justification || "No justification provided."} />

              <section className="rounded-[24px] border border-[#dce8ef] bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Items and HOD Review</div>
                <div className="mt-4 space-y-3">
                  {(selected.items || []).map((item, index) => (
                    <div key={item.itemId || index} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-[#10283f]">{item.itemName || `Item ${index + 1}`}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-600">{item.description || "No item description."}</div>
                        </div>
                        <div className="text-sm font-bold text-[#166e8c]">{formatMoney(item.estimatedTotalPrice)}</div>
                      </div>
                      <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Qty {item.quantity} {item.unitOfMeasure || "Units"} | Unit {formatMoney(item.estimatedUnitPrice)}
                        {item.priority ? ` | Priority ${statusLabel(item.priority)}` : ""}
                        {item.hodDecision ? ` | HOD ${statusLabel(item.hodDecision)}` : ""}
                      </div>
                      {item.hodComment && (
                        <div className="mt-3 rounded-2xl bg-white p-3 text-sm leading-6 text-slate-600">
                          <span className="font-bold text-[#10283f]">HOD Comment: </span>{item.hodComment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-[#dce8ef] bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Specifications Approved by Division Head</div>
                <div className="mt-4 space-y-3">
                  {(selected.technicalSpecifications || []).length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No specifications recorded yet.</div>
                  )}
                  {(selected.technicalSpecifications || []).map((spec) => (
                    <div key={spec.specId} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-[#10283f]">{spec.itemName || "General RR specification"}</div>
                          <div className="mt-2 text-sm leading-7 text-slate-600">{spec.specificationText}</div>
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">
                          {spec.status ? statusLabel(spec.status) : "DRAFT"}
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Method {statusLabel(spec.recommendedProcurementMethod || "RFQ")} | Updated {formatDateTime(spec.updatedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-[#dce8ef] bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Approval Timeline</div>
                <div className="mt-4 space-y-3">
                  {(selected.approvalHistory || []).length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No timeline entries recorded.</div>
                  )}
                  {(selected.approvalHistory || []).map((entry, index) => (
                    <div key={entry.approvalId || index} className="flex gap-4 rounded-2xl bg-slate-50 p-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#0f2940] text-white">
                        <HistoryRoundedIcon fontSize="small" />
                      </div>
                      <div>
                        <div className="font-bold text-[#10283f]">{timelineEntryTitle(entry)}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">
                          {statusLabel(entry.fromStatus)} to {statusLabel(entry.toStatus)}
                        </div>
                        {entry.comment && <div className="mt-2 text-sm leading-6 text-slate-600">{entry.comment}</div>}
                        <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{formatDateTime(entry.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
        </div>
        )}
      </section>
    </div>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-[20px] bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{label}</div>
      <div className="mt-2 text-sm font-bold text-[#10283f]">{value || "Not available"}</div>
    </div>
  );
}

function timelineEntryTitle(entry) {
  const submittedToDean = entry?.toStatus === "SUBMITTED_TO_DEAN"
    || entry?.comment?.toLowerCase().includes("submitted to dean");
  if (submittedToDean) return "Division Head approved RR submitted to Dean";
  return `${statusLabel(entry?.action)} by ${statusLabel(entry?.actionRole)}`;
}

function DetailBlock({ title, value }) {
  return (
    <div className="rounded-[24px] bg-[#f8fcff] p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">{title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-600">{value}</div>
    </div>
  );
}
