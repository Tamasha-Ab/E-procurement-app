import { useEffect, useState } from "react";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";

export default function HodAuditTrail() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadAuditTrail = () => {
    setIsLoading(true);
    setError("");
    apiRequest("/api/approvals/hod/audit-trail?page=0&size=50", { token })
      .then((data) => {
        const list = data?.content || [];
        setRequests(list);
        setSelected((current) => current ? list.find((item) => item.rrId === current.rrId) || list[0] || null : list[0] || null);
      })
      .catch((err) => setError(err.message || "Could not load Division Head audit trail."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAuditTrail();
  }, [token]);

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

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Timeline RR List</div>
            <button type="button" onClick={loadAuditTrail} className="rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
              Refresh
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {isLoading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading audit trail...</div>}
            {!isLoading && requests.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No RR audit records found.</div>}
            {requests.map((request) => (
              <button
                key={request.rrId}
                type="button"
                onClick={() => setSelected(request)}
                className={`w-full rounded-[26px] border p-5 text-left transition ${selected?.rrId === request.rrId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-black text-[#10283f]">{request.title}</h3>
                  <StatusPill status={request.status} />
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-600">
                  {request.rrNumber} | {request.requestedByName || "Staff member"} | {formatMoney(request.estimatedTotalAmount)}
                </div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">
                  Updated {formatDateTime(request.updatedAt)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RR Details</div>
          {!selected ? (
            <div className="mt-6 rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Select an RR to view its full timeline.</div>
          ) : (
            <div className="mt-6 space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black text-[#10283f]">{selected.title}</h2>
                  <StatusPill status={selected.status} />
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{selected.description || "No description provided."}</p>
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
                        <div className="font-bold text-[#10283f]">{statusLabel(entry.action)} by {statusLabel(entry.actionRole)}</div>
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
          )}
        </div>
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

function DetailBlock({ title, value }) {
  return (
    <div className="rounded-[24px] bg-[#f8fcff] p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">{title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-600">{value}</div>
    </div>
  );
}
