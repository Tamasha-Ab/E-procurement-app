import { useEffect, useState } from "react";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import { useNavigate, useParams } from "react-router-dom";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatMoney } from "../../services/apiClient";
import { downloadRequisitionForm } from "../../utils/requisitionDocument";
import { VENDOR_CATEGORY_OPTIONS } from "../../constants/vendorCategories";
import { requestDisplayName, requestContext } from "../../utils/procurementDisplay";
import { deanPath, divisionHeadPath, isDean, isDivisionHead } from "../../utils/roleRoutes";
import { toast } from "react-toastify";

const emptySpecForm = {
  specId: null,
  itemId: "",
  specificationText: "",
  attachmentUrl: "",
  recommendedProcurementMethod: "RFQ",
};

const emptySpecRow = { description: "", requiredSpecification: "" };

const priorityOptions = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

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

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function ApprovalQueue({ roleKey, title, description, pendingUrl, actionBaseUrl, acceptedUrl, specificationBaseUrl }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { rrId } = useParams();
  const [requests, setRequests] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [auditRequests, setAuditRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedAccepted, setSelectedAccepted] = useState(null);
  const [specForm, setSpecForm] = useState(emptySpecForm);
  const [specRows, setSpecRows] = useState([emptySpecRow]);
  const [specImages, setSpecImages] = useState([]);
  const [comment, setComment] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [itemPriorities, setItemPriorities] = useState({});
  const [itemDecisions, setItemDecisions] = useState({});
  const [itemComments, setItemComments] = useState({});
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [suggestingSpecIndex, setSuggestingSpecIndex] = useState(null);
  const [specUndoValues, setSpecUndoValues] = useState({});
  const usesDetailRoute = roleKey === "HOD" || roleKey === "DEAN" || roleKey === "VC" || roleKey === "BEC";
  const isDetailPage = usesDetailRoute && Boolean(rrId);
  const isQueuePage = usesDetailRoute && !rrId;
  const isDeanReview = roleKey === "DEAN";
  const isBecReview = roleKey === "BEC";
  const isReadOnlyApprover = roleKey === "DEAN" || roleKey === "VC" || roleKey === "BEC";
  const queuePath = roleKey === "HOD" && isDivisionHead(user)
    ? divisionHeadPath("approvals")
    : roleKey === "DEAN" && isDean(user)
      ? deanPath("approvals")
      : `/approvals/${roleKey.toLowerCase()}`;
  const selectedIsAccepted = Boolean(selected) && (
    acceptedRequests.some((request) => String(request.rrId) === String(selected.rrId))
    || (isDetailPage && !requests.some((request) => String(request.rrId) === String(selected.rrId)))
  );

  useEffect(() => {
    if (message) toast.success(message, { autoClose: 4500 });
  }, [message]);

  useEffect(() => {
    if (error) toast.error(error, { autoClose: 5000 });
  }, [error]);
  const filteredVendorCategories = VENDOR_CATEGORY_OPTIONS.filter((category) =>
    category.toLowerCase().includes(categorySearch.trim().toLowerCase())
  );
  const selectedSubmittedForm = parseSubmittedForm(selected?.description || "");
  const isOutsideProcurementPlan = selectedSubmittedForm.includedInPlan?.toLowerCase() === "no";

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

  const loadAuditRequests = () => {
    if (!isDetailPage || !["HOD", "DEAN"].includes(roleKey)) return;
    const auditUrl = roleKey === "DEAN"
      ? "/api/approvals/dean/audit-trail?page=0&size=100"
      : "/api/approvals/hod/audit-trail?page=0&size=100";
    apiRequest(auditUrl, { token })
      .then((data) => setAuditRequests(data?.content || []))
      .catch((err) => setError(err.message || "Could not load request audit details."));
  };

  useEffect(() => {
    loadRequests();
    loadAcceptedRequests();
    loadAuditRequests();
  }, [pendingUrl, acceptedUrl, token, isDetailPage, roleKey]);

  useEffect(() => {
    if (!isDetailPage) return;
    const nextSelected = [...requests, ...acceptedRequests, ...auditRequests]
      .find((request) => String(request.rrId) === String(rrId));
    if (nextSelected) selectPendingRequest(nextSelected);
  }, [isDetailPage, requests, acceptedRequests, auditRequests, rrId]);

  const performAction = async (action) => {
    if (!selected) return;
    const selectedItems = selected.items || [];
    const isMultiItemReview = !isReadOnlyApprover && selectedItems.length > 1;
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
    if (!isReadOnlyApprover && !isMultiItemReview && action === "approve" && !priority) {
      setError("Priority is required before adding the RR to the final list.");
      return;
    }
    if (isReadOnlyApprover && action === "reject" && !comment.trim()) {
      setError("Rejection comment is required.");
      return;
    }
    if (isBecReview && !selectedCategory) {
      setError("Select a vendor category for this RR.");
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
          priority: !isReadOnlyApprover && !isMultiItemReview && endpointAction === "approve" ? priority : null,
          itemPriorities: isMultiItemReview ? itemPriorities : null,
          itemDecisions: isMultiItemReview ? itemDecisions : null,
          itemComments: isMultiItemReview ? itemComments : null,
          categories: isBecReview ? [selectedCategory] : null,
        },
      });
      setMessage(isMultiItemReview
        ? `${selected.rrNumber} item review saved.`
        : isBecReview
          ? `${selected.rrNumber} category list saved.`
        : `${selected.rrNumber} ${endpointAction} completed.`);
      setSelected(null);
      setComment("");
      setPriority("MEDIUM");
      setItemPriorities({});
      setItemDecisions({});
      setItemComments({});
      setSelectedCategory("");
      setCategorySearch("");
      if (isDetailPage) {
        navigate(queuePath);
      }
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
        body: { comment: "Division Head final list approved and submitted to Dean" },
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
    const rows = parseSpecificationTableRows(spec.specificationText);
    const existingImages = specificationImages(spec).map((image, index) => ({
      id: `saved-${spec.specId || "spec"}-${index}`,
      name: image.name,
      contentType: image.src.match(/^data:(.*?);base64,/)?.[1] || "image/jpeg",
      dataUrl: image.src,
    }));
    setSpecForm({
      specId: spec.specId,
      itemId: spec.itemId || "",
      specificationText: spec.specificationText || "",
      attachmentUrl: spec.attachmentUrl || "",
      recommendedProcurementMethod: spec.recommendedProcurementMethod || "RFQ",
    });
    setSpecRows(rows.length ? rows : [{ ...emptySpecRow }]);
    setSpecImages(existingImages);
    setSpecUndoValues({});
  };

  const resetSpecForm = () => {
    setSpecForm(emptySpecForm);
    setSpecRows([{ ...emptySpecRow }]);
    setSpecImages([]);
    setSpecUndoValues({});
  };

  const updateSpecRow = (index, field, value) => {
    setSpecRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [field]: value } : row
    )));
  };

  const addSpecRow = () => {
    setSpecRows((current) => [...current, { ...emptySpecRow }]);
  };

  const removeSpecRow = (index) => {
    setSpecRows((current) => (current.length === 1
      ? [{ ...emptySpecRow }]
      : current.filter((_, rowIndex) => rowIndex !== index)));
    setSpecUndoValues((current) => {
      const next = {};
      Object.entries(current).forEach(([rowIndex, value]) => {
        const numericIndex = Number(rowIndex);
        if (numericIndex < index) next[numericIndex] = value;
        if (numericIndex > index) next[numericIndex - 1] = value;
      });
      return next;
    });
  };

  const resolveSpecItem = (targetRequest) => {
    const items = targetRequest?.items || [];
    if (specForm.itemId) {
      return items.find((item) => String(item.itemId) === String(specForm.itemId));
    }
    return items[0] || null;
  };

  const suggestRequiredSpecification = async (index, targetRequest) => {
    const row = specRows[index];
    const description = row?.description?.trim();
    const selectedItem = resolveSpecItem(targetRequest);
    const itemName = selectedItem?.description || selectedItem?.itemName || targetRequest?.itemName || requestDisplayName(targetRequest);

    if (!description) {
      setError("Enter a description before asking AI to suggest the required specification.");
      return;
    }
    if (!itemName) {
      setError("Select or enter an item before asking AI to suggest specifications.");
      return;
    }

    setError("");
    setMessage("");
    setSuggestingSpecIndex(index);

    try {
      const suggestion = await apiRequest("/api/approvals/hod/specifications/ai-suggestion", {
        token,
        method: "POST",
        body: {
          itemName,
          description,
          itemContext: selectedItem?.description || targetRequest?.description || "",
          quantity: Number(selectedItem?.quantity) || null,
        },
      });
      setSpecUndoValues((current) => ({
        ...current,
        [index]: row.requiredSpecification || "",
      }));
      updateSpecRow(index, "requiredSpecification", suggestion.requiredSpecification || "");
      setMessage("AI suggested a required specification. Please review it before saving.");
    } catch (err) {
      setError(err.message || "Could not generate specification suggestion.");
    } finally {
      setSuggestingSpecIndex(null);
    }
  };

  const undoSpecSuggestion = (index) => {
    if (!Object.prototype.hasOwnProperty.call(specUndoValues, index)) return;
    updateSpecRow(index, "requiredSpecification", specUndoValues[index]);
    setSpecUndoValues((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
    setMessage("AI change undone for this specification row.");
  };

  const handleSpecImageFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const nextImages = await Promise.all(files.map(async (file, index) => ({
      id: `new-${Date.now()}-${index}-${file.name}`,
      name: file.name,
      contentType: file.type || "image/jpeg",
      dataUrl: await readFileAsDataUrl(file),
    })));
    setSpecImages((current) => [...current, ...nextImages]);
    event.target.value = "";
  };

  const removeSpecImage = (imageId) => {
    setSpecImages((current) => current.filter((image) => image.id !== imageId));
  };

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
    setSelectedAccepted(null);
    resetSpecForm();
    setComment("");
    setPriority(request.priority || "MEDIUM");
    setItemPriorities(nextItemPriorities);
    setItemDecisions(nextItemDecisions);
    setItemComments(nextItemComments);
    const savedCategories = (request.vendorCategories || "")
      .split(",")
      .map((category) => category.trim())
      .filter(Boolean);
    setSelectedCategory(savedCategories[0] || "");
    setCategorySearch("");
  };

  const openPendingRequest = (request) => {
    if (usesDetailRoute) {
      navigate(`${queuePath}/${request.rrId}`);
      return;
    }
    selectPendingRequest(request);
  };

  const saveSpecification = async (event, targetRequest, targetList) => {
    event.preventDefault();
    if (!targetRequest || !specificationBaseUrl) return;
    setError("");
    setMessage("");
    const filledRows = specRows.filter((row) => row.description.trim() || row.requiredSpecification.trim());
    if (!filledRows.length) {
      setError("At least one specification row is required.");
      return;
    }
    setIsActing(true);

    try {
      await apiRequest(
        specForm.specId
          ? `${specificationBaseUrl}/specifications/${specForm.specId}`
          : `${specificationBaseUrl}/${targetRequest.rrId}/specifications`,
        {
          token,
          method: specForm.specId ? "PUT" : "POST",
          body: {
            itemId: specForm.itemId ? Number(specForm.itemId) : null,
            specificationText: filledRows.map((row) => `${row.description || "Description"}: ${row.requiredSpecification || "Not provided"}`).join("\n"),
            attachmentUrl: specForm.attachmentUrl || null,
            recommendedProcurementMethod: specForm.recommendedProcurementMethod,
            sampleImages: specImages.map((image) => ({
              name: image.name,
              contentType: image.contentType,
              dataUrl: image.dataUrl,
            })),
          },
        }
      );
      setMessage("Specification saved.");
      resetSpecForm();
      const refreshUrl = targetList === "accepted" ? acceptedUrl : pendingUrl;
      const refreshed = await apiRequest(`${refreshUrl}?page=0&size=20`, { token });
      const refreshedItems = refreshed?.content || [];
      if (targetList === "accepted") {
        setAcceptedRequests(refreshedItems);
        setSelectedAccepted(refreshedItems.find((item) => item.rrId === targetRequest.rrId) || null);
      } else {
        setRequests(refreshedItems);
        setSelected(refreshedItems.find((item) => item.rrId === targetRequest.rrId) || null);
      }
    } catch (err) {
      setError(err.message || "Could not save specification.");
    } finally {
      setIsActing(false);
    }
  };

  const renderSpecificationEditor = (targetRequest, targetList) => (
    <form onSubmit={(event) => saveSpecification(event, targetRequest, targetList)} className="space-y-4 rounded-[24px] bg-[#f8fcff] p-5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse bg-white text-sm text-[#10283f]">
          <thead>
            <tr>
              <th className="border border-slate-700 px-3 py-2 text-left">Description</th>
              <th className="border border-slate-700 px-3 py-2 text-left">Required Specification</th>
              <th className="w-24 border border-slate-700 px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {specRows.map((row, index) => (
              <tr key={`spec-row-${index}`}>
                <td className="border border-slate-700 p-2">
                  <input
                    value={row.description}
                    onChange={(event) => updateSpecRow(index, "description", event.target.value)}
                    className="w-full rounded-xl border border-[#dce8ef] px-3 py-2 outline-none focus:border-[#166e8c]"
                  />
                </td>
                <td className="border border-slate-700 p-2">
                  <div className="flex gap-2">
                    <textarea
                      value={row.requiredSpecification}
                      onChange={(event) => updateSpecRow(index, "requiredSpecification", event.target.value)}
                      rows={2}
                      className="min-h-[64px] flex-1 rounded-xl border border-[#dce8ef] px-3 py-2 outline-none focus:border-[#166e8c]"
                    />
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => suggestRequiredSpecification(index, targetRequest)}
                        disabled={suggestingSpecIndex !== null || isActing || !token}
                        className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-[#166e8c] px-3 text-xs font-bold text-[#166e8c] transition hover:bg-[#edf8fb] disabled:cursor-not-allowed disabled:opacity-45"
                        title="Suggest required specification with AI"
                      >
                        <AutoFixHighRoundedIcon fontSize="small" />
                        {suggestingSpecIndex === index ? "..." : "Suggest"}
                      </button>
                      {Object.prototype.hasOwnProperty.call(specUndoValues, index) && (
                        <button
                          type="button"
                          onClick={() => undoSpecSuggestion(index)}
                          disabled={isActing}
                          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-300 px-3 text-xs font-bold text-[#10283f] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                          title="Undo AI suggestion"
                        >
                          <UndoRoundedIcon fontSize="small" />
                          Undo
                        </button>
                      )}
                    </div>
                  </div>
                </td>
                <td className="border border-slate-700 p-2 text-center">
                  <button type="button" onClick={() => removeSpecRow(index)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addSpecRow} className="rounded-2xl border border-[#dce8ef] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-white">
        Add Row
      </button>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-[#10283f]">Sample Images</span>
        <input type="file" accept="image/*" multiple onChange={handleSpecImageFiles} className="w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#166e8c]" />
      </label>
      {specImages.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {specImages.map((image) => (
            <div key={image.id} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{image.name}</div>
                <button type="button" onClick={() => removeSpecImage(image.id)} className="rounded-xl bg-red-50 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100">
                  Remove
                </button>
              </div>
              <img src={image.dataUrl} alt={image.name} className="max-h-48 w-full object-contain" />
            </div>
          ))}
        </div>
      )}
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
  );

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

      {isDetailPage && (
        <button type="button" onClick={() => navigate(queuePath)} className="rounded-2xl border border-[#dce8ef] bg-white px-5 py-3 text-sm font-bold text-[#166e8c] hover:bg-[#edf7fb]">
          Back to {roleKey} Queue
        </button>
      )}

      <section className={`grid gap-6 ${isDetailPage || isQueuePage ? "" : "xl:grid-cols-[1.1fr_0.9fr]"}`}>
        {!isDetailPage && (
        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">{roleKey} Queue</div>
          <div className="mt-6 space-y-4">
            {isLoading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading pending requests...</div>}
            {!isLoading && requests.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No pending requests.</div>}
            {requests.map((request) => (
              <button
                key={request.rrId}
                type="button"
                onClick={() => openPendingRequest(request)}
                className={`w-full rounded-[26px] border p-5 text-left transition ${selected?.rrId === request.rrId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-black text-[#10283f]">{requestDisplayName(request)}</h3>
                  <StatusPill status={request.status} />
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-600">
                  {requestContext(request) || request.divisionName || request.facultyName || "Division"} | {formatMoney(request.estimatedTotalAmount)}
                </div>
              </button>
            ))}
          </div>
        </div>
        )}

        {!isQueuePage && (
        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Decision Panel</div>
          {!selected ? (
            <div className="mt-6 rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading request details...</div>
          ) : (
            <div className="mt-6 space-y-5">
              {isOutsideProcurementPlan && (
                <div className="rounded-[22px] border border-amber-300 bg-amber-50 p-5 shadow-[0_10px_28px_rgba(180,115,15,0.10)]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-lg font-black text-white">!</span>
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">Outside the procurement plan</div>
                      <div className="mt-1 text-sm font-bold text-[#6f4808]">Included in procurement plan: No</div>
                      <p className="mt-2 text-sm leading-6 text-amber-900/80">
                        This RR requires VC approval even when its value is LKR 500,000 or less. The backend workflow routes every RR outside the procurement plan through the VC before BEC review.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-2xl font-black text-[#10283f]">{requestDisplayName(selected)}</h3>
                <div className="mt-2 text-sm leading-7 text-slate-600">{requestContext(selected) || selected.divisionName || selected.facultyName || "Request details"}</div>
              </div>
              <button type="button" onClick={() => downloadRequisitionForm(selected)} className="inline-flex items-center gap-2 rounded-2xl border border-[#dce8ef] px-4 py-2 text-sm font-bold text-[#166e8c] transition hover:bg-[#edf7fb]">
                <DownloadRoundedIcon fontSize="small" />
                Download RR Form
              </button>

              <div className="grid gap-3 md:grid-cols-2">
                <DetailTile label="Request Name" value={requestDisplayName(selected)} />
                <DetailTile label="Requested By" value={selected.requestedByName || "Staff member"} />
                <DetailTile label="Faculty" value={selected.facultyName || "Not recorded"} />
                <DetailTile label="Division" value={selected.divisionName || "Not recorded"} />
                <DetailTile label="Estimated Total" value={formatMoney(selected.estimatedTotalAmount)} />
                <DetailTile label="Current Status" value={selected.status} />
                {selected.vendorCategories && <DetailTile label="Vendor Categories" value={selected.vendorCategories} />}
              </div>

              <div className="rounded-[24px] border border-[#dce8ef] bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Submitted RR Details</div>
                <SubmittedRequisitionForm request={selected} />
              </div>

              <div className="rounded-[24px] border border-[#dce8ef] bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Submitted Specifications</div>
                <div className="mt-4 space-y-4">
                  {(selected.technicalSpecifications || []).length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No specification details submitted.</div>
                  )}
                  {(selected.technicalSpecifications || []).map((spec) => {
                    const images = specificationImages(spec);
                    const rows = parseSpecificationTableRows(spec.specificationText);
                    return (
                      <div key={spec.specId || spec.itemId || spec.itemName} className="rounded-2xl bg-slate-50 p-4">
                        <div className="font-bold text-[#10283f]">{spec.itemName || selected.itemName || "General RR specification"}</div>
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
                        {!isReadOnlyApprover && !selectedIsAccepted && (
                        <div className="mt-4">
                          <button type="button" onClick={() => startSpecEdit(spec)} className="rounded-xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
                            Edit Specification
                          </button>
                        </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {!isReadOnlyApprover && !selectedIsAccepted && specificationBaseUrl && selected && renderSpecificationEditor(selected, "pending")}
              </div>

              <div className="rounded-[24px] bg-[#f8fcff] p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Justification</div>
                <div className="mt-2 text-sm leading-7 text-slate-600">{selected.justification || "No justification provided."}</div>
              </div>

              {selected.rejectionReason && (
                <div className="rounded-[24px] border border-red-200 bg-red-50 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
                    Rejected by {selected.status === "DEAN_REJECTED" ? "Dean" : "TEC"}
                  </div>
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
                      {!isReadOnlyApprover && !selectedIsAccepted && (selected.items || []).length > 1 && (
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

              {!selectedIsAccepted && (isBecReview ? (
                <div className="space-y-5 rounded-[24px] border border-[#dce8ef] bg-white p-5">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Vendor Category List</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">Select the one supplier category that best matches this RR.</div>
                  </div>
                  <input
                    type="search"
                    value={categorySearch}
                    onChange={(event) => setCategorySearch(event.target.value)}
                    placeholder="Search vendor categories"
                    className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 text-sm outline-none focus:border-[#166e8c]"
                  />
                  <div className="grid max-h-80 gap-2 overflow-y-auto rounded-2xl border border-[#dce8ef] bg-[#f8fcff] p-3 md:grid-cols-2">
                    {filteredVendorCategories.map((category) => (
                      <label key={category} className="flex cursor-pointer items-start gap-2 rounded-xl bg-white px-3 py-2 text-sm text-[#10283f] hover:bg-[#edf7fb]">
                        <input
                          type="radio"
                          name="becVendorCategory"
                          checked={selectedCategory === category}
                          onChange={() => setSelectedCategory(category)}
                          className="mt-1"
                        />
                        <span>{category}</span>
                      </label>
                    ))}
                    {filteredVendorCategories.length === 0 && (
                      <div className="rounded-xl bg-white px-3 py-2 text-sm text-slate-500 md:col-span-2">No matching categories.</div>
                    )}
                  </div>
                  {selectedCategory && (
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#edf7fb] px-3 py-1 text-xs font-bold text-[#166e8c]">
                        {selectedCategory}
                      </span>
                    </div>
                  )}
                  <button disabled={isActing} onClick={() => performAction("approve")} className="w-full rounded-2xl bg-[#166e8c] px-4 py-3 font-bold text-white hover:bg-[#145f79] disabled:opacity-60">
                    Save Category List
                  </button>
                </div>
              ) : isReadOnlyApprover || (selected.items || []).length <= 1 ? (
                <>
                  <label className="space-y-2 block">
                    <span className="text-sm font-bold text-[#10283f]">Decision comment</span>
                    <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={5} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
                  </label>

                  <div className={`grid gap-3 ${isReadOnlyApprover ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
                    <button disabled={isActing} onClick={() => performAction("approve")} className="rounded-2xl bg-[#166e8c] px-4 py-3 font-bold text-white hover:bg-[#145f79] disabled:opacity-60">
                      {roleKey === "DEAN"
                        ? "Approve and Route"
                        : roleKey === "VC"
                          ? "Approve and Send to BEC"
                          : roleKey === "BEC"
                            ? "Approve and Send to Bursar"
                            : "Add to Final List"}
                    </button>
                    <button disabled={isActing} onClick={() => performAction("reject")} className="rounded-2xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60">Reject</button>
                    {!isReadOnlyApprover && (
                      <button disabled={isActing} onClick={() => performAction("return")} className="rounded-2xl bg-[#0f2940] px-4 py-3 font-bold text-white hover:bg-[#173b5a] disabled:opacity-60">Return</button>
                    )}
                  </div>
                </>
              ) : (
                <button disabled={isActing} onClick={() => performAction("review-items")} className="w-full rounded-2xl bg-[#166e8c] px-4 py-3 font-bold text-white hover:bg-[#145f79] disabled:opacity-60">
                  Save Item Review
                </button>
              ))}
            </div>
          )}
        </div>
        )}
      </section>

      {acceptedUrl && (
        <section>
          <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Division Head Final List</div>
                <div className="mt-2 text-sm text-slate-600">Approved RRs are held here until the final list is submitted to Dean.</div>
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
                    <h3 className="text-lg font-black text-[#10283f]">{requestDisplayName(request)}</h3>
                    <StatusPill status={request.status} />
                  </div>
                  <div className="mt-2 text-sm leading-7 text-slate-600">
                    {requestContext(request) || request.divisionName || request.facultyName || "Division"} | Priority {request.priority || "Not set"} | Specs {(request.technicalSpecifications || []).length}
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
              </td>
            </tr>
            <tr>
              <td colSpan={4} className={`${cell} px-3 py-2`}>Budgeted allocation Rs. {form.budgetAllocation || ""}</td>
            </tr>
            <tr>
              <td colSpan={4} className={`${cell} px-3 py-2`}>Used amount so far Rs. {form.usedAmount || ""}</td>
            </tr>
            <tr>
              <td colSpan={4} className={`${cell} px-3 py-2`}>Balance available Rs. {form.balanceAvailable || ""}</td>
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
