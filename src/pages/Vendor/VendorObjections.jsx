import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { vendorApi } from "../../api/vendorApi";

const inputClass = "w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#166e8c]";
const buttonClass = "rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79] disabled:opacity-60";

const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const isDeadlineClosed = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
};

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-[#10283f]">{label}</span>
      {children}
    </label>
  );
}

export default function VendorObjections() {
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [rfqs, setRfqs] = useState([]);
  const [form, setForm] = useState({ rfqId: query.get("rfqId") || "", reason: "", documentUrl: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const selectedRfq = rfqs.find((rfq) => String(rfq.rfqId) === String(form.rfqId));
  const deadlineClosed = isDeadlineClosed(selectedRfq?.objectionDeadline);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await vendorApi.rfqs.list();
      const list = Array.isArray(data) ? data : [];
      setRfqs(list);
      setForm((current) => ({
        ...current,
        rfqId: current.rfqId || (list[0]?.rfqId ? String(list[0].rfqId) : ""),
      }));
    } catch (err) {
      setError(err.message || "Could not load RFQs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitObjection = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (deadlineClosed) {
      setError("The objection period for this RFQ has ended.");
      return;
    }
    try {
      await vendorApi.rfqs.object(form.rfqId, {
        reason: form.reason,
        documentUrl: form.documentUrl,
      });
      setMessage("Objection submitted to TEC.");
      setForm((current) => ({ ...current, reason: "", documentUrl: "" }));
    } catch (err) {
      setError(err.message || "Could not submit objection.");
    }
  };

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Vendor Portal"
        title="Objections"
        description="Submit objections for RFQs within the allowed objection period."
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}

      <section className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Submit Objection</div>
        <h2 className="mt-3 text-2xl font-black text-[#10283f]">RFQ Objection Form</h2>

        <form onSubmit={submitObjection} className="mt-6 space-y-4">
          <Field label="RFQ">
            <select
              className={inputClass}
              value={form.rfqId}
              onChange={(event) => setForm((current) => ({ ...current, rfqId: event.target.value }))}
              required
            >
              <option value="">{loading ? "Loading RFQs..." : "Select RFQ"}</option>
              {rfqs.map((rfq) => (
                <option key={rfq.rfqId} value={rfq.rfqId}>
                  {rfq.rfqNumber || `RFQ ${rfq.rfqId}`} - {rfq.title || "Untitled"}
                </option>
              ))}
            </select>
          </Field>

          {selectedRfq ? (
            <div className="rounded-[24px] bg-[#f8fcff] p-5 text-sm leading-7 text-slate-600">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-black text-[#10283f]">{selectedRfq.rfqNumber || `RFQ ${selectedRfq.rfqId}`}</span>
                <StatusPill status={deadlineClosed ? "OBJECTION_CLOSED" : "OBJECTION_OPEN"} />
              </div>
              <div className="mt-2">Objection deadline: {formatDate(selectedRfq.objectionDeadline)}</div>
            </div>
          ) : null}

          <Field label="Objection Reason">
            <textarea
              className={inputClass}
              rows={5}
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              required
            />
          </Field>
          <Field label="Document URL">
            <input
              className={inputClass}
              value={form.documentUrl}
              onChange={(event) => setForm((current) => ({ ...current, documentUrl: event.target.value }))}
              placeholder="Optional supporting document link"
            />
          </Field>
          <button className={buttonClass} type="submit" disabled={!form.rfqId || deadlineClosed}>
            Submit Objection
          </button>
        </form>
      </section>
    </div>
  );
}
