import { useCallback, useEffect, useMemo, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateTime, formatMoney } from "../../services/apiClient";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";
const buttonClass = "inline-flex items-center justify-center rounded-2xl bg-[#166e8c] px-4 py-2 text-sm font-black text-white hover:bg-[#145f79] disabled:cursor-not-allowed disabled:bg-slate-300";
const inputClass = "w-full rounded-[18px] border border-[#dce8ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#166e8c]";

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

export default function BecSelectedVendors() {
  const { token, user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [poForms, setPoForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isBecUser = user?.mainRole === "FINANCE" && user?.subRole === "BEC";

  const load = useCallback(async () => {
    if (!token || !isBecUser) return;
    setLoading(true);
    setError("");
    try {
      const data = await procurementApi.offers.selectedVendors(token);
      setOffers(getArray(data));
    } catch (loadError) {
      setError(loadError.message || "Could not load selected vendors.");
    } finally {
      setLoading(false);
    }
  }, [token, isBecUser]);

  useEffect(() => {
    load();
  }, [load]);

  const totalValue = useMemo(
    () => offers.reduce((sum, offer) => sum + Number(offer.offerAmount || 0), 0),
    [offers]
  );

  const setPoField = (offerId, field, value) => {
    setPoForms((current) => ({
      ...current,
      [offerId]: {
        ...(current[offerId] || {}),
        [field]: value,
      },
    }));
  };

  const offerAndSendPo = async (offer) => {
    const form = poForms[offer.offerLetterId] || {};
    setBusyKey(`offer-po-${offer.offerLetterId}`);
    setError("");
    setMessage("");
    try {
      await procurementApi.purchaseOrders.create(token, {
        offerLetterId: offer.offerLetterId,
        poNumber: form.poNumber || null,
        deliveryDeadline: form.deliveryDeadline || null,
      });
      setMessage("Vendor notified and purchase order sent.");
      setPoForms((current) => ({ ...current, [offer.offerLetterId]: {} }));
      await load();
    } catch (poError) {
      setError(poError.message || "Could not send purchase order.");
    } finally {
      setBusyKey("");
    }
  };

  if (!isBecUser) {
    return (
      <section className={cardClass}>
        <h1 className="text-2xl font-black text-[#10283f]">BEC Access Required</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Only BEC users can manage selected vendors.</p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="BEC"
        title="Selected Vendors"
        description="Issue purchase orders to authority-approved selected vendors."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Selected Offers</div>
          <div className="mt-2 text-3xl font-black">{offers.length}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {message && <div className="rounded-[24px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}

      <section className={cardClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Authority Approved Vendors</div>
            <h2 className="mt-2 text-2xl font-black text-[#10283f]">Selected vendor list</h2>
            <div className="mt-2 text-sm leading-7 text-slate-600">
              {offers.length} selected vendor{offers.length === 1 ? "" : "s"} | Total value {formatMoney(totalValue)}
            </div>
          </div>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
            <RefreshRoundedIcon fontSize="small" />
            Refresh
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {loading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading selected vendors...</div>}
          {!loading && offers.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No selected vendors are waiting for BEC action.</div>}
          {offers.map((offer) => {
            const poBusy = busyKey === `offer-po-${offer.offerLetterId}`;
            const form = poForms[offer.offerLetterId] || {};
            return (
              <article key={offer.offerLetterId} className="rounded-[24px] border border-[#e0ebf1] bg-[#fbfdff] p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">{offer.letterNumber || `Offer ${offer.offerLetterId}`}</div>
                    <h3 className="mt-2 text-xl font-black text-[#10283f]">{offer.requisitionItemName || offer.rfqNumber || "Selected quotation"}</h3>
                    <div className="mt-2 text-sm leading-7 text-slate-600">
                      Vendor: <span className="font-bold text-[#10283f]">{offer.vendorName || "Vendor not recorded"}</span>
                    </div>
                  </div>
                  <StatusPill status={offer.status || "APPROVED_BY_AUTHORITY"} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <DetailTile label="RFQ" value={offer.rfqNumber || offer.rfqId || "Not recorded"} />
                  <DetailTile label="Vendor ID" value={offer.vendorId || "Not recorded"} />
                  <DetailTile label="Approved Amount" value={formatMoney(offer.offerAmount)} />
                  <DetailTile label="Final Authority" value={offer.approvalAuthority || "Not recorded"} />
                  <DetailTile label="Authority Approved At" value={formatDateTime(offer.approvedAt)} />
                  <DetailTile label="Authority Comment" value={offer.vcComment || "Approved"} />
                </div>

                <div className="mt-5 rounded-[22px] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Purchase Order</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className={inputClass}
                      value={form.poNumber || ""}
                      onChange={(event) => setPoField(offer.offerLetterId, "poNumber", event.target.value)}
                      placeholder="PO number, optional"
                    />
                    <input
                      className={inputClass}
                      type="date"
                      value={form.deliveryDeadline || ""}
                      onChange={(event) => setPoField(offer.offerLetterId, "deliveryDeadline", event.target.value)}
                    />
                  </div>
                  <button type="button" onClick={() => offerAndSendPo(offer)} disabled={poBusy} className={`${buttonClass} mt-4`}>
                    {poBusy ? "Sending..." : "Offer to Vendor and send PO"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-[20px] bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{label}</div>
      <div className="mt-2 break-words text-sm font-bold text-[#10283f]">{value || "Not available"}</div>
    </div>
  );
}
