import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney } from "../../services/apiClient";

const sampleImageSrc = (spec) => {
  if (!spec?.sampleImageBase64) return null;
  return `data:${spec.sampleImageContentType || "image/jpeg"};base64,${spec.sampleImageBase64}`;
};

const specificationImages = (spec) => {
  if (spec?.sampleImages?.length) {
    return spec.sampleImages
      .filter((image) => image.imageBase64)
      .map((image) => ({
        name: image.imageName || "Sample image",
        src: `data:${image.contentType || "image/jpeg"};base64,${image.imageBase64}`,
      }));
  }
  const legacySrc = sampleImageSrc(spec);
  return legacySrc ? [{ name: spec.sampleImageName || "Sample image", src: legacySrc }] : [];
};

const parseSpecificationTableRows = (specificationText = "") => specificationText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("Item Name") && !line.startsWith("Qty"))
  .map((line) => {
    const numberedMatch = line.match(/^\d+\.\s*(.*?)\s+-\s*(.*)$/);
    if (numberedMatch) return { description: numberedMatch[1], requiredSpecification: numberedMatch[2] };
    const [description, ...requiredParts] = line.split(":");
    return { description: description?.trim() || "", requiredSpecification: requiredParts.join(":").trim() };
  })
  .filter((row) => row.description || row.requiredSpecification);

const parseSubmittedForm = (description = "") => {
  const form = {};
  description.split(/\r?\n/).forEach((line) => {
    const [rawKey, ...rawValueParts] = line.split(":");
    if (!rawKey || rawValueParts.length === 0) return;
    const key = rawKey.trim();
    const value = rawValueParts.join(":").trim();

    if (key === "Faculty/Admin") form.facultyAdmin = value;
    if (key === "Department/Branch") form.departmentBranch = value;
    if (key === "Contact Person") form.contactPerson = value;
    if (key === "Telephone No") form.telephoneNo = value;
    if (key === "Included in procurement plan") form.includedInPlan = value;
    if (key === "Budgeted allocation") form.budgetAllocation = value;
    if (key === "Used amount so far") form.usedAmount = value;
    if (key === "Balance available") form.balanceAvailable = value;
    if (key === "Purpose") form.purpose = value;

    if (key === "Funds") {
      const fundsMatch = value.match(/GOSL\s+(Yes|No),\s+Project\s+(.*),\s+Vote\s+(.*)$/i);
      if (fundsMatch) {
        form.fundsGosl = fundsMatch[1];
        form.project = fundsMatch[2];
        form.vote = fundsMatch[3];
      }
    }
  });
  return form;
};

export default function BecCategoryList() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { rrId } = useParams();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingCategory, setSubmittingCategory] = useState("");
  const [undoingId, setUndoingId] = useState(null);

  const selectedRequest = useMemo(
    () => requests.find((request) => String(request.rrId) === String(rrId)),
    [requests, rrId]
  );

  const groupedRequests = useMemo(() => requests.reduce((groups, request) => {
    const category = request.vendorCategories || "Uncategorized";
    return {
      ...groups,
      [category]: [...(groups[category] || []), request],
    };
  }, {}), [requests]);

  const loadRequests = () => {
    setLoading(true);
    setError("");
    apiRequest("/api/approvals/bec/category-list", { token })
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "Could not load BEC category list."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (token) loadRequests();
  }, [token]);

  const submitCategory = async (category) => {
    setError("");
    setMessage("");
    setSubmittingCategory(category);

    try {
      const submitted = await apiRequest("/api/approvals/bec/category-list/submit", {
        token,
        method: "POST",
        body: {
          categories: [category],
          comment: `BEC submitted ${category} category list to Finance Department`,
        },
      });
      setMessage(`${submitted?.length || 0} RR${submitted?.length === 1 ? "" : "s"} submitted to Finance Department.`);
      loadRequests();
    } catch (err) {
      setError(err.message || "Could not submit category list.");
    } finally {
      setSubmittingCategory("");
    }
  };

  const undoCategoryAssignment = async (request) => {
    if (!request) return;
    setError("");
    setMessage("");
    setUndoingId(request.rrId);

    try {
      await apiRequest(`/api/approvals/bec/category-list/${request.rrId}/undo`, {
        token,
        method: "POST",
        body: { comment: `BEC moved ${request.rrNumber} back to the queue` },
      });
      navigate("/approvals/bec");
    } catch (err) {
      setError(err.message || "Could not move RR back to the BEC queue.");
    } finally {
      setUndoingId(null);
    }
  };

  if (rrId) {
    return (
      <div className="space-y-8">
        <PageHero
          eyebrow="BEC"
          title={selectedRequest?.rrNumber || "Category List RR"}
          description="View the categorized RR details before sending or undoing the category assignment."
        >
          <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Category</div>
            <div className="mt-2 max-w-xs text-xl font-black">{selectedRequest?.vendorCategories || "Loading"}</div>
          </div>
        </PageHero>

        {error && (
          <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
        )}

        {loading && <div className="rounded-[24px] bg-white p-5 text-sm text-slate-600">Loading RR details...</div>}

        {!loading && !selectedRequest && (
          <div className="space-y-4 rounded-[24px] bg-white p-5">
            <div className="text-sm text-slate-600">This RR is no longer in the BEC category list.</div>
            <button type="button" onClick={() => navigate("/approvals/bec-category-list")} className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]">
              Back to Category Lists
            </button>
          </div>
        )}

        {selectedRequest && (
          <section className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black text-[#10283f]">{selectedRequest.title}</h2>
                  <StatusPill status={selectedRequest.status} />
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-600">
                  {selectedRequest.divisionName || selectedRequest.facultyName || "Not assigned"} | {formatDateTime(selectedRequest.submittedAt)}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => navigate("/approvals/bec-category-list")} className="rounded-2xl border border-[#dce8ef] px-5 py-3 text-sm font-bold text-[#10283f] hover:bg-slate-50">
                  Back
                </button>
                <button
                  type="button"
                  disabled={undoingId === selectedRequest.rrId}
                  onClick={() => undoCategoryAssignment(selectedRequest)}
                  className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {undoingId === selectedRequest.rrId ? "Moving..." : "Undo to BEC Queue"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <DetailTile label="RR Number" value={selectedRequest.rrNumber} />
              <DetailTile label="Category" value={selectedRequest.vendorCategories} />
              <DetailTile label="Amount" value={formatMoney(selectedRequest.estimatedTotalAmount)} />
              <DetailTile label="Requested By" value={selectedRequest.requestedByName} />
              <DetailTile label="Priority" value={selectedRequest.priority || "Not set"} />
              <DetailTile label="Procurement Method" value={selectedRequest.procurementMethod || "Not set"} />
            </div>

            <div className="mt-6 rounded-[24px] border border-[#dce8ef] bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Submitted RR Details</div>
              <SubmittedRequisitionForm request={selectedRequest} />
            </div>

            <div className="mt-6 rounded-[24px] border border-[#dce8ef] bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Submitted Specifications</div>
              <div className="mt-4 space-y-4">
                {(selectedRequest.technicalSpecifications || []).length === 0 && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No specification details submitted.</div>
                )}
                {(selectedRequest.technicalSpecifications || []).map((spec) => {
                  const images = specificationImages(spec);
                  const rows = parseSpecificationTableRows(spec.specificationText);
                  return (
                    <div key={spec.specId || spec.itemId || spec.itemName} className="rounded-2xl bg-slate-50 p-4">
                      <div className="font-bold text-[#10283f]">{spec.itemName || selectedRequest.itemName || "General RR specification"}</div>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-[560px] border-collapse bg-white text-sm text-[#10283f]">
                          <thead>
                            <tr>
                              <th className="border border-slate-700 px-3 py-2 text-left">Description</th>
                              <th className="border border-slate-700 px-3 py-2 text-left">Required Specification</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.length === 0 && (
                              <tr><td colSpan={2} className="border border-slate-700 px-3 py-3 text-slate-600">No specification text provided.</td></tr>
                            )}
                            {rows.map((row, index) => (
                              <tr key={`${row.description}-${index}`}>
                                <td className="border border-slate-700 px-3 py-2 font-semibold">{row.description}</td>
                                <td className="border border-slate-700 px-3 py-2">{row.requiredSpecification}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {images.length > 0 && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {images.map((image, index) => (
                            <div key={`${image.name}-${index}`} className="border border-slate-200 bg-white p-2">
                              <div className="mb-2 truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{image.name}</div>
                              <img src={image.src} alt={image.name} className="max-h-72 w-full object-contain" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-[24px] bg-[#f8fcff] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Justification</div>
              <div className="mt-2 text-sm leading-7 text-slate-600">{selectedRequest.justification || "No justification provided."}</div>
            </div>

            <div className="mt-6 rounded-[24px] border border-[#dce8ef] bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Requested Items</div>
              <div className="mt-4 space-y-3">
                {(selectedRequest.items || []).length === 0 && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No item details recorded.</div>
                )}
                {(selectedRequest.items || []).map((item, index) => (
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
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="BEC"
        title="Category Lists"
        description="Review categorized RRs and send each category list to the Finance Department."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Listed RRs</div>
          <div className="mt-2 text-3xl font-black">{requests.length}</div>
        </div>
      </PageHero>

      {(message || error) && (
        <div className={`rounded-[24px] p-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      )}

      <section className="space-y-6">
        {loading && <div className="rounded-[24px] bg-white p-5 text-sm text-slate-600">Loading category lists...</div>}
        {!loading && requests.length === 0 && <div className="rounded-[24px] bg-white p-5 text-sm text-slate-600">No categorized RRs yet.</div>}

        {Object.entries(groupedRequests).map(([category, categoryRequests]) => (
          <div key={category} className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Category</div>
                <h2 className="mt-2 text-2xl font-black text-[#10283f]">{category}</h2>
                <div className="mt-2 text-sm text-slate-600">{categoryRequests.length} RR{categoryRequests.length === 1 ? "" : "s"} in this list</div>
              </div>
              <button
                type="button"
                disabled={submittingCategory === category}
                onClick={() => submitCategory(category)}
                className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79] disabled:opacity-60"
              >
                {submittingCategory === category ? "Sending..." : "Send to Finance Department"}
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f5fbff] text-xs uppercase tracking-[0.18em] text-[#166e8c]">
                  <tr>
                    <th className="px-4 py-3">RR</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Division</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryRequests.map((request) => (
                    <tr key={request.rrId}>
                      <td className="px-4 py-3 font-bold text-[#10283f]">{request.rrNumber}</td>
                      <td className="px-4 py-3 text-slate-700">{request.title}</td>
                      <td className="px-4 py-3 text-slate-600">{request.divisionName || request.facultyName || "Not assigned"}</td>
                      <td className="px-4 py-3 font-semibold text-[#166e8c]">{formatMoney(request.estimatedTotalAmount)}</td>
                      <td className="px-4 py-3"><StatusPill status={request.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/approvals/bec-category-list/${request.rrId}`)}
                            className="rounded-xl border border-[#dce8ef] px-3 py-2 text-xs font-bold text-[#10283f] hover:bg-slate-50"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            disabled={undoingId === request.rrId}
                            onClick={() => undoCategoryAssignment(request)}
                            className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            {undoingId === request.rrId ? "Moving..." : "Undo"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
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

function SubmittedRequisitionForm({ request }) {
  const form = parseSubmittedForm(request.description || "");
  const firstItem = request.items?.[0] || {};
  const total = firstItem.estimatedTotalPrice || request.estimatedTotalAmount;
  const cell = "border border-slate-700 align-top";
  const label = "border border-slate-700 bg-slate-100 px-3 py-3 text-center text-sm font-black text-[#10283f]";

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[780px] border border-slate-700 bg-white p-4 text-[#10283f]">
        <div className="grid gap-4 md:grid-cols-[1fr_170px]">
          <div>
            <div className="text-xl font-black uppercase tracking-wide">University of Ruhuna - Faculty of Engineering</div>
            <div className="text-lg font-black uppercase">Purchase Requisition Form</div>
            <div className="mt-1 text-xs leading-5 text-slate-700">
              Finance Branch<br />
              Tel: Extension 1101 Fax 0912245762<br />
              Email: bursar@eng.ruh.ac.lk<br />
              Web: http://www.eng.ruh.ac.lk
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-[70px_1fr] border border-slate-700">
              <div className="border-r border-slate-700 px-2 py-2 font-semibold">Form No</div>
              <div className="px-2 py-2">{request.rrNumber || ""}</div>
            </div>
            <div className="grid grid-cols-[70px_1fr] border border-slate-700">
              <div className="border-r border-slate-700 px-2 py-2 font-semibold">Date</div>
              <div className="px-2 py-2">{request.submittedAt ? new Date(request.submittedAt).toLocaleDateString() : ""}</div>
            </div>
            <div className="text-right text-xs italic text-slate-600">To be Completed in triplicate</div>
          </div>
        </div>

        <table className="mt-5 w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td rowSpan={3} className={label}>User</td>
              <td className={`${cell} w-44 px-3 py-2 font-semibold`}>Faculty/Admin</td>
              <td colSpan={3} className={`${cell} px-3 py-2`}>{form.facultyAdmin || request.facultyName || ""}</td>
            </tr>
            <tr>
              <td className={`${cell} px-3 py-2 font-semibold`}>Department/Branch</td>
              <td colSpan={3} className={`${cell} px-3 py-2`}>{form.departmentBranch || request.divisionName || ""}</td>
            </tr>
            <tr>
              <td className={`${cell} px-3 py-2 font-semibold`}>Contact Person</td>
              <td className={`${cell} px-3 py-2`}>{form.contactPerson || request.requestedByName || ""}</td>
              <td className={`${cell} w-32 px-3 py-2 font-semibold`}>Telephone No</td>
              <td className={`${cell} px-3 py-2`}>{form.telephoneNo || ""}</td>
            </tr>

            <tr>
              <td rowSpan={5} className={label}>Funds</td>
              <td colSpan={4} className={`${cell} px-3 py-2`}>
                <div className="flex flex-wrap gap-5">
                  <span><b>Funds GOSL</b> {form.fundsGosl || ""}</span>
                  <span><b>Project</b> {form.project || ""}</span>
                  <span><b>Vote</b> {form.vote || ""}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={2} className={`${cell} px-3 py-2`}>
                Whether the item/items requested included in procurement plan
                <div className="mt-2 font-semibold">{form.includedInPlan || ""}</div>
              </td>
              <td colSpan={2} className={`${cell} px-3 py-2 text-center`}>
                * If No should get the Vice Chancellor's approval
                <div className="mt-4 font-black">Approved</div>
              </td>
            </tr>
            <tr>
              <td colSpan={2} className={`${cell} px-3 py-2`}>Budgeted allocation Rs. {form.budgetAllocation || ""}</td>
              <td rowSpan={3} colSpan={2} className={`${cell} px-3 py-8 text-center font-black`}>Vice Chancellor</td>
            </tr>
            <tr>
              <td colSpan={2} className={`${cell} px-3 py-2`}>Used amount so far Rs. {form.usedAmount || ""}</td>
            </tr>
            <tr>
              <td colSpan={2} className={`${cell} px-3 py-2`}>Balance available Rs. {form.balanceAvailable || ""}</td>
            </tr>

            <tr>
              <td rowSpan={2} className={label}>Object</td>
              <td className={`${cell} px-2 py-2 text-center font-semibold`}>Description of the item/items intended to be purchased</td>
              <td className={`${cell} px-2 py-2 text-center font-semibold`}>Cost (Approximately)</td>
              <td className={`${cell} px-2 py-2 text-center font-semibold`}>Qty. Required</td>
              <td className={`${cell} px-2 py-2 text-center font-semibold`}>Qty. Already Available</td>
            </tr>
            <tr className="h-32">
              <td className={`${cell} p-3`}>{firstItem.description || firstItem.itemName || request.itemName || ""}</td>
              <td className={`${cell} p-3`}>{formatMoney(firstItem.estimatedUnitPrice || request.estimatedUnitPrice)}</td>
              <td className={`${cell} p-3`}>{firstItem.quantity || request.quantity || ""}</td>
              <td className={`${cell} p-3`}></td>
            </tr>
            <tr>
              <td className={label}>Purpose</td>
              <td colSpan={4} className={`${cell} px-3 py-3`}>
                <div className="font-semibold">{form.purpose || "Normal"}</div>
                <div className="mt-2"><b>Estimated Total:</b> {formatMoney(total)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
