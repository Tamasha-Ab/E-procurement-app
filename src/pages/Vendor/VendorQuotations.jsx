import { useEffect, useMemo, useState } from "react";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { vendorApi } from "../../api/vendorApi";
import { rfqDisplayName } from "../../utils/procurementDisplay";

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
const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

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
  const [documentForms, setDocumentForms] = useState({});
  const [submittingDocumentId, setSubmittingDocumentId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  const updateDocumentForm = (quotationId, field, value) => {
    setDocumentForms((current) => ({
      ...current,
      [quotationId]: {
        file: null,
        note: "",
        ...(current[quotationId] || {}),
        [field]: value,
      },
    }));
  };

  const submitRequestedDocument = async () => {
    if (!selectedQuotation?.quotationId) return;
    const form = documentForms[selectedQuotation.quotationId] || {};
    if (!form.file) {
      setError("Please choose the requested document before submitting.");
      return;
    }

    setError("");
    setMessage("");
    setSubmittingDocumentId(String(selectedQuotation.quotationId));
    try {
      const documentUrl = await fileToDataUrl(form.file);
      await vendorApi.quotations.submitRequestedDocument(selectedQuotation.quotationId, {
        documentUrl,
        fileName: form.file.name,
        note: form.note?.trim() || "",
      });
      setDocumentForms((current) => ({ ...current, [selectedQuotation.quotationId]: { file: null, note: "" } }));
      await load();
      setSelectedId(String(selectedQuotation.quotationId));
      setMessage("Requested document submitted to BEC.");
    } catch (submitError) {
      setError(submitError.message || "Could not submit the requested document.");
    } finally {
      setSubmittingDocumentId("");
    }
  };

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Vendor Portal"
        title="Submitted Quotations"
        description="Review the quotations you have already submitted, including item prices, specifications, attachments, and TEC evaluation status."
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div> : null}

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
                    {rfqDisplayName(quotation, "Submitted quotation")}
                  </h3>
                  <StatusPill status={quotation.status || "SUBMITTED"} />
                  {quotation.documentReviewStatus && quotation.documentReviewStatus !== "NOT_REQUESTED" ? (
                    <StatusPill status={quotation.documentReviewStatus} />
                  ) : null}
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-600">
                  {money(quotation.quotedAmount)} | Submitted {formatDate(quotation.submittedAt)}
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
                <DetailTile label="Quotation Request" value={rfqDisplayName(selectedQuotation, "Submitted quotation")} />
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

              {selectedQuotation.documentReviewStatus && selectedQuotation.documentReviewStatus !== "NOT_REQUESTED" ? (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">BEC Document Review</div>
                    <StatusPill status={selectedQuotation.documentReviewStatus} />
                  </div>
                  <div className="mt-3 text-sm leading-7 text-amber-900">
                    <div className="font-black text-[#10283f]">{selectedQuotation.requestedDocumentName || "Requested document"}</div>
                    <p>{selectedQuotation.documentRequestNote || "BEC requested an additional document for this quotation."}</p>
                    {selectedQuotation.documentRequestedAt ? <p>Requested {formatDate(selectedQuotation.documentRequestedAt)}</p> : null}
                  </div>

                  {selectedQuotation.documentReviewStatus === "REQUESTED" ? (
                    <div className="mt-4 space-y-3">
                      <input
                        type="file"
                        onChange={(event) => updateDocumentForm(selectedQuotation.quotationId, "file", event.target.files?.[0] || null)}
                        className="block w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-[#10283f] file:mr-4 file:rounded-xl file:border-0 file:bg-[#166e8c] file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
                      />
                      <textarea
                        value={documentForms[selectedQuotation.quotationId]?.note || ""}
                        onChange={(event) => updateDocumentForm(selectedQuotation.quotationId, "note", event.target.value)}
                        placeholder="Optional note to BEC"
                        rows={3}
                        className="w-full resize-none rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-[#10283f] outline-none focus:border-[#166e8c]"
                      />
                      <button
                        type="button"
                        onClick={submitRequestedDocument}
                        disabled={submittingDocumentId === String(selectedQuotation.quotationId)}
                        className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-black text-white hover:bg-[#145f79] disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {submittingDocumentId === String(selectedQuotation.quotationId) ? "Submitting..." : "Submit Requested Document"}
                      </button>
                    </div>
                  ) : null}

                  {selectedQuotation.requestedDocumentUrl ? (
                    <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-700">
                      <div className="font-black text-[#10283f]">{selectedQuotation.requestedDocumentFileName || selectedQuotation.requestedDocumentName || "Submitted document"}</div>
                      <div className="mt-1">Submitted {formatDate(selectedQuotation.documentSubmittedAt)}</div>
                      <a className="mt-3 inline-block font-black text-[#166e8c]" href={selectedQuotation.requestedDocumentUrl} target="_blank" rel="noreferrer">
                        Open submitted document
                      </a>
                    </div>
                  ) : null}
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
