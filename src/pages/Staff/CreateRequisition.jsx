import { useMemo, useState } from "react";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatMoney } from "../../services/apiClient";

const initialForm = {
  title: "",
  description: "",
  itemName: "",
  itemDescription: "",
  quantity: 1,
  unitOfMeasure: "Units",
  estimatedUnitPrice: "",
  justification: "",
};

export default function CreateRequisition() {
  const { token } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [createdRequest, setCreatedRequest] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const estimatedTotal = useMemo(() => {
    return Number(form.quantity || 0) * Number(form.estimatedUnitPrice || 0);
  }, [form.quantity, form.estimatedUnitPrice]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const saveDraft = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        estimatedUnitPrice: Number(form.estimatedUnitPrice),
      };
      const data = await apiRequest("/api/staff/requisitions", {
        token,
        method: "POST",
        body: payload,
      });
      setCreatedRequest(data);
      setMessage(`Draft ${data.rrNumber} created successfully.`);
    } catch (err) {
      setError(err.message || "Could not create requisition draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const submitToHod = async () => {
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
      setMessage(`${data.rrNumber} submitted to HOD.`);
    } catch (err) {
      setError(err.message || "Could not submit requisition to HOD.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Staff Workspace"
        title="Create Requisition"
        description="Create a draft requisition with item details, estimated value, and justification before sending it to the HOD approval queue."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Estimated Total</div>
          <div className="mt-2 text-3xl font-black">{formatMoney(estimatedTotal)}</div>
        </div>
      </PageHero>

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

            <label className="space-y-2">
              <span className="text-sm font-bold text-[#10283f]">Item name</span>
              <input name="itemName" value={form.itemName} onChange={updateField} required className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-[#10283f]">Unit of measure</span>
              <input name="unitOfMeasure" value={form.unitOfMeasure} onChange={updateField} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-[#10283f]">Quantity</span>
              <input name="quantity" type="number" min="1" value={form.quantity} onChange={updateField} required className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-[#10283f]">Estimated unit price</span>
              <input name="estimatedUnitPrice" type="number" min="0.01" step="0.01" value={form.estimatedUnitPrice} onChange={updateField} required className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold text-[#10283f]">Item description</span>
              <textarea name="itemDescription" value={form.itemDescription} onChange={updateField} rows={3} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
            </label>

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
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
              <button type="button" onClick={submitToHod} disabled={!createdRequest?.rrId || createdRequest?.status !== "DRAFT" || isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f2940] px-5 py-3 font-bold text-white transition hover:bg-[#173b5a] disabled:cursor-not-allowed disabled:opacity-45">
                <SendRoundedIcon fontSize="small" />
                {isSubmitting ? "Submitting..." : "Submit to HOD"}
              </button>
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
