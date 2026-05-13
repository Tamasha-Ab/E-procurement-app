import { useEffect, useMemo, useState } from "react";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { vendorApi } from "../../api/vendorApi";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";

const money = (value) => {
  const number = Number(value || 0);
  return number ? `LKR ${number.toLocaleString()}` : "LKR 0";
};

const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const safeList = (value) => (Array.isArray(value) ? value : []);

function EmptyState({ text }) {
  return <div className="rounded-[24px] bg-slate-50 p-5 text-sm leading-7 text-slate-600">{text}</div>;
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-[20px] bg-[#f8fcff] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{label}</div>
      <div className="mt-2 text-sm font-bold text-[#10283f]">{value || "Not set"}</div>
    </div>
  );
}

export default function VendorQuotations() {
  const [quotations, setQuotations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedQuotation = useMemo(
    () => quotations.find((quotation) => String(quotation.quotationId) === String(selectedId)) || quotations[0] || null,
    [quotations, selectedId]
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await vendorApi.quotations.list();
      const list = safeList(data);
      setQuotations(list);
      setSelectedId((current) => current || (list[0]?.quotationId ? String(list[0].quotationId) : ""));
    } catch (err) {
      setError(err.message || "Could not load submitted quotations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Vendor Portal"
        title="Submitted Quotations"
        description="Review the quotations you have already submitted, including item prices, specifications, attachments, and TEC evaluation status."
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.35fr]">
        <section className={cardClass}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Quotation List</div>
              <h2 className="mt-2 text-2xl font-black text-[#10283f]">My Submitted Quotations</h2>
            </div>
            <button
              type="button"
              onClick={load}
              className="self-start rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]"
            >
              Refresh
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? <EmptyState text="Loading submitted quotations..." /> : null}
            {!loading && !quotations.length ? <EmptyState text="No quotations submitted yet." /> : null}
            {quotations.map((quotation) => (
              <button
                key={quotation.quotationId}
                type="button"
                onClick={() => setSelectedId(String(quotation.quotationId))}
                className={`w-full rounded-[24px] border p-4 text-left transition ${
                  String(selectedQuotation?.quotationId) === String(quotation.quotationId)
                    ? "border-[#166e8c] bg-[#f5fbff]"
                    : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-black text-[#10283f]">
                    {quotation.rfqNumber || `RFQ ${quotation.rfqId || "Not set"}`}
                  </h3>
                  <StatusPill status={quotation.status || "SUBMITTED"} />
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-600">
                  Quotation {quotation.quotationId} | {money(quotation.quotedAmount)} | Submitted {formatDate(quotation.submittedAt)}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className={cardClass}>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Quotation Details</div>
          <h2 className="mt-2 text-2xl font-black text-[#10283f]">
            {selectedQuotation ? `Quotation ${selectedQuotation.quotationId}` : "Select a quotation"}
          </h2>

          {!selectedQuotation ? (
            <div className="mt-6">
              <EmptyState text="Select a submitted quotation to view its details." />
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailTile label="RFQ" value={selectedQuotation.rfqNumber || selectedQuotation.rfqId} />
                <DetailTile label="Status" value={selectedQuotation.status || "SUBMITTED"} />
                <DetailTile label="Quoted Amount" value={money(selectedQuotation.quotedAmount)} />
                <DetailTile label="Delivery Period" value={selectedQuotation.deliveryPeriodDays ? `${selectedQuotation.deliveryPeriodDays} days` : "Not set"} />
                <DetailTile label="Submitted At" value={formatDate(selectedQuotation.submittedAt)} />
                <DetailTile label="Updated At" value={formatDate(selectedQuotation.updatedAt)} />
              </div>

              <div className="rounded-[24px] bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Vendor Notes</div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{selectedQuotation.remarks || "No remarks submitted."}</p>
                {selectedQuotation.attachmentUrl ? (
                  <a
                    href={selectedQuotation.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-bold text-[#166e8c]"
                  >
                    Open attachment
                  </a>
                ) : null}
              </div>

              {selectedQuotation.evaluationComment ? (
                <div className="rounded-[24px] bg-[#fff9ec] p-5 text-sm leading-7 text-[#7a5300]">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em]">TEC Evaluation Comment</div>
                  <p className="mt-2">{selectedQuotation.evaluationComment}</p>
                </div>
              ) : null}

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Quoted Items</div>
                <div className="mt-4 space-y-4">
                  {!safeList(selectedQuotation.items).length ? <EmptyState text="No item details are available for this quotation." /> : null}
                  {safeList(selectedQuotation.items).map((item) => (
                    <div key={item.bidItemId || item.requisitionItemId} className="rounded-[24px] border border-[#dce8ef] bg-white p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-lg font-black text-[#10283f]">{item.requisitionItemName || "Quotation item"}</h3>
                          <p className="mt-1 text-sm text-slate-600">
                            Quantity {item.quantity || "Not set"} | Unit price {money(item.quotedUnitPrice)} | Total {money(item.quotedTotalPrice)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-[20px] bg-[#f8fcff] p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">Required Specification</div>
                          <p className="mt-3 text-sm leading-7 text-slate-700">{item.requiredSpecification || "No required specification recorded."}</p>
                          {item.requiredSpecificationDocumentUrl ? (
                            <a className="mt-3 inline-block text-sm font-bold text-[#166e8c]" href={item.requiredSpecificationDocumentUrl} target="_blank" rel="noreferrer">
                              Open required spec document
                            </a>
                          ) : null}
                        </div>
                        <div className="rounded-[20px] bg-[#f8fcff] p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">Submitted Vendor Specification</div>
                          <p className="mt-3 text-sm leading-7 text-slate-700">{item.vendorSpecification || "No vendor specification submitted."}</p>
                          {item.specificationDocumentUrl ? (
                            <a className="mt-3 inline-block text-sm font-bold text-[#166e8c]" href={item.specificationDocumentUrl} target="_blank" rel="noreferrer">
                              Open submitted spec document
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
