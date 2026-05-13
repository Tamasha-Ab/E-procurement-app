import { useCallback, useEffect, useState } from "react";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateTime } from "../../services/apiClient";

const cardClass = "rounded-[28px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

export default function ProcurementRfqList() {
  const { token } = useAuth();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRfqs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await procurementApi.rfqs.list(token);
      setRfqs(getArray(data));
    } catch (err) {
      setError(err.message || "Could not load RFQs.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadRfqs();
  }, [token, loadRfqs]);

  return (
    <div className="space-y-7">
      <PageHero
        eyebrow="Procurement Officer"
        title="Created RFQs"
        description="Review the RFQs created for submitted tenders, including tender links, deadlines, bid opening times, and current status."
      />

      <section className={cardClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RFQ Records</div>
            <h2 className="mt-2 text-2xl font-black text-[#10283f]">All created RFQs</h2>
          </div>
          <button
            type="button"
            onClick={loadRfqs}
            className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {!loading && rfqs.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-[#c8dce7] bg-[#f8fbfd] p-6 text-sm leading-7 text-slate-600">
              No RFQs have been created yet.
            </div>
          )}

          {rfqs.map((rfq) => (
            <article key={rfq.rfqId} className="rounded-[24px] border border-[#e0ebf1] bg-[#fbfdff] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black text-[#10283f]">{rfq.title || rfq.rfqNumber}</h3>
                    <StatusPill status={rfq.status} />
                  </div>
                  <div className="mt-2 text-sm leading-7 text-slate-600">
                    {rfq.rfqNumber || `RFQ ${rfq.rfqId}`} | Created by {rfq.createdByName || "Procurement Officer"}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#edf7fb] px-4 py-3 text-sm font-bold text-[#166e8c]">
                  {rfq.tenderNumber ? `${rfq.tenderNumber} - ${rfq.tenderTitle || "Untitled tender"}` : "No tender linked"}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Detail label="Linked RR" value={rfq.rrNumber || "Tender-level RFQ"} />
                <Detail label="Bid Start" value={formatDateTime(rfq.bidStartDateTime)} />
                <Detail label="Submission Deadline" value={formatDateTime(rfq.submissionDeadline)} />
                <Detail label="Bid Opening" value={formatDateTime(rfq.bidOpeningDateTime)} />
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Detail label="Objection Deadline" value={formatDateTime(rfq.objectionDeadline)} />
                <Detail label="Created At" value={formatDateTime(rfq.createdAt)} />
              </div>

              {rfq.description && (
                <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-7 text-slate-600">
                  {rfq.description}
                </div>
              )}
            </article>
          ))}
        </div>

        {loading && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            Loading RFQs...
          </div>
        )}
      </section>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-bold text-[#10283f]">{value || "Not set"}</div>
    </div>
  );
}
