import { useEffect, useState } from "react";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";
import { requestDisplayName, requestContext } from "../../utils/procurementDisplay";

export default function StaffAuditTrail() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadAuditTrail = () => {
    setIsLoading(true);
    setError("");
    apiRequest("/api/staff/requisitions/audit-trail?page=0&size=50", { token })
      .then((data) => {
        const list = data?.content || [];
        setRequests(list);
        setSelected((current) => current ? list.find((item) => item.rrId === current.rrId) || list[0] || null : list[0] || null);
      })
      .catch((err) => setError(err.message || "Could not load staff audit trail."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (token) loadAuditTrail();
  }, [token]);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Staff Workspace"
        title="Audit Trail"
        description="Track your requisition requests from draft submission through every approval action and comment."
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
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">My RR List</div>
            <button type="button" onClick={loadAuditTrail} className="rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
              Refresh
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {isLoading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading audit trail...</div>}
            {!isLoading && requests.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No audit records found.</div>}
            {requests.map((request) => (
              <button
                key={request.rrId}
                type="button"
                onClick={() => setSelected(request)}
                className={`w-full rounded-[26px] border p-5 text-left transition ${selected?.rrId === request.rrId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-black text-[#10283f]">{requestDisplayName(request)}</h3>
                  <StatusPill status={request.status} />
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-600">
                  {requestContext(request) || "Request"} | {formatMoney(request.estimatedTotalAmount)}
                </div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">
                  Updated {formatDateTime(request.updatedAt)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Timeline</div>
          {!selected ? (
            <div className="mt-6 rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Select an RR to view its timeline.</div>
          ) : (
            <div className="mt-6 space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black text-[#10283f]">{requestDisplayName(selected)}</h2>
                  <StatusPill status={selected.status} />
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{selected.description || "No description provided."}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <DetailTile label="Request Name" value={requestDisplayName(selected)} />
                <DetailTile label="Stage" value={statusLabel(selected.currentStage)} />
                <DetailTile label="Division" value={selected.divisionName || "Not recorded"} />
                <DetailTile label="Estimated Total" value={formatMoney(selected.estimatedTotalAmount)} />
              </div>

              <section className="rounded-[24px] border border-[#dce8ef] bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Approval Timeline</div>
                <div className="mt-4 space-y-3">
                  {(selected.approvalHistory || []).length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No timeline entries recorded yet.</div>
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
