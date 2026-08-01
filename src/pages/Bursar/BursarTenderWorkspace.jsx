import { useCallback, useEffect, useMemo, useState } from "react";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatMoney } from "../../services/apiClient";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";
const inputClass = "w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#166e8c]";
const buttonClass = "rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79] disabled:cursor-not-allowed disabled:opacity-50";
const bursarSubRoles = ["BURSAR", "ASSISTANT_BURSAR", "SENIOR_ASSISTANT_BURSAR"];

const initialForm = {
  tenderId: "",
  category: "",
  title: "",
  description: "",
  bidStartDateTime: "",
  submissionDeadline: "",
  bidOpeningDateTime: "",
  objectionDeadline: "",
  publishNow: true,
};

function asLocalDateTime(value) {
  return value || null;
}

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

export default function BursarTenderWorkspace() {
  const { token, user } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorCategories, setVendorCategories] = useState([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const isBursar = user?.mainRole === "FINANCE" && bursarSubRoles.includes(user?.subRole);
  const readyTenders = useMemo(
    () => tenders.filter((tender) => tender.status === "READY_FOR_RFQ"),
    [tenders]
  );
  const selectedTender = readyTenders.find((tender) => String(tender.tenderId) === String(form.tenderId));

  const loadTenders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await procurementApi.tenders.list(token);
      setTenders(getArray(data));
    } catch (loadError) {
      setError(loadError.message || "Could not load tenders.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadVendorCategories = useCallback(async () => {
    try {
      const data = await procurementApi.vendors.categories(token);
      setVendorCategories(Array.isArray(data) ? data : []);
    } catch {
      setVendorCategories([]);
    }
  }, [token]);

  const searchVendors = async (event) => {
    event?.preventDefault();
    setError("");
    setNotice("");
    try {
      const data = await procurementApi.vendors.search(token, vendorSearch, form.category);
      const list = getArray(data).filter((vendor) => vendor.vendorId);
      setVendors(list);
      setSelectedVendorIds((current) =>
        current.filter((id) => list.some((vendor) => String(vendor.vendorId) === String(id)))
      );
      if (!list.length) {
        setNotice(form.category ? "No approved vendors found for this category." : "No approved vendors found.");
      }
    } catch (searchError) {
      setError(searchError.message || "Could not search vendors.");
    }
  };

  useEffect(() => {
    if (isBursar && token) {
      loadTenders();
      loadVendorCategories();
    }
  }, [isBursar, token, loadTenders, loadVendorCategories]);

  useEffect(() => {
    const tender = readyTenders.find((item) => String(item.tenderId) === String(form.tenderId));
    if (!tender) return;
    setForm((current) => ({
      ...current,
      title: current.title || `${tender.tenderNumber} - ${tender.title}`,
      description: current.description || tender.description || tender.title || "",
    }));
  }, [form.tenderId, readyTenders]);

  const updateForm = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleVendor = (vendorId, checked) => {
    setSelectedVendorIds((current) =>
      checked ? [...current, String(vendorId)] : current.filter((id) => id !== String(vendorId))
    );
  };

  const sendRfq = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!selectedVendorIds.length) {
      setError("Select at least one vendor before sending the RFQ.");
      return;
    }

    setLoading(true);
    try {
      await procurementApi.rfqs.create(token, {
        tenderId: Number(form.tenderId),
        rrId: null,
        title: form.title,
        description: form.description,
        bidStartDateTime: asLocalDateTime(form.bidStartDateTime),
        submissionDeadline: asLocalDateTime(form.submissionDeadline),
        bidOpeningDateTime: asLocalDateTime(form.bidOpeningDateTime),
        objectionDeadline: asLocalDateTime(form.objectionDeadline),
        publishNow: form.publishNow,
        invitedVendorIds: selectedVendorIds.map(Number),
      });
      setNotice("RFQ created and sent to selected category vendors.");
      setForm(initialForm);
      setVendors([]);
      setSelectedVendorIds([]);
      setVendorSearch("");
      await loadTenders();
    } catch (submitError) {
      setError(submitError.message || "Could not send RFQ.");
    } finally {
      setLoading(false);
    }
  };

  if (!isBursar) {
    return (
      <section className={cardClass}>
        <h1 className="text-2xl font-black text-[#10283f]">Bursar Access Required</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Only bursar, assistant bursar, or senior assistant bursar users can send tender RFQs to vendors.</p>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <PageHero
        eyebrow="Bursar Tender Workspace"
        title="Send RFQs by vendor category"
        description="Select a Bursar-approved tender, filter approved vendors by category, and send the RFQ directly to matching vendors."
      />

      {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {notice && <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className={cardClass}>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Ready Tenders</div>
          <h2 className="mt-3 text-2xl font-black text-[#10283f]">Tender list from Bursar approval</h2>
          <div className="mt-5 space-y-3">
            {!readyTenders.length && (
              <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">
                {loading ? "Loading tenders..." : "No tenders are ready for RFQ."}
              </div>
            )}
            {readyTenders.map((tender) => (
              <button
                key={tender.tenderId}
                type="button"
                onClick={() => setForm((current) => ({ ...current, tenderId: String(tender.tenderId) }))}
                className={`w-full rounded-[24px] border p-5 text-left transition ${
                  String(form.tenderId) === String(tender.tenderId)
                    ? "border-[#166e8c] bg-[#f5fbff]"
                    : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-black text-[#10283f]">{tender.tenderNumber} - {tender.title}</h3>
                  <StatusPill status={tender.status} />
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-600">
                  {tender.tenderType || "Category not set"} | {formatMoney(tender.tenderValue)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={sendRfq} className={`${cardClass} space-y-4`}>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RFQ Details</div>
          <h2 className="mt-3 text-2xl font-black text-[#10283f]">Create and send RFQ</h2>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-[#10283f]">Approved Tender</span>
            <select className={inputClass} name="tenderId" value={form.tenderId} onChange={updateForm} required>
              <option value="">Select tender</option>
              {readyTenders.map((tender) => (
                <option key={tender.tenderId} value={tender.tenderId}>
                  {tender.tenderNumber} - {tender.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-[#10283f]">Relevant Vendor Category</span>
            <input
              className={inputClass}
              name="category"
              value={form.category}
              onChange={updateForm}
              list="vendor-category-options"
              placeholder="Start typing a category from vendor records"
              required
            />
            <datalist id="vendor-category-options">
              {vendorCategories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-[#10283f]">RFQ Title</span>
            <input className={inputClass} name="title" value={form.title} onChange={updateForm} required />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-[#10283f]">Description</span>
            <textarea className={inputClass} name="description" rows={3} value={form.description} onChange={updateForm} />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-[#10283f]">Bid Start Time</span>
              <input className={inputClass} type="datetime-local" name="bidStartDateTime" value={form.bidStartDateTime} onChange={updateForm} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-[#10283f]">Submission Deadline</span>
              <input className={inputClass} type="datetime-local" name="submissionDeadline" value={form.submissionDeadline} onChange={updateForm} required />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-[#10283f]">Bid Opening Time</span>
              <input className={inputClass} type="datetime-local" name="bidOpeningDateTime" value={form.bidOpeningDateTime} onChange={updateForm} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-[#10283f]">Objection Deadline</span>
              <input className={inputClass} type="datetime-local" name="objectionDeadline" value={form.objectionDeadline} onChange={updateForm} />
            </label>
          </div>

          <label className="flex items-center gap-3 text-sm font-bold text-[#10283f]">
            <input type="checkbox" name="publishNow" checked={form.publishNow} onChange={updateForm} />
            Publish immediately
          </label>

          <div className="rounded-[24px] border border-[#dce8ef] bg-[#fbfdff] p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                className={inputClass}
                value={vendorSearch}
                onChange={(event) => setVendorSearch(event.target.value)}
                placeholder="Search vendor name, email, or contact"
              />
              <button className={buttonClass} type="button" onClick={searchVendors} disabled={!form.category}>
                Find Vendors
              </button>
            </div>

            <div className="mt-4 max-h-[300px] space-y-3 overflow-y-auto">
              {!vendors.length && <div className="rounded-2xl bg-white p-4 text-sm text-slate-600">Search by category to list approved vendors.</div>}
              {vendors.map((vendor) => (
                <label key={vendor.vendorId} className="flex items-start gap-3 rounded-2xl bg-white p-4">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={selectedVendorIds.includes(String(vendor.vendorId))}
                    onChange={(event) => toggleVendor(vendor.vendorId, event.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-black text-[#10283f]">{vendor.vendorName}</span>
                    <span className="block text-xs leading-6 text-slate-600">
                      {vendor.category || "No category"} | {vendor.email || "No email"} {vendor.contactPerson ? `| ${vendor.contactPerson}` : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button className={buttonClass} type="submit" disabled={loading || !selectedTender || !selectedVendorIds.length}>
            Send RFQ to Selected Vendors
          </button>
        </form>
      </section>
    </div>
  );
}
