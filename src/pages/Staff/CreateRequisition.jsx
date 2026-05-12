import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatMoney } from "../../services/apiClient";

const initialForm = {
  title: "",
  description: "",
  justification: "",
};

const emptyItem = {
  itemName: "",
  description: "",
  quantity: 1,
  unitOfMeasure: "Units",
  estimatedUnitPrice: "",
};

const editableStatuses = new Set(["DRAFT", "HOD_REJECTED"]);

export default function CreateRequisition() {
  const { token } = useAuth();
  const { rrId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState([emptyItem]);
  const [createdRequest, setCreatedRequest] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const isEditMode = Boolean(rrId);

  const estimatedTotal = useMemo(() => {
    return items.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.estimatedUnitPrice || 0), 0);
  }, [items]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateItem = (index, field, value) => {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  useEffect(() => {
    if (!rrId || !token) return;

    let active = true;
    setIsLoadingDraft(true);
    setError("");

    apiRequest(`/api/staff/requisitions/${rrId}`, { token })
      .then((data) => {
        if (!active) return;
        setCreatedRequest(data);
        setForm({
          title: data.title || "",
          description: data.description || "",
          justification: data.justification || "",
        });
        setItems((data.items?.length ? data.items.slice(0, 1) : [emptyItem]).map((item) => ({
          itemName: item.itemName || "",
          description: item.description || "",
          quantity: item.quantity || 1,
          unitOfMeasure: item.unitOfMeasure || "Units",
          estimatedUnitPrice: item.estimatedUnitPrice || "",
        })));
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

  const saveDraft = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const payload = {
        ...form,
        items: items.map((item) => ({
          itemName: item.itemName,
          description: item.description,
          quantity: Number(item.quantity),
          unitOfMeasure: item.unitOfMeasure,
          estimatedUnitPrice: Number(item.estimatedUnitPrice),
        })),
      };
      const data = await apiRequest(isEditMode ? `/api/staff/requisitions/${rrId}` : "/api/staff/requisitions", {
        token,
        method: isEditMode ? "PUT" : "POST",
        body: payload,
      });
      setCreatedRequest(data);
      setMessage(`Draft ${data.rrNumber} ${isEditMode ? "updated" : "created"} successfully.`);
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
      setMessage(`${data.rrNumber} submitted to Division Head.`);
    } catch (err) {
      setError(err.message || "Could not submit requisition to Division Head.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Staff Workspace"
        title={isEditMode ? "Edit Draft Requisition" : "Create Requisition"}
        description="Create or edit a draft requisition with item details, estimated value, and justification before sending it to the Division Head approval queue."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Estimated Total</div>
          <div className="mt-2 text-3xl font-black">{formatMoney(estimatedTotal)}</div>
        </div>
      </PageHero>

      {isLoadingDraft && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading draft...</div>}

      <form onSubmit={saveDraft} className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-[34px] border border-[#dce8ef] bg-white p-8 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold text-[#10283f]">Request title</span>
              <input name="title" value={form.title} onChange={updateField} required className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold text-[#10283f]">Description</span>
              <textarea name="description" value={form.description} onChange={updateField} rows={3} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
            </label>

            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black text-[#10283f]">Requisition Items</h3>
              </div>

              {items.map((item, index) => (
                <div key={index} className="rounded-[24px] border border-[#dce8ef] bg-[#f8fcff] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm font-black text-[#10283f]">Item Details</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-bold text-[#10283f]">Item name</span>
                      <input value={item.itemName} onChange={(event) => updateItem(index, "itemName", event.target.value)} required className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-bold text-[#10283f]">Unit of measure</span>
                      <input value={item.unitOfMeasure} onChange={(event) => updateItem(index, "unitOfMeasure", event.target.value)} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-bold text-[#10283f]">Quantity</span>
                      <input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} required className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-bold text-[#10283f]">Estimated unit price</span>
                      <input type="number" min="0.01" step="0.01" value={item.estimatedUnitPrice} onChange={(event) => updateItem(index, "estimatedUnitPrice", event.target.value)} required className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-bold text-[#10283f]">Item description</span>
                      <textarea value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} rows={2} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold text-[#10283f]">Justification</span>
              <textarea name="justification" value={form.justification} onChange={updateField} rows={4} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
            </label>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Draft Control</div>
            <div className="mt-4 space-y-3">
              <button type="submit" disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#166e8c] px-5 py-3 font-bold text-white transition hover:bg-[#145f79] disabled:opacity-60">
                <SaveRoundedIcon fontSize="small" />
                {isSaving ? "Saving..." : isEditMode ? "Update Draft" : "Save Draft"}
              </button>
              <button type="button" onClick={submitToDivisionHead} disabled={!createdRequest?.rrId || !editableStatuses.has(createdRequest?.status) || isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f2940] px-5 py-3 font-bold text-white transition hover:bg-[#173b5a] disabled:cursor-not-allowed disabled:opacity-45">
                <SendRoundedIcon fontSize="small" />
                {isSubmitting ? "Submitting..." : "Submit to Division Head"}
              </button>
              {createdRequest?.rrId && !editableStatuses.has(createdRequest?.status) && (
                <button type="button" onClick={() => navigate(`/requisitions/${createdRequest.rrId}`)} className="flex w-full items-center justify-center rounded-2xl border border-[#dce8ef] px-5 py-3 font-bold text-[#10283f] transition hover:bg-slate-50">
                  View Submitted RR
                </button>
              )}
            </div>
          </div>

          {createdRequest && (
            <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
              <div className="text-sm font-bold text-[#10283f]">{createdRequest.rrNumber}</div>
              <div className="mt-3"><StatusPill status={createdRequest.status} /></div>
              <div className="mt-4 text-sm leading-7 text-slate-600">Current stage: {createdRequest.currentStage}</div>
            </div>
          )}

          {(message || error) && (
            <div className={`rounded-[24px] p-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {error || message}
            </div>
          )}
        </aside>
      </form>
    </div>
  );
}
