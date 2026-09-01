import { useEffect, useMemo, useRef, useState } from "react";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { vendorApi } from "../../api/vendorApi";
import { rfqDisplayName } from "../../utils/procurementDisplay";
import PaginationControls from "../../components/PaginationControls";
import { toast } from "react-toastify";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";
const PAGE_SIZE = 10;

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
const parseSubmittedSpecificationRows = (item) => {
  const rows = String(item?.vendorSpecification || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\d+\.\s*(.*?)\s*-\s*Required:\s*(.*?)\s*\|\s*Conformity:\s*(Yes|No)\s*\|\s*Bidder Response:\s*(.*)$/i);
      if (!match) return null;
      return {
        description: match[1],
        requiredSpecification: match[2],
        conformity: match[3][0].toUpperCase() + match[3].slice(1).toLowerCase(),
        bidderResponse: match[4],
      };
    })
    .filter(Boolean);

  if (rows.length) return rows;
  return [{
    description: item?.requisitionItemName || "Item specification",
    requiredSpecification: item?.requiredSpecification || "Not provided",
    conformity: "",
    bidderResponse: item?.vendorSpecification || "No vendor specification submitted.",
  }];
};
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
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const detailsRef = useRef(null);

  const selectedQuotation = useMemo(
    () => quotations.find((quotation) => String(quotation.quotationId) === String(selectedId)) || null,
    [quotations, selectedId]
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await vendorApi.quotations.listPage(page, PAGE_SIZE);
      const list = safeList(data?.content);
      setQuotations(list);
      setTotalPages(Math.max(1, data?.totalPages || 1));
      setTotalItems(data?.totalElements || 0);
      setSelectedId((current) => list.some((quotation) => String(quotation.quotationId) === String(current)) ? current : "");
    } catch (err) {
      setError(err.message || "Could not load submitted quotations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  const selectQuotation = (quotationId) => {
    setSelectedId(String(quotationId));
    window.requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

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
      toast.warning("Please choose the requested document before submitting.", { autoClose: 3500 });
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
      toast.success("Requested document submitted to BEC.", { autoClose: 3000 });
    } catch (submitError) {
      const message = submitError.message || "Could not submit the requested document.";
      setError(message);
      toast.error(message, { autoClose: 4000 });
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

      <div className="space-y-6">
        <section className="min-w-0 rounded-2xl border border-[#dce8ef] bg-white p-4 shadow-[0_12px_30px_rgba(15,41,64,0.06)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Quotation List</div>
              <h2 className="mt-1 text-xl font-black text-[#10283f]">My Submitted Quotations</h2>
            </div>
            <button
              type="button"
              onClick={load}
              className="self-start rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {loading ? <EmptyState text="Loading submitted quotations..." /> : null}
            {!loading && !quotations.length ? <EmptyState text="No quotations submitted yet." /> : null}
            {quotations.map((quotation) => (
              <button
                key={quotation.quotationId}
                type="button"
                onClick={() => selectQuotation(quotation.quotationId)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                  String(selectedQuotation?.quotationId) === String(quotation.quotationId)
                    ? "border-[#166e8c] bg-[#f5fbff]"
                    : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-[#10283f]">
                    {rfqDisplayName(quotation, "Submitted quotation")}
                  </h3>
                  <StatusPill status={quotation.rfqStatus || quotation.status || "SUBMITTED"} />
                  {quotation.documentReviewStatus && quotation.documentReviewStatus !== "NOT_REQUESTED" ? (
                    <StatusPill status={quotation.documentReviewStatus} />
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {money(quotation.quotedAmount)} | Submitted {formatDate(quotation.submittedAt)}
                </div>
              </button>
            ))}
          </div>
          <PaginationControls page={page} setPage={setPage} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} />
        </section>

        <section ref={detailsRef} className={`${cardClass} min-w-0 scroll-mt-24 ${selectedQuotation ? "block" : "hidden"}`}>
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
                <DetailTile label="Status" value={selectedQuotation.rfqStatus || selectedQuotation.status || "SUBMITTED"} />
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

                      <div className="mt-4 max-w-full overflow-hidden rounded-[18px] border border-[#dce8ef] bg-white">
                        <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
                          <thead className="bg-[#edf7fb] text-[#10283f]">
                            <tr>
                              <th className="w-[20%] border border-[#c8dce7] px-2 py-2 text-left">Description</th>
                              <th className="w-[28%] border border-[#c8dce7] px-2 py-2 text-left">Required Specification</th>
                              <th className="w-[12%] border border-[#c8dce7] px-2 py-2 text-center" colSpan={2}>Conformity</th>
                              <th className="w-[40%] border border-[#c8dce7] px-2 py-2 text-left">Submitted Vendor Specification</th>
                            </tr>
                            <tr>
                              <th className="border border-[#c8dce7] px-3 py-2" />
                              <th className="border border-[#c8dce7] px-3 py-2" />
                              <th className="w-14 border border-[#c8dce7] px-3 py-2 text-center">Yes</th>
                              <th className="w-14 border border-[#c8dce7] px-3 py-2 text-center">No</th>
                              <th className="border border-[#c8dce7] px-3 py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {parseSubmittedSpecificationRows(item).map((row, rowIndex) => (
                              <tr key={`${item.bidItemId || item.requisitionItemId}-${rowIndex}`} className="bg-white">
                                <td className="break-words border border-[#c8dce7] px-2 py-2 align-top text-slate-700">{row.description || "Not provided"}</td>
                                <td className="break-words border border-[#c8dce7] px-2 py-2 align-top text-slate-700">{row.requiredSpecification || "Not provided"}</td>
                                <td className="border border-[#c8dce7] px-3 py-2 text-center align-top font-black text-emerald-700">{row.conformity === "Yes" ? "✓" : ""}</td>
                                <td className="border border-[#c8dce7] px-3 py-2 text-center align-top font-black text-red-700">{row.conformity === "No" ? "✓" : ""}</td>
                                <td className="break-words border border-[#c8dce7] px-2 py-2 align-top text-slate-700">{row.bidderResponse && row.bidderResponse !== "N/A" ? row.bidderResponse : row.conformity === "Yes" ? "Conforms to the required specification" : "Not provided"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4">
                        {item.requiredSpecificationDocumentUrl ? <a className="text-sm font-bold text-[#166e8c]" href={item.requiredSpecificationDocumentUrl} target="_blank" rel="noreferrer">Open required spec document</a> : null}
                        {item.specificationDocumentUrl ? <a className="text-sm font-bold text-[#166e8c]" href={item.specificationDocumentUrl} target="_blank" rel="noreferrer">Open submitted spec document</a> : null}
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
