import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";

export default function RequisitionDetails() {
  const { rrId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [status, setStatus] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);
  const [comments, setComments] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    Promise.all([
      apiRequest(`/api/staff/requisitions/${rrId}`, { token }),
      apiRequest(`/api/staff/requisitions/${rrId}/status`, { token }),
      apiRequest(`/api/staff/requisitions/${rrId}/comments`, { token }),
    ])
      .then(([requestData, statusData, commentData]) => {
        if (!active) return;
        setRequestDetails(requestData);
        setStatus(statusData);
        setComments(commentData);
      })
      .catch((err) => {
        if (active) setError(err.message || "Could not load requisition details.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [rrId, token]);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Request Tracking"
        title={status?.title || "Requisition Details"}
        description="Track the request status, approval history, and rejection or return comments."
      >
        {status?.status && (
          <div className="rounded-[24px] bg-white/10 p-5 backdrop-blur">
            <StatusPill status={status.status} />
            <div className="mt-3 text-sm text-slate-100">Stage: {status.currentStage}</div>
          </div>
        )}
      </PageHero>

      {isLoading && <div className="rounded-[30px] bg-white p-6 text-sm text-slate-600">Loading details...</div>}
      {error && <div className="rounded-[30px] bg-red-50 p-6 text-sm font-semibold text-red-700">{error}</div>}

      {!isLoading && !error && status && (
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Current State</div>
              {["DRAFT", "HOD_REJECTED"].includes(status.status) && (
                <button
                  type="button"
                  onClick={() => navigate(`/requisition/create/${rrId}`)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#166e8c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#145f79]"
                >
                  <EditRoundedIcon fontSize="small" />
                  Edit Request
                </button>
              )}
            </div>
            <div className="mt-5 space-y-4">
              <InfoRow label="RR Number" value={status.rrNumber} />
              <InfoRow label="Status" value={statusLabel(status.status)} />
              <InfoRow label="Stage" value={status.currentStage} />
              <InfoRow label="Estimated Total" value={formatMoney(requestDetails?.estimatedTotalAmount)} />
              <InfoRow label="Submitted" value={formatDateTime(status.submittedAt)} />
              <InfoRow label="Updated" value={formatDateTime(status.updatedAt)} />
            </div>

            {(status.rejectionReason || comments?.latestComment) && (
              <div className="mt-6 rounded-[24px] bg-[#fff9ec] p-5">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#b47a00]">Latest Comment</div>
                <div className="mt-2 text-sm leading-7 text-[#10283f]">{status.rejectionReason || comments.latestComment}</div>
              </div>
            )}
          </div>

          <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Submitted RR Details</div>
            <div className="mt-5 space-y-4">
              <InfoRow label="Faculty" value={requestDetails?.facultyName} />
              <InfoRow label="Division" value={requestDetails?.divisionName} />
              <InfoRow label="Description" value={requestDetails?.description} />
              <InfoRow label="Justification" value={requestDetails?.justification} />
            </div>

            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Items</div>
              <div className="mt-4 space-y-3">
                {(requestDetails?.items || []).length === 0 && (
                  <div className="rounded-[22px] bg-slate-50 p-4 text-sm text-slate-600">No item details recorded.</div>
                )}
                {(requestDetails?.items || []).map((item, index) => (
                  <div key={item.itemId || index} className="rounded-[22px] bg-slate-50 p-4">
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
            </div>
          </div>

          <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Approval Timeline</div>
            <div className="mt-6 space-y-4">
              {(status.approvalHistory || []).length === 0 && (
                <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No approval history yet.</div>
              )}
              {(status.approvalHistory || []).map((item, index) => (
                <div key={item.approvalId || index} className="flex gap-4 rounded-[24px] bg-slate-50 p-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#0f2940] text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-[#10283f]">{statusLabel(item.action)} by {item.actionRole || "User"}</div>
                    <div className="mt-1 text-sm text-slate-600">{item.comment || `${statusLabel(item.fromStatus)} to ${statusLabel(item.toStatus)}`}</div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{formatDateTime(item.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-[22px] bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#166e8c]">{label}</div>
      <div className="mt-2 text-sm font-semibold text-[#10283f]">{value || "Not available"}</div>
    </div>
  );
}
