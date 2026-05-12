import { useEffect, useState } from "react";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatMoney } from "../../services/apiClient";

const emptySpecForm = {
  specId: null,
  itemId: "",
  specificationText: "",
  attachmentUrl: "",
  recommendedProcurementMethod: "RFQ",
};

const priorityOptions = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

export default function ApprovalQueue({ roleKey, title, description, pendingUrl, actionBaseUrl, acceptedUrl, specificationBaseUrl }) {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedAccepted, setSelectedAccepted] = useState(null);
  const [specForm, setSpecForm] = useState(emptySpecForm);
  const [comment, setComment] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [itemPriorities, setItemPriorities] = useState({});
  const [itemDecisions, setItemDecisions] = useState({});
  const [itemComments, setItemComments] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  const loadRequests = () => {
    setIsLoading(true);
    setError("");
    apiRequest(`${pendingUrl}?page=0&size=20`, { token })
      .then((data) => setRequests(data?.content || []))
      .catch((err) => setError(err.message || "Could not load pending requests."))
      .finally(() => setIsLoading(false));
  };

  const loadAcceptedRequests = () => {
    if (!acceptedUrl) return;
    apiRequest(`${acceptedUrl}?page=0&size=20`, { token })
      .then((data) => setAcceptedRequests(data?.content || []))
      .catch((err) => setError(err.message || "Could not load accepted requests."));
  };

  useEffect(() => {
    loadRequests();
    loadAcceptedRequests();
  }, [pendingUrl, acceptedUrl, token]);

  const performAction = async (action) => {
    if (!selected) return;
    const selectedItems = selected.items || [];
    const isMultiItemReview = selectedItems.length > 1;
    let endpointAction = action;
    if (isMultiItemReview && action === "review-items") {
      const missingDecision = selectedItems.find((item) => !itemDecisions[item.itemId]);
      if (missingDecision) {
        setError(`Decision is required for ${missingDecision.itemName || "each item"}.`);
        return;
      }
      const missingPriority = selectedItems.find((item) => !itemPriorities[item.itemId]);
      if (missingPriority) {
        setError(`Priority is required for ${missingPriority.itemName || "each item"}.`);
        return;
      }
      const rejectedWithoutComment = selectedItems.find((item) => itemDecisions[item.itemId] === "REJECTED" && !itemComments[item.itemId]?.trim());
      if (rejectedWithoutComment) {
        setError(`Rejection comment is required for ${rejectedWithoutComment.itemName || "each rejected item"}.`);
        return;
      }
      const hasApprovedItem = selectedItems.some((item) => itemDecisions[item.itemId] === "APPROVED");
      endpointAction = hasApprovedItem ? "approve" : "reject";
    }
    if (!isMultiItemReview && action === "approve" && !priority) {
      setError("Priority is required before adding the RR to the final list.");
      return;
    }
    setError("");
    setMessage("");
    setIsActing(true);

    try {
      await apiRequest(`${actionBaseUrl}/${selected.rrId}/${endpointAction}`, {
        token,
        method: "POST",
        body: {
          comment: isMultiItemReview ? "" : comment,
          priority: !isMultiItemReview && endpointAction === "approve" ? priority : null,
          itemPriorities: isMultiItemReview ? itemPriorities : null,
          itemDecisions: isMultiItemReview ? itemDecisions : null,
          itemComments: isMultiItemReview ? itemComments : null,
        },
      });
      setMessage(isMultiItemReview
        ? `${selected.rrNumber} item review saved.`
        : `${selected.rrNumber} ${endpointAction} completed.`);
      setSelected(null);
      setComment("");
      setPriority("MEDIUM");
      setItemPriorities({});
      setItemDecisions({});
      setItemComments({});
      loadRequests();
      loadAcceptedRequests();
    } catch (err) {
      setError(err.message || `Could not ${action} request.`);
    } finally {
      setIsActing(false);
    }
  };

  const submitFinalListToTec = async () => {
    setError("");
    setMessage("");
    setIsActing(true);
    try {
      const submitted = await apiRequest(`${actionBaseUrl}/final-list/submit`, {
        token,
        method: "POST",
        body: { comment: "Division Head final list approved and submitted to TEC" },
      });
      setMessage(`${submitted?.length || 0} RR${submitted?.length === 1 ? "" : "s"} submitted to TEC.`);
      setSelectedAccepted(null);
      resetSpecForm();
      loadRequests();
      loadAcceptedRequests();
    } catch (err) {
      setError(err.message || "Could not submit final list to TEC.");
    } finally {
      setIsActing(false);
    }
  };

  const startSpecEdit = (spec) => {
    setSpecForm({
      specId: spec.specId,
      itemId: spec.itemId || "",
      specificationText: spec.specificationText || "",
      attachmentUrl: spec.attachmentUrl || "",
      recommendedProcurementMethod: spec.recommendedProcurementMethod || "RFQ",
    });
  };

  const resetSpecForm = () => setSpecForm(emptySpecForm);

  const selectPendingRequest = (request) => {
    const nextItemPriorities = {};
    const nextItemDecisions = {};
    const nextItemComments = {};
    (request.items || []).forEach((item) => {
      nextItemPriorities[item.itemId] = item.priority || request.priority || "MEDIUM";
      nextItemDecisions[item.itemId] = item.hodDecision || "";
      nextItemComments[item.itemId] = item.hodComment || "";
    });
    setSelected(request);
    setComment("");
    setPriority(request.priority || "MEDIUM");
    setItemPriorities(nextItemPriorities);
    setItemDecisions(nextItemDecisions);
    setItemComments(nextItemComments);
  };

  const saveSpecification = async (event) => {
    event.preventDefault();
    if (!selectedAccepted || !specificationBaseUrl) return;
    setError("");
    setMessage("");
    setIsActing(true);

    try {
      await apiRequest(
        specForm.specId
          ? `${specificationBaseUrl}/specifications/${specForm.specId}`
          : `${specificationBaseUrl}/${selectedAccepted.rrId}/specifications`,
        {
          token,
          method: specForm.specId ? "PUT" : "POST",
          body: {
            itemId: specForm.itemId ? Number(specForm.itemId) : null,
            specificationText: specForm.specificationText,
            attachmentUrl: specForm.attachmentUrl || null,
            recommendedProcurementMethod: specForm.recommendedProcurementMethod,
          },
        }
      );
      setMessage("Specification saved.");
      resetSpecForm();
      await loadAcceptedRequests();
      const refreshed = await apiRequest(`${acceptedUrl}?page=0&size=20`, { token });
      const nextSelected = (refreshed?.content || []).find((item) => item.rrId === selectedAccepted.rrId);
      setSelectedAccepted(nextSelected || null);
    } catch (err) {
      setError(err.message || "Could not save specification.");
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHero eyebrow="Approval Workflow" title={title} description={description}>
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Pending</div>
          <div className="mt-2 text-3xl font-black">{requests.length}</div>
        </div>
      </PageHero>

      {(message || error) && (
        <div className={`rounded-[24px] p-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">{roleKey} Queue</div>
          <div className="mt-6 space-y-4">
            {isLoading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading pending requests...</div>}
            {!isLoading && requests.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No pending requests.</div>}
            {requests.map((request) => (
              <button
                key={request.rrId}
                type="button"
                onClick={() => selectPendingRequest(request)}
                className={`w-full rounded-[26px] border p-5 text-left transition ${selected?.rrId === request.rrId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-black text-[#10283f]">{request.title}</h3>
                  <StatusPill status={request.status} />
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-600">
                  {request.rrNumber} | {request.divisionName || request.facultyName || "Division"} | {formatMoney(request.estimatedTotalAmount)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Decision Panel</div>
          {!selected ? (
            <div className="mt-6 rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Select a pending request to approve, reject, or return.</div>
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
                <DetailTile label="Current Status" value={selected.status} />
              </div>

              <div className="rounded-[24px] bg-[#f8fcff] p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Justification</div>
                <div className="mt-2 text-sm leading-7 text-slate-600">{selected.justification || "No justification provided."}</div>
              </div>

              {selected.rejectionReason && (
                <div className="rounded-[24px] border border-red-200 bg-red-50 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">Rejected by TEC</div>
                  <div className="mt-2 text-sm leading-7 text-red-700">{selected.rejectionReason}</div>
                </div>
              )}

              <div className="rounded-[24px] border border-[#dce8ef] bg-white p-5">
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
                        </div>
                        <div className="text-right text-sm font-bold text-[#166e8c]">
                          {formatMoney(item.estimatedTotalPrice)}
                        </div>
                      </div>
                      <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Qty {item.quantity} {item.unitOfMeasure || "Units"} | Unit {formatMoney(item.estimatedUnitPrice)}
                      </div>
                      {(selected.items || []).length > 1 && (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label className="block space-y-2">
                            <span className="text-sm font-bold text-[#10283f]">Item Decision</span>
                            <select
                              value={itemDecisions[item.itemId] || ""}
                              onChange={(event) => setItemDecisions((current) => ({
                                ...current,
                                [item.itemId]: event.target.value,
                              }))}
                              className="w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 outline-none focus:border-[#166e8c]"
                            >
                              <option value="">Select decision</option>
                              <option value="APPROVED">Approve</option>
                              <option value="REJECTED">Reject</option>
                            </select>
                          </label>
                          <label className="block space-y-2">
                            <span className="text-sm font-bold text-[#10283f]">Item Priority</span>
                            <select
                              value={itemPriorities[item.itemId] || ""}
                              onChange={(event) => setItemPriorities((current) => ({
                                ...current,
                                [item.itemId]: event.target.value,
                              }))}
                              className="w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 outline-none focus:border-[#166e8c]"
                            >
                              <option value="">Select priority</option>
                              {priorityOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="block space-y-2 md:col-span-2">
                            <span className="text-sm font-bold text-[#10283f]">Item Comment</span>
                            <textarea
                              value={itemComments[item.itemId] || ""}
                              onChange={(event) => setItemComments((current) => ({
                                ...current,
                                [item.itemId]: event.target.value,
                              }))}
                              rows={3}
                              className="w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 outline-none focus:border-[#166e8c]"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {(selected.items || []).length <= 1 ? (
                <>
                  <label className="space-y-2 block">
                    <span className="text-sm font-bold text-[#10283f]">Decision comment</span>
                    <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={5} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-bold text-[#10283f]">RR Priority</span>
                    <select value={priority} onChange={(event) => setPriority(event.target.value)} className="w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 outline-none focus:border-[#166e8c]">
                      {priorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-3 md:grid-cols-3">
                    <button disabled={isActing} onClick={() => performAction("approve")} className="rounded-2xl bg-[#166e8c] px-4 py-3 font-bold text-white hover:bg-[#145f79] disabled:opacity-60">Add to Final List</button>
                    <button disabled={isActing} onClick={() => performAction("reject")} className="rounded-2xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60">Reject</button>
                    <button disabled={isActing} onClick={() => performAction("return")} className="rounded-2xl bg-[#0f2940] px-4 py-3 font-bold text-white hover:bg-[#173b5a] disabled:opacity-60">Return</button>
                  </div>
                </>
              ) : (
                <button disabled={isActing} onClick={() => performAction("review-items")} className="w-full rounded-2xl bg-[#166e8c] px-4 py-3 font-bold text-white hover:bg-[#145f79] disabled:opacity-60">
                  Save Item Review
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {acceptedUrl && (
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Division Head Final List</div>
                <div className="mt-2 text-sm text-slate-600">Approved RRs are held here until the final list is submitted to TEC.</div>
              </div>
              <button type="button" disabled={isActing || acceptedRequests.length === 0} onClick={submitFinalListToTec} className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79] disabled:opacity-60">
                Submit Final List to TEC
              </button>
            </div>
            <div className="mt-6 space-y-4">
              {acceptedRequests.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No RRs in the final list yet.</div>}
              {acceptedRequests.map((request) => (
                <button
                  key={request.rrId}
                  type="button"
                  onClick={() => {
                    setSelectedAccepted(request);
                    resetSpecForm();
                  }}
                  className={`w-full rounded-[26px] border p-5 text-left transition ${selectedAccepted?.rrId === request.rrId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"}`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-black text-[#10283f]">{request.title}</h3>
                    <StatusPill status={request.status} />
                  </div>
                  <div className="mt-2 text-sm leading-7 text-slate-600">
                    {request.rrNumber} | {request.divisionName || request.facultyName || "Division"} | Priority {request.priority || "Not set"} | Specs {(request.technicalSpecifications || []).length}
                  </div>
                  {(request.items || []).length > 1 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(request.items || []).filter((item) => item.hodDecision !== "REJECTED").map((item, index) => (
                        <span key={item.itemId || index} className="rounded-full bg-[#edf7fb] px-3 py-1 text-xs font-bold text-[#166e8c]">
                          {item.itemName || `Item ${index + 1}`}: {item.priority || "Not set"}
                        </span>
                      ))}
                    </div>
                  )}
                  {(request.items || []).some((item) => item.hodComment || item.hodDecision) && (
                    <div className="mt-3 space-y-2">
                      {(request.items || []).map((item, index) => (
                        <div key={item.itemId || index} className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                          <span className="font-bold text-[#10283f]">{item.itemName || `Item ${index + 1}`}</span>
                          {item.hodDecision ? ` | ${item.hodDecision}` : ""}
                          {item.hodComment ? ` | ${item.hodComment}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Specifications</div>
            {!selectedAccepted ? (
              <div className="mt-6 rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Select an accepted RR to add or edit specifications.</div>
            ) : (
              <div className="mt-6 space-y-5">
                <div>
                  <h3 className="text-2xl font-black text-[#10283f]">{selectedAccepted.title}</h3>
                  <div className="mt-2 text-sm leading-7 text-slate-600">{selectedAccepted.rrNumber}</div>
                </div>

                <form onSubmit={saveSpecification} className="space-y-4 rounded-[24px] bg-[#f8fcff] p-5">
                  <label className="block space-y-2">
                    <span className="text-sm font-bold text-[#10283f]">Item</span>
                    <select value={specForm.itemId} onChange={(event) => setSpecForm((current) => ({ ...current, itemId: event.target.value }))} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]">
                      <option value="">General RR specification</option>
                      {(selectedAccepted.items || []).filter((item) => item.hodDecision !== "REJECTED").map((item) => (
                        <option key={item.itemId} value={item.itemId}>{item.itemName}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-bold text-[#10283f]">Specification</span>
                    <textarea value={specForm.specificationText} onChange={(event) => setSpecForm((current) => ({ ...current, specificationText: event.target.value }))} rows={5} required className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm font-bold text-[#10283f]">Procurement method</span>
                      <select value={specForm.recommendedProcurementMethod} onChange={(event) => setSpecForm((current) => ({ ...current, recommendedProcurementMethod: event.target.value }))} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]">
                        <option value="RFQ">RFQ</option>
                        <option value="OPEN_COMPETITIVE_BIDDING">Open Competitive Bidding</option>
                        <option value="NATIONAL_COMPETITIVE_BIDDING">National Competitive Bidding</option>
                      </select>
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-bold text-[#10283f]">Attachment URL</span>
                      <input value={specForm.attachmentUrl} onChange={(event) => setSpecForm((current) => ({ ...current, attachmentUrl: event.target.value }))} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button disabled={isActing} className="rounded-2xl bg-[#166e8c] px-5 py-3 font-bold text-white hover:bg-[#145f79] disabled:opacity-60">
                      {specForm.specId ? "Update Specification" : "Add Specification"}
                    </button>
                    {specForm.specId && (
                      <button type="button" onClick={resetSpecForm} className="rounded-2xl border border-[#dce8ef] px-5 py-3 font-bold text-[#10283f] hover:bg-slate-50">
                        New Specification
                      </button>
                    )}
                  </div>
                </form>

                <div className="space-y-3">
                  {(selectedAccepted.technicalSpecifications || []).length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No specifications added yet.</div>}
                  {(selectedAccepted.technicalSpecifications || []).map((spec) => (
                    <div key={spec.specId} className="rounded-[24px] border border-[#dce8ef] bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-[#10283f]">{spec.itemName || "General RR specification"}</div>
                          <div className="mt-2 text-sm leading-7 text-slate-600">{spec.specificationText}</div>
                          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{spec.recommendedProcurementMethod || "RFQ"}</div>
                        </div>
                        <button type="button" onClick={() => startSpecEdit(spec)} className="rounded-xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
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
