import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatMoney } from "../../services/apiClient";
import { staffMemberPath } from "../../utils/roleRoutes";
import { toast } from "react-toastify";

const today = new Date().toISOString().slice(0, 10);

const initialForm = {
  title: "",
  facultyAdmin: "",
  departmentBranch: "",
  contactPerson: "",
  telephoneNo: "",
  fundsGosl: false,
  project: "",
  vote: "",
  includedInPlan: "",
  budgetAllocation: "",
  usedAmount: "",
  balanceAvailable: "",
  purpose: "Normal",
  urgentJustification: "",
};

const emptyItem = {
  description: "",
  cost: "",
  quantity: 1,
  qtyAvailable: "",
};

const defaultSpecificationRows = [
  { description: "Type", requiredSpecification: "" },
  { description: "Color", requiredSpecification: "" },
  { description: "Function", requiredSpecification: "" },
  { description: "Dimensions", requiredSpecification: "" },
  { description: "Primary Materials", requiredSpecification: "" },
  { description: "Number of Units / Parts", requiredSpecification: "" },
  { description: "Warranty", requiredSpecification: "" },
  { description: "Make and Model", requiredSpecification: "" },
];

const editableStatuses = new Set(["DRAFT", "HOD_REJECTED"]);

const inputClass = "w-full border-0 bg-transparent px-2 py-1 text-sm outline-none";
const cellClass = "border border-slate-700 align-top";
const labelCell = "border border-slate-700 bg-slate-100 px-3 py-3 text-center text-sm font-black text-[#10283f]";

const parseSavedDescription = (description = "") => {
  const values = {};
  description.split(/\r?\n/).forEach((line) => {
    const [rawKey, ...rawValueParts] = line.split(":");
    if (!rawKey || rawValueParts.length === 0) return;
    const key = rawKey.trim();
    const value = rawValueParts.join(":").trim();

    if (key === "Faculty/Admin") values.facultyAdmin = value;
    if (key === "Department/Branch") values.departmentBranch = value;
    if (key === "Contact Person") values.contactPerson = value;
    if (key === "Telephone No") values.telephoneNo = value;
    if (key === "Included in procurement plan") values.includedInPlan = value === "Not selected" ? "" : value;
    if (key === "Budgeted allocation") values.budgetAllocation = value === "N/A" ? "" : value;
    if (key === "Used amount so far") values.usedAmount = value === "N/A" ? "" : value;
    if (key === "Balance available") values.balanceAvailable = value === "N/A" ? "" : value;
    if (key === "Purpose") values.purpose = value || "Normal";

    if (key === "Funds") {
      const fundsMatch = value.match(/GOSL\s+(Yes|No),\s+Project\s+(.*),\s+Vote\s+(.*)$/i);
      if (fundsMatch) {
        values.fundsGosl = fundsMatch[1].toLowerCase() === "yes";
        values.project = fundsMatch[2] === "N/A" ? "" : fundsMatch[2];
        values.vote = fundsMatch[3] === "N/A" ? "" : fundsMatch[3];
      }
    }
  });
  return values;
};

const parseSpecificationRows = (specificationText = "") => {
  const parsedRows = specificationText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("Item Name") && !line.startsWith("Qty"))
    .map((line) => {
      const numberedMatch = line.match(/^\d+\.\s*(.*?)\s+-\s*(.*)$/);
      if (numberedMatch) {
        return { description: numberedMatch[1], requiredSpecification: numberedMatch[2] };
      }

      const [description, ...requiredParts] = line.split(":");
      return {
        description: description?.trim() || "",
        requiredSpecification: requiredParts.join(":").trim(),
      };
    })
    .filter((row) => row.description || row.requiredSpecification);

  return parsedRows.length ? parsedRows : defaultSpecificationRows;
};

export default function CreateRequisition() {
  const { token, user } = useAuth();
  const { rrId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({
    ...initialForm,
    facultyAdmin: user?.facultyName || "",
    departmentBranch: user?.divisionName || "",
    contactPerson: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "",
    telephoneNo: user?.phoneNumber || "",
  }));
  const [item, setItem] = useState(emptyItem);
  const [specificationRows, setSpecificationRows] = useState(defaultSpecificationRows);
  const [specificationImages, setSpecificationImages] = useState([]);
  const specificationImagesRef = useRef([]);
  const [createdRequest, setCreatedRequest] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [suggestingSpecIndex, setSuggestingSpecIndex] = useState(null);
  const isEditMode = Boolean(rrId);

  useEffect(() => {
    if (message) toast.success(message, { autoClose: 4500 });
  }, [message]);

  useEffect(() => {
    if (error) toast.error(error, { autoClose: 5000 });
  }, [error]);

  const estimatedTotal = useMemo(() => {
    return Number(item.quantity || 0) * Number(item.cost || 0);
  }, [item.quantity, item.cost]);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const updateItem = (field, value) => {
    setItem((current) => ({ ...current, [field]: value }));
  };

  const resetRequisitionForm = () => {
    specificationImagesRef.current.forEach((image) => {
      if (image.url?.startsWith("blob:")) URL.revokeObjectURL(image.url);
    });
    setForm({
      ...initialForm,
      facultyAdmin: user?.facultyName || "",
      departmentBranch: user?.divisionName || "",
      contactPerson: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "",
      telephoneNo: user?.phoneNumber || "",
    });
    setItem({ ...emptyItem });
    setSpecificationRows(defaultSpecificationRows.map((row) => ({ ...row })));
    setSpecificationImages([]);
    setCreatedRequest(null);
  };

  const updateSpecificationRow = (index, field, value) => {
    setSpecificationRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [field]: value } : row
    )));
  };

  const addSpecificationRow = () => {
    setSpecificationRows((current) => [...current, { description: "", requiredSpecification: "" }]);
  };

  const removeSpecificationRow = (index) => {
    setSpecificationRows((current) => current.length > 1 ? current.filter((_, rowIndex) => rowIndex !== index) : current);
  };

  const suggestRequiredSpecification = async (index) => {
    const row = specificationRows[index];
    const description = row?.description?.trim();
    const itemName = item.description?.trim() || form.title?.trim();

    if (!description) {
      setError("Enter a description before asking AI to suggest the required specification.");
      return;
    }
    if (!itemName) {
      setError("Enter the requested item name before asking AI to suggest specifications.");
      return;
    }

    setError("");
    setMessage("");
    setSuggestingSpecIndex(index);

    try {
      const suggestion = await apiRequest("/api/staff/requisitions/ai/specification-suggestion", {
        token,
        method: "POST",
        body: {
          itemName,
          description,
          itemContext: item.description,
          quantity: Number(item.quantity) || null,
        },
      });
      updateSpecificationRow(index, "requiredSpecification", suggestion.requiredSpecification || "");
      setMessage("AI suggested a required specification. Please review it before saving.");
    } catch (err) {
      setError(err.message || "Could not generate specification suggestion.");
    } finally {
      setSuggestingSpecIndex(null);
    }
  };

  const addSpecificationImages = async (event) => {
    const files = Array.from(event.target.files || []).filter((selectedFile) => selectedFile.type.startsWith("image/"));
    if (!files.length) return;
    const nextImages = await Promise.all(files.map(async (file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID?.() || Date.now()}`,
        name: file.name,
        contentType: file.type,
        url: URL.createObjectURL(file),
        dataUrl: await readFileAsDataUrl(file),
      })));
    setSpecificationImages((current) => [...current, ...nextImages]);
    event.target.value = "";
  };

  const removeSpecificationImage = (imageId) => {
    setSpecificationImages((current) => {
      const image = current.find((itemImage) => itemImage.id === imageId);
      if (image) URL.revokeObjectURL(image.url);
      return current.filter((itemImage) => itemImage.id !== imageId);
    });
  };

  useEffect(() => {
    specificationImagesRef.current = specificationImages;
  }, [specificationImages]);

  useEffect(() => () => {
    specificationImagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
  }, []);

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  useEffect(() => {
    if (!rrId || !token) return;

    let active = true;
    setIsLoadingDraft(true);
    setError("");

    apiRequest(`/api/staff/requisitions/${rrId}`, { token })
      .then((data) => {
        if (!active) return;
        const firstItem = data.items?.[0] || {};
        const savedFields = parseSavedDescription(data.description || "");
        const savedSpecification = data.technicalSpecifications?.[0];
        const savedImages = savedSpecification?.sampleImages?.length
          ? savedSpecification.sampleImages
          : savedSpecification?.sampleImageBase64
            ? [{
              imageId: savedSpecification.specId,
              imageName: savedSpecification.sampleImageName,
              contentType: savedSpecification.sampleImageContentType,
              imageBase64: savedSpecification.sampleImageBase64,
            }]
            : [];
        setCreatedRequest(data);
        setForm((current) => ({
          ...current,
          title: data.title || "",
          ...savedFields,
          urgentJustification: data.justification?.startsWith("Purpose:") ? "" : data.justification || "",
        }));
        setItem({
          description: firstItem.description || firstItem.itemName || "",
          cost: firstItem.estimatedUnitPrice || "",
          quantity: firstItem.quantity || 1,
          qtyAvailable: "",
        });
        setSpecificationRows(parseSpecificationRows(savedSpecification?.specificationText || ""));
        setSpecificationImages(savedImages.map((image, index) => {
          const contentType = image.contentType || "image/jpeg";
          const dataUrl = `data:${contentType};base64,${image.imageBase64}`;
          return {
            id: `saved-${image.imageId || index}`,
            name: image.imageName || `Saved sample image ${index + 1}`,
            contentType,
            url: dataUrl,
            dataUrl,
          };
        }));
      })
      .catch((err) => {
        if (active) setError(err.message || "Could not load requisition draft.");
      })
      .finally(() => {
        if (active) setIsLoadingDraft(false);
      });

    return () => {
      active = false;
    };
  }, [rrId, token]);

  const buildSpecificationSummary = () => {
    const filledRows = specificationRows.filter((row) => row.description.trim() || row.requiredSpecification.trim());
    if (!filledRows.length && !specificationImages.length) return "";

    return [
      "Annexure 01 - Specifications",
      `Item Name: ${item.description.slice(0, 80) || form.title || "Not provided"}`,
      `Qty: ${item.quantity || "Not provided"}`,
      ...filledRows.map((row, index) => (
        `${index + 1}. ${row.description || "Description not provided"} - ${row.requiredSpecification || "Specification not provided"}`
      )),
      specificationImages.length
        ? `Attached sample images: ${specificationImages.map((image) => image.name).join(", ")}`
        : "Attached sample images: None",
    ].join("\n");
  };

  const buildSpecificationPayloadText = () => {
    const filledRows = specificationRows.filter((row) => row.description.trim() || row.requiredSpecification.trim());
    return [
      `Item Name - ${item.description || form.title || "Requested item"}`,
      `Qty - ${item.quantity || "0"}`,
      ...filledRows.map((row) => `${row.description || "Description"}: ${row.requiredSpecification || "Not provided"}`),
    ].join("\n");
  };

  const buildDescription = () => [
    `Faculty/Admin: ${form.facultyAdmin || "Not provided"}`,
    `Department/Branch: ${form.departmentBranch || "Not provided"}`,
    `Contact Person: ${form.contactPerson || "Not provided"}`,
    `Telephone No: ${form.telephoneNo || "Not provided"}`,
    `Funds: GOSL ${form.fundsGosl ? "Yes" : "No"}, Project ${form.project || "N/A"}, Vote ${form.vote || "N/A"}`,
    `Included in procurement plan: ${form.includedInPlan || "Not selected"}`,
    `Budgeted allocation: ${form.budgetAllocation || "N/A"}`,
    `Used amount so far: ${form.usedAmount || "N/A"}`,
    `Balance available: ${form.balanceAvailable || "N/A"}`,
    `Purpose: ${form.purpose}`,
    buildSpecificationSummary(),
  ].filter(Boolean).join("\n\n");

  const saveDraft = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const payload = {
        title: form.title || item.description.slice(0, 80) || "Purchase requisition",
        description: buildDescription(),
        justification: form.purpose === "Urgent" ? form.urgentJustification : `Purpose: ${form.purpose}`,
        specificationText: buildSpecificationPayloadText(),
        sampleImageName: specificationImages[0]?.name || null,
        sampleImageContentType: specificationImages[0]?.contentType || null,
        sampleImageBase64: specificationImages[0]?.dataUrl || null,
        sampleImages: specificationImages.map((image) => ({
          name: image.name,
          contentType: image.contentType,
          dataUrl: image.dataUrl,
        })),
        items: [{
          itemName: item.description.slice(0, 120) || "Requested item",
          description: item.description,
          quantity: Number(item.quantity),
          unitOfMeasure: "Units",
          estimatedUnitPrice: Number(item.cost),
        }],
      };
      const data = await apiRequest(isEditMode ? `/api/staff/requisitions/${rrId}` : "/api/staff/requisitions", {
        token,
        method: isEditMode ? "PUT" : "POST",
        body: payload,
      });
      setCreatedRequest(data);
      const successMessage = `Draft ${data.rrNumber} ${isEditMode ? "updated" : "created"} successfully.`;
      setMessage(successMessage);
      toast.success(successMessage, { autoClose: 3500 });
      navigate(staffMemberPath("my-requisitions"));
    } catch (err) {
      setError(err.message || "Could not save requisition draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const submitToDivisionHead = async () => {
    if (!createdRequest?.rrId) return;
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const data = await apiRequest(`/api/staff/requisitions/${createdRequest.rrId}/submit`, {
        token,
        method: "POST",
      });
      setCreatedRequest(data);
      const successMessage = `${data.rrNumber} submitted to Division Head.`;
      setMessage(successMessage);
      toast.success(successMessage, { autoClose: 3500 });
      resetRequisitionForm();
      navigate(staffMemberPath("my-requisitions"));
    } catch (err) {
      setError(err.message || "Could not submit requisition to Division Head.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {isLoadingDraft && <div className="rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600">Loading draft...</div>}

      <form onSubmit={saveDraft} className="rounded-[10px] border border-slate-700 bg-white p-5 shadow-[0_18px_45px_rgba(15,41,64,0.08)]">
        <div className="grid gap-4 md:grid-cols-[1fr_170px]">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wide text-[#10283f]">University of Ruhuna - Faculty of Engineering</h1>
            <h2 className="text-xl font-black uppercase text-[#10283f]">Purchase Requisition Form</h2>
            <div className="mt-1 text-sm leading-6 text-slate-700">
              Finance Branch<br />
              Tel: Extension 1101 Fax 0912245762<br />
              Email: bursar@eng.ruh.ac.lk<br />
              Web: http://www.eng.ruh.ac.lk
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-[70px_1fr] border border-slate-700 text-sm">
              <div className="border-r border-slate-700 px-2 py-2 font-semibold">Form No</div>
              <div className="px-2 py-2">{createdRequest?.rrNumber || ""}</div>
            </div>
            <div className="grid grid-cols-[70px_1fr] border border-slate-700 text-sm">
              <div className="border-r border-slate-700 px-2 py-2 font-semibold">Date</div>
              <div className="px-2 py-2">{today}</div>
            </div>
          </div>
        </div>

        <table className="mt-5 w-full border-collapse text-sm text-[#10283f]">
          <tbody>
            <tr>
              <td rowSpan={3} className={labelCell}>User</td>
              <td className={`${cellClass} w-44 px-3 py-2 font-semibold`}>Faculty/Admin</td>
              <td colSpan={3} className={cellClass}><input name="facultyAdmin" value={form.facultyAdmin} onChange={updateField} className={inputClass} /></td>
            </tr>
            <tr>
              <td className={`${cellClass} px-3 py-2 font-semibold`}>Department/Branch</td>
              <td colSpan={3} className={cellClass}><input name="departmentBranch" value={form.departmentBranch} onChange={updateField} className={inputClass} /></td>
            </tr>
            <tr>
              <td className={`${cellClass} px-3 py-2 font-semibold`}>Contact Person</td>
              <td className={cellClass}><input name="contactPerson" value={form.contactPerson} onChange={updateField} className={inputClass} /></td>
              <td className={`${cellClass} w-32 px-3 py-2 font-semibold`}>Telephone No</td>
              <td className={cellClass}><input name="telephoneNo" value={form.telephoneNo} onChange={updateField} className={inputClass} /></td>
            </tr>

            <tr>
              <td rowSpan={5} className={labelCell}>Funds</td>
              <td colSpan={4} className={`${cellClass} px-3 py-2`}>
                <div className="flex min-w-0 items-center gap-4 overflow-x-auto whitespace-nowrap">
                  <label className="shrink-0 font-semibold">Funds GOSL</label>
                  <label className="flex shrink-0 items-center gap-2">Yes <input type="checkbox" name="fundsGosl" checked={form.fundsGosl} onChange={updateField} /></label>
                  <label className="shrink-0 font-semibold">Project</label>
                  <input name="project" value={form.project} onChange={updateField} className="min-w-[260px] flex-1 border border-slate-500 px-2 py-1 outline-none" />
                  <label className="shrink-0 font-semibold">Vote</label>
                  <input name="vote" value={form.vote} onChange={updateField} className="min-w-[260px] flex-1 border border-slate-500 px-2 py-1 outline-none" />
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={2} className={`${cellClass} px-3 py-2`}>
                Whether the item/items requested included in procurement plan
                <div className="mt-2 flex gap-6">
                  <label className="flex items-center gap-2">Yes <input type="radio" name="includedInPlan" value="Yes" checked={form.includedInPlan === "Yes"} onChange={updateField} /></label>
                  <label className="flex items-center gap-2">No <input type="radio" name="includedInPlan" value="No" checked={form.includedInPlan === "No"} onChange={updateField} /></label>
                </div>
              </td>
              <td colSpan={2} className={`${cellClass} px-3 py-2 text-center`}>
                * If No should get the Vice Chancellor's approval
              </td>
            </tr>
            <tr>
              <td colSpan={4} className={`${cellClass} px-3 py-2`}>Budgeted allocation Rs. <input name="budgetAllocation" value={form.budgetAllocation} onChange={updateField} className="ml-3 border border-slate-500 px-2 py-1 outline-none" /></td>
            </tr>
            <tr>
              <td colSpan={4} className={`${cellClass} px-3 py-2`}>Used amount so far Rs. <input name="usedAmount" value={form.usedAmount} onChange={updateField} className="ml-3 border border-slate-500 px-2 py-1 outline-none" /></td>
            </tr>
            <tr>
              <td colSpan={4} className={`${cellClass} px-3 py-2`}>Balance available Rs. <input name="balanceAvailable" value={form.balanceAvailable} onChange={updateField} className="ml-3 border border-slate-500 px-2 py-1 outline-none" /></td>
            </tr>

            <tr>
              <td rowSpan={2} className={labelCell}>Object</td>
              <td className={`${cellClass} px-2 py-2 text-center font-semibold`}>Description of the item/items intended to be purchased</td>
              <td className={`${cellClass} px-2 py-2 text-center font-semibold`}>Cost (Approximately)</td>
              <td className={`${cellClass} px-2 py-2 text-center font-semibold`}>Qty. Required</td>
              <td className={`${cellClass} px-2 py-2 text-center font-semibold`}>Qty. Already Available</td>
            </tr>
            <tr className="h-44">
              <td className={cellClass}><textarea value={item.description} onChange={(event) => updateItem("description", event.target.value)} required className="h-40 w-full resize-none border-0 bg-transparent p-2 text-sm outline-none" /></td>
              <td className={cellClass}><input type="number" min="0.01" step="0.01" value={item.cost} onChange={(event) => updateItem("cost", event.target.value)} required className={inputClass} /></td>
              <td className={cellClass}><input type="number" min="1" value={item.quantity} onChange={(event) => updateItem("quantity", event.target.value)} required className={inputClass} /></td>
              <td className={cellClass}><input value={item.qtyAvailable} onChange={(event) => updateItem("qtyAvailable", event.target.value)} className={inputClass} /></td>
            </tr>
            <tr>
              <td className={labelCell}>Purpose</td>
              <td colSpan={4} className={`${cellClass} px-3 py-3`}>
                <div className="flex flex-wrap gap-6">
                  {["Normal", "Fast track", "Urgent"].map((purpose) => (
                    <label key={purpose} className="flex items-center gap-2">
                      {purpose}
                      <input type="radio" name="purpose" value={purpose} checked={form.purpose === purpose} onChange={updateField} />
                    </label>
                  ))}
                </div>
                <label className="mt-3 block font-semibold">
                  If urgent provide the justification:
                  <textarea name="urgentJustification" value={form.urgentJustification} onChange={updateField} rows={2} className="mt-2 w-full border border-slate-500 px-2 py-1 outline-none" />
                </label>
              </td>
            </tr>
          </tbody>
        </table>

        <section className="mt-6 border border-slate-700">
          <div className="border-b border-slate-700 px-4 py-3">
            <div className="text-base font-black text-[#10283f]">Annexure 01</div>
            <div className="mt-1 grid gap-2 text-sm font-semibold text-[#10283f] md:grid-cols-2">
              <div>Item Name - {item.description || form.title || "Requested item"}</div>
              <div>Qty - {item.quantity || "0"}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm text-[#10283f]">
              <thead>
                <tr>
                  <th className={`${cellClass} w-56 px-3 py-3 text-center`}>Description</th>
                  <th className={`${cellClass} min-w-[360px] px-3 py-3 text-center`}>Required Specification</th>
                  <th className={`${cellClass} w-16 px-2 py-3 text-center`}></th>
                </tr>
              </thead>
              <tbody>
                {specificationRows.map((row, index) => (
                  <tr key={index}>
                    <td className={cellClass}>
                      <input
                        value={row.description}
                        onChange={(event) => updateSpecificationRow(index, "description", event.target.value)}
                        className={inputClass}
                      />
                    </td>
                    <td className={cellClass}>
                      <div className="flex min-h-[72px] gap-2 p-2">
                        <textarea
                          value={row.requiredSpecification}
                          onChange={(event) => updateSpecificationRow(index, "requiredSpecification", event.target.value)}
                          rows={2}
                          className="min-h-[56px] flex-1 resize-y border-0 bg-transparent text-sm outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => suggestRequiredSpecification(index)}
                          disabled={suggestingSpecIndex !== null || !token}
                          className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-xl border border-[#166e8c] px-3 text-xs font-bold text-[#166e8c] transition hover:bg-[#edf8fb] disabled:cursor-not-allowed disabled:opacity-45"
                          title="Suggest required specification with AI"
                        >
                          <AutoFixHighRoundedIcon fontSize="small" />
                          {suggestingSpecIndex === index ? "..." : "Suggest"}
                        </button>
                      </div>
                    </td>
                    <td className={`${cellClass} px-2 py-2 text-center`}>
                      <button
                        type="button"
                        onClick={() => removeSpecificationRow(index)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                        disabled={specificationRows.length === 1}
                        title="Remove row"
                      >
                        <DeleteRoundedIcon fontSize="small" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-700 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <button
                type="button"
                onClick={addSpecificationRow}
                className="inline-flex items-center gap-2 rounded-xl border border-[#166e8c] px-4 py-2 text-sm font-bold text-[#166e8c] transition hover:bg-[#edf8fb]"
              >
                <AddRoundedIcon fontSize="small" />
                Add Specification Row
              </button>
              <div className="mt-4">
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-[#10283f] transition hover:bg-slate-50">
                  Attach Sample Images
                  <input type="file" accept="image/*" multiple onChange={addSpecificationImages} className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
              {specificationImages.map((image) => (
                <div key={image.id} className="flex items-center gap-3 border border-slate-200 p-2">
                  <img src={image.url} alt={image.name} className="h-16 w-16 object-cover" />
                  <div className="min-w-0 flex-1 text-xs font-semibold text-slate-700">
                    <div className="truncate">{image.name}</div>
                    <button type="button" onClick={() => removeSpecificationImage(image.id)} className="mt-2 text-red-600 hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-300 pt-5 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-bold text-[#10283f]">Estimated Total: {formatMoney(estimatedTotal)}</div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={isSaving} className="flex items-center justify-center gap-2 rounded-2xl bg-[#166e8c] px-5 py-3 font-bold text-white transition hover:bg-[#145f79] disabled:opacity-60">
              <SaveRoundedIcon fontSize="small" />
              {isSaving ? "Saving..." : isEditMode ? "Update Draft" : "Save Draft"}
            </button>
            <button type="button" onClick={submitToDivisionHead} disabled={!createdRequest?.rrId || !editableStatuses.has(createdRequest?.status) || isSubmitting} className="flex items-center justify-center gap-2 rounded-2xl bg-[#0f2940] px-5 py-3 font-bold text-white transition hover:bg-[#173b5a] disabled:cursor-not-allowed disabled:opacity-45">
              <SendRoundedIcon fontSize="small" />
              {isSubmitting ? "Submitting..." : "Submit to Division Head"}
            </button>
          </div>
        </div>
      </form>

      {createdRequest && (
        <div className="rounded-[24px] border border-[#dce8ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-bold text-[#10283f]">{createdRequest.rrNumber}</div>
              <div className="mt-2"><StatusPill status={createdRequest.status} /></div>
            </div>
            {createdRequest?.rrId && !editableStatuses.has(createdRequest?.status) && (
              <button type="button" onClick={() => navigate(`${staffMemberPath("my-requisitions")}/${createdRequest.rrId}`)} className="rounded-2xl border border-[#dce8ef] px-5 py-3 font-bold text-[#10283f] transition hover:bg-slate-50">
                View Submitted RR
              </button>
            )}
          </div>
        </div>
      )}

      {(message || error) && (
        <div className={`rounded-[24px] p-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      )}
    </div>
  );
}
