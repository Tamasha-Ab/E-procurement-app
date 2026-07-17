import { useEffect, useState } from "react";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatMoney } from "../../services/apiClient";

export default function TecApprovals() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = () => {
    setIsLoading(true);
    setError("");
    apiRequest("/api/approvals/tec/pending?page=0&size=20", { token })
      .then((data) => setRequests(data?.content || []))
      .catch((err) => setError(err.message || "Could not load TEC pending requests."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, [token]);

  const performDecision = async (decision) => {
    if (!selected) return;
    if (decision === "reject" && !comment.trim()) {
      setError("A rejection comment is required.");
      return;
    }

    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await apiRequest(`/api/approvals/tec/${selected.rrId}/${decision}`, {
        token,
        method: "POST",
        body: { comment },
      });
      setMessage(decision === "approve"
        ? `${selected.rrNumber} approved and submitted to Finance Officer.`
        : `${selected.rrNumber} rejected and returned to Division Head.`);
      setSelected(null);
      setComment("");
      loadRequests();
    } catch (err) {
      setError(err.message || "Could not complete TEC decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Technical Review"
        title="TEC Reviews"
        description="Review Division Head specifications, approve requests for Finance Officer, or reject them back to the Division Head with comments."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Pending Reviews</div>
          <div className="mt-2 text-3xl font-black">{requests.length}</div>
        </div>
      </PageHero>

      {(message || error) && (
        <div className={`rounded-[24px] p-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">TEC Queue</div>
          <div className="mt-6 space-y-4">
            {isLoading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading pending reviews...</div>}
            {!isLoading && requests.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No pending technical reviews.</div>}
            {requests.map((request) => (
              <button
                key={request.rrId}
                type="button"
                onClick={() => {
                  setSelected(request);
                  setComment("");
                }}
                className={`w-full rounded-[26px] border p-5 text-left transition ${selected?.rrId === request.rrId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-black text-[#10283f]">{request.title}</h3>
                  <StatusPill status={request.status} />
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-600">
                  {request.rrNumber} | {request.divisionName || request.facultyName || "Division"} | {formatMoney(request.estimatedTotalAmount)}
                </div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">
                  Specs {(request.technicalSpecifications || []).length}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Review Details</div>
          {!selected ? (
            <div className="mt-6 rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Select a request to review its details and specifications.</div>
          ) : (
            <div className="mt-6 space-y-5">
              <div>
                <h3 className="text-2xl font-black text-[#10283f]">{selected.title}</h3>
                <div className="mt-2 text-sm leading-7 text-slate-600">{selected.description || "No description provided."}</div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <DetailTile label="RR Number" value={selected.rrNumber} />
                <DetailTile label="Requested By" value={selected.requestedByName || "Staff member"} />
                <DetailTile label="Faculty" value={selected.facultyName || "Not recorded"} />
                <DetailTile label="Division" value={selected.divisionName || "Not recorded"} />
                <DetailTile label="Estimated Total" value={formatMoney(selected.estimatedTotalAmount)} />
                <DetailTile label="Status" value={selected.status} />
              </div>

              <DetailBlock title="Justification" value={selected.justification || "No justification provided."} />
              <FundingSummary request={selected} />

              <section className="rounded-[24px] border border-[#dce8ef] bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Requested Items</div>
                <div className="mt-4 space-y-3">
                  {(selected.items || []).length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No item details recorded.</div>
                  )}
                  {(selected.items || []).map((item, index) => (
                    <div key={item.itemId || index} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-[#10283f]">{item.itemName || `Item ${index + 1}`}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-600">{item.description || "No item description."}</div>
                          {item.specificationTable?.columns?.length > 0 && <SpecificationTable table={item.specificationTable} />}
                        </div>
                        <div className="text-right text-sm font-bold text-[#166e8c]">{formatMoney(item.estimatedTotalPrice)}</div>
                      </div>
                      <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Qty {item.quantity} {item.unitOfMeasure || "Units"} | Unit {formatMoney(item.estimatedUnitPrice)}
                        {item.priority ? ` | Priority ${item.priority}` : ""}
                        {item.hodDecision ? ` | HOD ${item.hodDecision}` : ""}
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
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Division Head Specifications</div>
                <div className="mt-4 space-y-3">
                  {(selected.technicalSpecifications || []).length === 0 && (
                    <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">No specifications have been added by the Division Head.</div>
                  )}
                  {(selected.technicalSpecifications || []).map((spec) => (
                    <div key={spec.specId} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-[#10283f]">{spec.itemName || "General RR specification"}</div>
                          <div className="mt-2 text-sm leading-7 text-slate-600">{spec.specificationText}</div>
                          {spec.attachmentUrl && (
                            <a href={spec.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-bold text-[#166e8c]">
                              Open attachment
                            </a>
                          )}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">
                          {spec.recommendedProcurementMethod || "RFQ"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-[#10283f]">TEC comment</span>
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <button disabled={isSubmitting} type="button" onClick={() => performDecision("approve")} className="rounded-2xl bg-[#166e8c] px-5 py-3 font-bold text-white hover:bg-[#145f79] disabled:opacity-60">
                  Approve and Send to Finance Officer
                </button>
                <button disabled={isSubmitting} type="button" onClick={() => performDecision("reject")} className="rounded-2xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60">
                  Reject to Division Head
                </button>
              </div>
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

function SpecificationTable({ table }) {
  return <div className="mt-4 overflow-x-auto rounded-xl border border-[#dce8ef] bg-white">
    <table className="min-w-full border-collapse text-sm">
      <thead><tr>{table.columns.map((column, index) => <th key={index} className="border-b border-r border-[#dce8ef] bg-[#edf8fb] p-3 text-left font-bold text-[#10283f]">{column}</th>)}</tr></thead>
      <tbody>{(table.rows || []).map((row, rowIndex) => <tr key={rowIndex}>{table.columns.map((_, columnIndex) => <td key={columnIndex} className="border-b border-r border-[#dce8ef] p-3 align-top text-slate-700">{row[columnIndex] || "—"}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}
function FundingSummary({ request }) {
  return <div className="rounded-[24px] bg-[#f8fcff] p-5">
    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Contact and Funds</div>
    <div className="mt-2 text-sm leading-7 text-slate-600">{request.contactPerson || "No contact person"} {request.contactTelephone ? `| ${request.contactTelephone}` : ""}</div>
    <div className="mt-2 text-sm leading-7 text-slate-600">{request.goslFunded ? "GOSL funded" : "Non-GOSL funding"} | Plan: {request.includedInProcurementPlan ? "Included" : "Not included"}{request.projectName ? ` | Project: ${request.projectName}` : ""}{request.voteNumber ? ` | Vote: ${request.voteNumber}` : ""}</div>
    <div className="mt-1 text-sm leading-7 text-slate-600">Allocation: {formatMoney(request.budgetAllocation)} | Used: {formatMoney(request.usedAmountSoFar)} | Available: {formatMoney(request.balanceAvailable)}</div>
  </div>;
}