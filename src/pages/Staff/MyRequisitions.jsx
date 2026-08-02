import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney } from "../../services/apiClient";
import { requestDisplayName, requestContext } from "../../utils/procurementDisplay";

export default function MyRequisitions() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    apiRequest("/api/staff/requisitions?page=0&size=20", { token })
      .then((data) => {
        if (active) setRequests(data?.content || []);
      })
      .catch((err) => {
        if (active) setError(err.message || "Could not load requisitions.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Staff Workspace"
        title="My Requisitions"
        description="Review drafts and submitted requisitions. Drafts can be edited and submitted to the Division Head when ready."
      />

      <section className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Requisition Requests</div>

        {isLoading && <div className="mt-6 rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading requisitions...</div>}
        {error && <div className="mt-6 rounded-[24px] bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>}

        {!isLoading && !error && (
          <div className="mt-6 space-y-4">
            {requests.length === 0 && (
              <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No requisitions found.</div>
            )}

            {requests.map((request) => (
              <button
                key={request.rrId}
                type="button"
                onClick={() => navigate(["DRAFT", "HOD_REJECTED"].includes(request.status) ? `/requisition/create/${request.rrId}` : `/requisitions/${request.rrId}`)}
                className="grid w-full gap-4 rounded-[26px] border border-[#dce8ef] bg-[#f8fcff] p-5 text-left transition hover:border-[#166e8c] hover:bg-white md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-black text-[#10283f]">{requestDisplayName(request)}</h3>
                    <StatusPill status={request.status} />
                  </div>
                  <div className="mt-2 text-sm leading-7 text-slate-600">
                    {requestContext(request) || `Stage: ${request.currentStage}`} | {request.status === "DRAFT" ? `Updated: ${formatDateTime(request.updatedAt)}` : `Submitted: ${formatDateTime(request.submittedAt)}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Estimated</div>
                  <div className="mt-1 text-xl font-black text-[#10283f]">{formatMoney(request.estimatedTotalAmount)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
