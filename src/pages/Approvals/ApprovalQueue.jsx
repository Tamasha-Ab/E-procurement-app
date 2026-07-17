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

export default function ApprovalQueue({ roleKey, title, description, pendingUrl, actionBaseUrl, acceptedUrl, specificationBaseUrl, isDean = false, approveLabel = "Add to Final List", rejectLabel = "Return to Division Head" }) {
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
    const isMultiItemReview = !isDean && selectedItems.length > 1;
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

  const saveItemSpecificationTable = async (itemId, specificationTable) => {
    setError("");
    setMessage("");
    setIsActing(true);
    try {
      const updatedItem = await apiRequest(`/api/approvals/hod/items/${itemId}/specification-table`, {
        token,
        method: "PUT",
        body: specificationTable,
      });
      setSelected((current) => current ? {
        ...current,
        items: (current.items || []).map((item) => item.itemId === updatedItem.itemId ? updatedItem : item),
      } : current);
      setMessage("Item specification table updated.");
    } catch (err) {
      setError(err.message || "Could not update the item specification table.");
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
      setMessage(`${submitted?.length || 0} RR${submitted?.length === 1 ? "" : "s"} submitted to Dean.`);
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
              <FundingSummary request={selected} />

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
                          {item.specificationTable?.columns?.length > 0 && (roleKey === "HOD" ? <EditableSpecificationTable key={`${item.itemId}-${JSON.stringify(item.specificationTable)}`} table={item.specificationTable} onSave={(table) => saveItemSpecificationTable(item.itemId, table)} isSaving={isActing} /> : <SpecificationTable table={item.specificationTable} />)}
                        </div>
                        <div className="text-right text-sm font-bold text-[#166e8c]">
                          {formatMoney(item.estimatedTotalPrice)}
                        </div>
                      </div>
                      <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Qty {item.quantity} {item.unitOfMeasure || "Units"} | Unit {formatMoney(item.estimatedUnitPrice)}
                      </div>
                      {(selected.items || []).length > 1 && !isDean && (
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

              {((selected.items || []).length <= 1 || isDean) ? (
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

                  <div className={`grid gap-3 ${isDean ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
                    <button disabled={isActing} onClick={() => performAction("approve")} className="rounded-2xl bg-[#166e8c] px-4 py-3 font-bold text-white hover:bg-[#145f79] disabled:opacity-60">{approveLabel}</button>
                    <button disabled={isActing} onClick={() => performAction("reject")} className="rounded-2xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60">{isDean ? rejectLabel : "Reject"}</button>
                    {!isDean && <button disabled={isActing} onClick={() => performAction("return")} className="rounded-2xl bg-[#0f2940] px-4 py-3 font-bold text-white hover:bg-[#173b5a] disabled:opacity-60">Return</button>}
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
                <div className="mt-2 text-sm text-slate-600">Approved RRs are held here until the final list is submitted to the Dean.</div>
              </div>
              <button type="button" disabled={isActing || acceptedRequests.length === 0} onClick={submitFinalListToTec} className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79] disabled:opacity-60">
                Submit Final List to Dean
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
    <div className="mt-2 text-sm leading-7 text-slate-600">{request.goslFunded ? "GOSL funded" : "Non-GOSL funding"} | Plan: {request.includedInProcurementPlan ? "Included" : "Not included"} | Available: {formatMoney(request.balanceAvailable)}</div>
  </div>;
}
function EditableSpecificationTable({ table, onSave, isSaving }) {
  const [draft, setDraft] = useState(() => ({
    columns: [...(table.columns || [])],
    rows: (table.rows || []).map((row) => [...row]),
  }));
  const updateColumn = (columnIndex, value) => setDraft((current) => ({ ...current, columns: current.columns.map((column, index) => index === columnIndex ? value : column) }));
  const updateCell = (rowIndex, columnIndex, value) => setDraft((current) => ({ ...current, rows: current.rows.map((row, index) => index === rowIndex ? row.map((cell, cellIndex) => cellIndex === columnIndex ? value : cell) : row) }));
  const addColumn = () => setDraft((current) => ({ columns: [...current.columns, `Column ${current.columns.length + 1}`], rows: current.rows.map((row) => [...row, ""]) }));
  const removeColumn = (columnIndex) => setDraft((current) => current.columns.length <= 1 ? current : ({ columns: current.columns.filter((_, index) => index !== columnIndex), rows: current.rows.map((row) => row.filter((_, index) => index !== columnIndex)) }));
  const addRow = () => setDraft((current) => ({ ...current, rows: [...current.rows, current.columns.map(() => "")] }));
  const removeRow = (rowIndex) => setDraft((current) => current.rows.length <= 1 ? current : ({ ...current, rows: current.rows.filter((_, index) => index !== rowIndex) }));

  return <div className="mt-4 overflow-x-auto rounded-xl border border-[#9acbd9] bg-white p-3">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-bold uppercase tracking-[0.14em] text-[#166e8c]">Editable item specifications</div><div className="flex gap-2"><button type="button" onClick={addColumn} className="rounded-lg border border-[#9acbd9] px-2 py-1 text-xs font-bold text-[#166e8c]">Add column</button><button type="button" onClick={addRow} className="rounded-lg border border-[#9acbd9] px-2 py-1 text-xs font-bold text-[#166e8c]">Add row</button><button type="button" disabled={isSaving} onClick={() => onSave(draft)} className="rounded-lg bg-[#166e8c] px-3 py-1 text-xs font-bold text-white disabled:opacity-60">Save table</button></div></div>
    <table className="min-w-full border-collapse text-sm"><thead><tr>{draft.columns.map((column, columnIndex) => <th key={columnIndex} className="min-w-[160px] border border-[#dce8ef] bg-[#edf8fb] p-2"><div className="flex gap-1"><input value={column} onChange={(event) => updateColumn(columnIndex, event.target.value)} className="min-w-0 flex-1 bg-transparent font-bold outline-none" />{draft.columns.length > 1 && <button type="button" onClick={() => removeColumn(columnIndex)} className="text-red-600">×</button>}</div></th>)}<th className="border border-[#dce8ef] bg-[#edf8fb]" /></tr></thead><tbody>{draft.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, columnIndex) => <td key={columnIndex} className="border border-[#dce8ef] p-0"><textarea value={cell} onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)} rows={2} className="block w-full resize-y border-0 p-2 outline-none" /></td>)}<td className="border border-[#dce8ef] text-center">{draft.rows.length > 1 && <button type="button" onClick={() => removeRow(rowIndex)} className="text-red-600">×</button>}</td></tr>)}</tbody></table>
  </div>;
}