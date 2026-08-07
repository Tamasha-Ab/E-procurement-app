import { useEffect, useMemo, useRef, useState } from "react";
import { Button, TextField } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PageHero from "../../components/PageHero";
import { vendorApi } from "../../api/vendorApi";
import { rfqDisplayName, rfqContext } from "../../utils/procurementDisplay";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";
const inputClass = "w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#166e8c]";

const requiredDocuments = [
  "Completed Bid Submission Form",
  "Completed Price Schedule",
  "Bid Security or Bid-Securing Declaration",
  "Goods conformity evidence",
  "Bidder qualification and eligibility evidence",
  "Manufacturer Authorization",
  "Non-collusion affidavit",
  "Product literature, user manuals, technical data, drawings, and conformity responses",
  "Warranty and maintenance/service agreement details",
];

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });

const safeList = (value) => (Array.isArray(value) ? value : []);
const emptyDocuments = () => requiredDocuments.map((label) => ({ label, fileName: "", dataUrl: "" }));
const money = (value) => {
  const number = Number(value || 0);
  return number ? `LKR ${number.toLocaleString()}` : "LKR 0";
};

function parseStoredDocuments(value) {
  if (!value) return emptyDocuments();
  try {
    const parsed = JSON.parse(value);
    const saved = Array.isArray(parsed?.requiredDocuments) ? parsed.requiredDocuments : Array.isArray(parsed) ? parsed : [];
    return requiredDocuments.map((label) => saved.find((doc) => doc.label === label) || { label, fileName: "", dataUrl: "" });
  } catch {
    return emptyDocuments();
  }
}

function buildPackageDataUrl(payload) {
  const json = JSON.stringify(payload, null, 2);
  return `data:application/json;base64,${window.btoa(unescape(encodeURIComponent(json)))}`;
}

const parseSpecificationTableRows = (specificationText = "") => specificationText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const numberedMatch = line.match(/^\d+\.\s*(.*?)\s*-\s*(.*)$/);
    if (numberedMatch) return { description: numberedMatch[1], requiredSpecification: numberedMatch[2] };
    const [description, ...requiredParts] = line.split(":");
    return { description: description?.trim() || "", requiredSpecification: requiredParts.join(":").trim() };
  })
  .filter((row) => row.description || row.requiredSpecification);

function buildItemSpecificationRows(rr, item) {
  const specs = safeList(rr?.technicalSpecifications);
  const matchingSpecs = specs.filter((spec) => String(spec.itemId || "") === String(item.itemId || ""));
  const selectedSpecs = matchingSpecs.length ? matchingSpecs : specs.filter((spec) => !spec.itemId);
  const rows = selectedSpecs.flatMap((spec) => parseSpecificationTableRows(spec.specificationText));

  return (rows.length ? rows : [{
    description: item.description || item.itemName || "Item specification",
    requiredSpecification: "Specification not provided",
  }]).map((row) => ({ ...row, conformity: "", bidderResponse: "" }));
}

function createItemForms(rfq) {
  return safeList(rfq?.requisitionRequests)
    .flatMap((rr) => safeList(rr.items).map((item) => ({
      requisitionItemId: item.itemId,
      itemName: item.itemName || "RR item",
      description: item.description || "",
      requiredQuantity: item.quantity || 1,
      quantity: item.quantity || 1,
      quotedUnitPrice: "",
      specificationRows: buildItemSpecificationRows(rr, item),
      specificationDocumentName: "",
      specificationDocumentUrl: "",
    })));
}

export default function VendorQuotationSubmission() {
  const navigate = useNavigate();
  const location = useLocation();
  const documentInputRefs = useRef({});
  const itemInputRefs = useRef({});
  const [searchParams] = useSearchParams();
  const isItemPage = location.pathname.endsWith("/items");
  const isSelectionPage = location.pathname.endsWith("/rfq-selection");
  const requestedRfqId = searchParams.get("rfqId") || "";
  const [rfqs, setRfqs] = useState([]);
  const [selectedRfqId, setSelectedRfqId] = useState(requestedRfqId);
  const [itemForms, setItemForms] = useState([]);
  const [documents, setDocuments] = useState(emptyDocuments);
  const [form, setForm] = useState({ deliveryPeriodDays: "", remarks: "" });
  const [loading, setLoading] = useState(true);
  const [savingDocs, setSavingDocs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedRfq = useMemo(
    () => rfqs.find((rfq) => String(rfq.rfqId) === String(selectedRfqId)) || null,
    [rfqs, selectedRfqId]
  );
  const documentsComplete = documents.every((document) => document.dataUrl);
  const total = itemForms.reduce((sum, item) => sum + (Number(item.quotedUnitPrice || 0) * Number(item.quantity || 0)), 0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      vendorApi.rfqs.list().catch(() => []),
      vendorApi.profile.quotationDocuments().catch(() => ""),
      requestedRfqId ? vendorApi.rfqs.detail(requestedRfqId).catch(() => null) : Promise.resolve(null),
    ])
      .then(([rfqData, storedDocuments, requestedRfq]) => {
        if (cancelled) return;
        const list = safeList(rfqData);
        const mergedList = requestedRfq
          ? [requestedRfq, ...list.filter((rfq) => String(rfq.rfqId) !== String(requestedRfq.rfqId))]
          : list;
        setRfqs(mergedList);
        setDocuments(parseStoredDocuments(storedDocuments));
        setSelectedRfqId((current) => current || requestedRfqId || (mergedList[0]?.rfqId ? String(mergedList[0].rfqId) : ""));
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || "Could not load quotation submission data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestedRfqId]);

  useEffect(() => {
    setItemForms(createItemForms(selectedRfq));
  }, [selectedRfq]);

  const setDocumentFile = async (index, file) => {
    const dataUrl = await fileToDataUrl(file);
    setDocuments((current) => current.map((document, documentIndex) => (
      documentIndex === index ? { ...document, fileName: file?.name || "", dataUrl } : document
    )));
  };

  const clearDocumentFile = (index) => {
    setDocuments((current) => current.map((document, documentIndex) => (
      documentIndex === index ? { ...document, fileName: "", dataUrl: "" } : document
    )));
    if (documentInputRefs.current[index]) {
      documentInputRefs.current[index].value = "";
    }
  };

  const saveDocuments = async () => {
    setError("");
    setNotice("");
    setSavingDocs(true);
    try {
      await vendorApi.profile.saveQuotationDocuments(JSON.stringify({ requiredDocuments: documents }));
      setNotice("Vendor documents saved successfully.");
    } catch (saveError) {
      setError(saveError.message || "Could not save vendor documents.");
    } finally {
      setSavingDocs(false);
    }
  };

  const openSelectedRr = (rfqId) => {
    if (!rfqId) return;
    navigate(`/vendor/quotation-submission/items?rfqId=${rfqId}`);
  };

  const openRfqSelection = () => {
    navigate(`/vendor/quotation-submission/rfq-selection${selectedRfqId ? `?rfqId=${selectedRfqId}` : ""}`);
  };

  const setItemValue = (index, field, value) => {
    setItemForms((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const setSpecificationResponse = (itemIndex, rowIndex, field, value) => {
    setItemForms((current) => current.map((item, currentItemIndex) => (
      currentItemIndex !== itemIndex
        ? item
        : {
          ...item,
          specificationRows: item.specificationRows.map((row, currentRowIndex) => (
            currentRowIndex === rowIndex ? { ...row, [field]: value } : row
          )),
        }
    )));
  };

  const setItemFile = async (index, file) => {
    const dataUrl = await fileToDataUrl(file);
    setItemForms((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, specificationDocumentName: file?.name || "", specificationDocumentUrl: dataUrl } : item
    )));
  };

  const clearItemFile = (index) => {
    setItemForms((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, specificationDocumentName: "", specificationDocumentUrl: "" } : item
    )));
    if (itemInputRefs.current[index]) {
      itemInputRefs.current[index].value = "";
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!selectedRfq) return setError("Select an RFQ invitation before submitting.");
    if (!documentsComplete) return setError("Upload and save every required vendor document before submitting.");
    if (!itemForms.length) return setError("This RFQ has no RR items available for quotation.");
    if (itemForms.some((item) => !item.quotedUnitPrice || !item.quantity || !item.specificationDocumentUrl)) {
      return setError("Complete unit price, quantity, and specification document for every RR item.");
    }
    if (itemForms.some((item) => item.specificationRows.some((row) => !row.conformity || (row.conformity === "No" && !row.bidderResponse.trim())))) {
      return setError("Complete conformity for every submitted specification row. If conformity is No, bidder response is required.");
    }

    setSubmitting(true);
    try {
      const attachmentUrl = buildPackageDataUrl({
        rfqId: selectedRfq.rfqId,
        rfqName: rfqDisplayName(selectedRfq),
        rfqContext: rfqContext(selectedRfq),
        submittedAt: new Date().toISOString(),
        requiredDocuments: documents,
      });

      await vendorApi.rfqs.quote(selectedRfq.rfqId, {
        quotedAmount: total,
        deliveryPeriodDays: form.deliveryPeriodDays ? Number(form.deliveryPeriodDays) : null,
        remarks: form.remarks,
        attachmentUrl,
        items: itemForms.map((item) => ({
          requisitionItemId: item.requisitionItemId,
          quotedUnitPrice: Number(item.quotedUnitPrice),
          quantity: Number(item.quantity),
          vendorSpecification: item.specificationRows.map((row, rowIndex) => (
            `${rowIndex + 1}. ${row.description || "Specification"} - Required: ${row.requiredSpecification || "Not provided"} | Conformity: ${row.conformity} | Bidder Response: ${row.bidderResponse || "N/A"}`
          )).join("\n"),
          specificationDocumentUrl: item.specificationDocumentUrl,
        })),
      });

      navigate("/vendor/quotations");
    } catch (submitError) {
      setError(submitError.message || "Could not submit quotation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-7">
      <PageHero
        eyebrow="Quotation Submission"
        title={isItemPage ? "RR Item Quotation" : isSelectionPage ? "RFQ Selection" : "Quotation Submission"}
        description={isItemPage
          ? "Quote each RR item in a separate workspace, then go back to choose another RFQ."
          : isSelectionPage
            ? "Select an RFQ invitation to open the RR item quotation workspace."
            : "Save reusable vendor documents first, then continue to RFQ selection."}
      >
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate(isItemPage ? "/vendor/quotation-submission/rfq-selection" : isSelectionPage ? "/vendor/quotation-submission" : "/vendor/rfq-invitations")}
          sx={{ color: "white", textTransform: "none", fontWeight: 800 }}
        >
          Back
        </Button>
      </PageHero>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div> : null}

      {!isItemPage && !isSelectionPage ? (
        <>
          <section className={cardClass}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Documents and Instructions to Vendors</div>
                <h2 className="mt-2 text-2xl font-black text-[#10283f]">Documents vendors must submit</h2>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={saveDocuments} disabled={savingDocs} sx={{ textTransform: "none", bgcolor: "#166e8c", borderRadius: "14px", fontWeight: 800 }}>
                  {savingDocs ? "Saving..." : "Save Documents"}
                </Button>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {documents.map((document, index) => (
                <div key={document.label} className="rounded-[18px] border border-[#dce8ef] bg-slate-50 p-4">
                  <span className="block text-sm font-black text-[#10283f]">{document.label}</span>
                  <input
                    ref={(element) => { documentInputRefs.current[index] = element; }}
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                    onChange={(event) => setDocumentFile(index, event.target.files?.[0] || null)}
                    className="sr-only"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={document.dataUrl ? <EditRoundedIcon /> : <SaveRoundedIcon />}
                      onClick={() => documentInputRefs.current[index]?.click()}
                      sx={{ textTransform: "none", borderColor: "#166e8c", color: "#166e8c", borderRadius: "12px", fontWeight: 800 }}
                    >
                      {document.dataUrl ? "Edit Document" : "Upload Document"}
                    </Button>
                    <Button
                      size="small"
                      startIcon={<DeleteRoundedIcon />}
                      onClick={() => clearDocumentFile(index)}
                      disabled={!document.dataUrl}
                      sx={{ textTransform: "none", color: "#b42318", borderRadius: "12px", fontWeight: 800 }}
                    >
                      Delete
                    </Button>
                  </div>
                  <span className={`mt-2 block text-xs font-semibold ${document.dataUrl ? "text-emerald-700" : "text-red-600"}`}>
                    {document.fileName || (document.dataUrl ? "Saved document" : "Required")}
                  </span>
                  {document.dataUrl ? (
                    <a href={document.dataUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-[#166e8c] hover:underline">
                      Open current document
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outlined" onClick={openRfqSelection} sx={{ textTransform: "none", borderColor: "#166e8c", color: "#166e8c", borderRadius: "14px", fontWeight: 800 }}>
                Next
              </Button>
            </div>
          </section>
        </>
      ) : isSelectionPage ? (
        <form onSubmit={submit} className="space-y-6">
          <section className={cardClass}>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RFQ Selection</div>
            <h2 className="mt-2 text-2xl font-black text-[#10283f]">RFQ Invitation</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-[#10283f]">Select RR / RFQ</span>
                <select className={inputClass} value={selectedRfqId} onChange={(event) => setSelectedRfqId(event.target.value)} required>
                  <option value="">{loading ? "Loading RFQs..." : "Select RFQ"}</option>
                  {rfqs.map((rfq) => (
                    <option key={rfq.rfqId} value={rfq.rfqId}>
                      {rfqDisplayName(rfq)}{rfqContext(rfq) ? ` - ${rfqContext(rfq)}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-[22px] bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Selected RR</div>
                <div className="mt-2 text-lg font-black text-[#10283f]">
                  {selectedRfq ? rfqDisplayName(selectedRfq) : "Select an RFQ invitation"}
                </div>
                <div className="mt-2 whitespace-pre-line">
                  {selectedRfq?.description || selectedRfq?.title || "Choose an RFQ invitation to open the RR item quotation page."}
                </div>
              </div>
            </div>
          </section>

          {selectedRfq ? (
            <>
              <section className={cardClass}>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RR Item Quotation</div>
                <h2 className="mt-2 text-2xl font-black text-[#10283f]">Quote each RR item</h2>
                <div className="mt-5 space-y-4">
                  {!itemForms.length && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No RR items found for this RFQ.</div>}
                  {itemForms.map((item, index) => (
                    <div key={item.requisitionItemId || index} className="rounded-[24px] border border-[#dce8ef] bg-slate-50 p-5">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-lg font-black text-[#10283f]">{item.itemName}</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{item.description || "No item description."}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#166e8c]">Required Qty {item.requiredQuantity}</span>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <TextField label="Quoted unit price" type="number" value={item.quotedUnitPrice} onChange={(e) => setItemValue(index, "quotedUnitPrice", e.target.value)} required />
                        <TextField label="Quantity" type="number" value={item.quantity} onChange={(e) => setItemValue(index, "quantity", e.target.value)} required />
                        <div className="md:col-span-2 overflow-x-auto rounded-[18px] border border-[#dce8ef] bg-white">
                          <table className="min-w-[860px] w-full border-collapse text-sm">
                            <thead className="bg-[#edf7fb] text-[#10283f]">
                              <tr>
                                <th className="border border-[#c8dce7] px-3 py-2 text-left">Description</th>
                                <th className="border border-[#c8dce7] px-3 py-2 text-left">Required Specification</th>
                                <th className="border border-[#c8dce7] px-3 py-2 text-center" colSpan={2}>Conformity</th>
                                <th className="border border-[#c8dce7] px-3 py-2 text-left">If No, Bidder's Response</th>
                              </tr>
                              <tr>
                                <th className="border border-[#c8dce7] px-3 py-2" />
                                <th className="border border-[#c8dce7] px-3 py-2" />
                                <th className="border border-[#c8dce7] px-3 py-2 text-center">Yes</th>
                                <th className="border border-[#c8dce7] px-3 py-2 text-center">No</th>
                                <th className="border border-[#c8dce7] px-3 py-2" />
                              </tr>
                            </thead>
                            <tbody>
                              {item.specificationRows.map((row, rowIndex) => (
                                <tr key={`${item.requisitionItemId}-${rowIndex}`} className="bg-white">
                                  <td className="border border-[#c8dce7] px-3 py-2 align-top text-slate-700">{row.description || "Not provided"}</td>
                                  <td className="border border-[#c8dce7] px-3 py-2 align-top text-slate-700">{row.requiredSpecification || "Not provided"}</td>
                                  <td className="border border-[#c8dce7] px-3 py-2 text-center align-top">
                                    <input type="radio" name={`selection-conformity-${index}-${rowIndex}`} checked={row.conformity === "Yes"} onChange={() => setSpecificationResponse(index, rowIndex, "conformity", "Yes")} required />
                                  </td>
                                  <td className="border border-[#c8dce7] px-3 py-2 text-center align-top">
                                    <input type="radio" name={`selection-conformity-${index}-${rowIndex}`} checked={row.conformity === "No"} onChange={() => setSpecificationResponse(index, rowIndex, "conformity", "No")} required />
                                  </td>
                                  <td className="border border-[#c8dce7] px-3 py-2 align-top">
                                    <textarea className="min-h-[72px] w-full rounded-xl border border-[#dce8ef] px-3 py-2 text-sm outline-none focus:border-[#166e8c] disabled:bg-slate-100" value={row.bidderResponse} onChange={(event) => setSpecificationResponse(index, rowIndex, "bidderResponse", event.target.value)} disabled={row.conformity !== "No"} required={row.conformity === "No"} placeholder={row.conformity === "No" ? "Enter bidder response" : "N/A"} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="md:col-span-2 rounded-[18px] border border-[#dce8ef] bg-white p-4">
                          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Specification document</span>
                          <input ref={(element) => { itemInputRefs.current[index] = element; }} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => setItemFile(index, event.target.files?.[0] || null)} className="sr-only" />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="small" variant="outlined" startIcon={item.specificationDocumentUrl ? <EditRoundedIcon /> : <SaveRoundedIcon />} onClick={() => itemInputRefs.current[index]?.click()} sx={{ textTransform: "none", borderColor: "#166e8c", color: "#166e8c", borderRadius: "12px", fontWeight: 800 }}>
                              {item.specificationDocumentUrl ? "Edit Document" : "Upload Document"}
                            </Button>
                            <Button size="small" startIcon={<DeleteRoundedIcon />} onClick={() => clearItemFile(index)} disabled={!item.specificationDocumentUrl} sx={{ textTransform: "none", color: "#b42318", borderRadius: "12px", fontWeight: 800 }}>
                              Delete
                            </Button>
                          </div>
                          {item.specificationDocumentName && <span className="mt-2 block text-xs font-semibold text-slate-500">{item.specificationDocumentName}</span>}
                          {item.specificationDocumentUrl ? <a href={item.specificationDocumentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-[#166e8c] hover:underline">Open current document</a> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={cardClass}>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Delivery period days" type="number" value={form.deliveryPeriodDays} onChange={(e) => setForm({ ...form, deliveryPeriodDays: e.target.value })} required />
                  <div className="rounded-[20px] bg-[#edf7fb] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Quotation Total</div>
                    <div className="mt-2 text-2xl font-black text-[#10283f]">{money(total)}</div>
                  </div>
                  <TextField className="md:col-span-2" label="Remarks" multiline minRows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </div>
                <div className="mt-5 flex justify-end">
                  <Button type="submit" variant="contained" startIcon={<SendRoundedIcon />} disabled={submitting} sx={{ textTransform: "none", bgcolor: "#166e8c", borderRadius: "14px", fontWeight: 800 }}>
                    {submitting ? "Submitting..." : "Submit Quotation"}
                  </Button>
                </div>
              </section>
            </>
          ) : null}
        </form>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <section className={cardClass}>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RFQ Selection</div>
            <h2 className="mt-2 text-2xl font-black text-[#10283f]">{selectedRfq ? rfqDisplayName(selectedRfq) : "Selected RFQ"}</h2>
            <div className="mt-3 whitespace-pre-line rounded-[22px] bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              {selectedRfq?.description || "Selected RFQ details are loading."}
            </div>
          </section>

          <section className={cardClass}>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RR Item Quotation</div>
            <h2 className="mt-2 text-2xl font-black text-[#10283f]">Quote each RR item</h2>
            <div className="mt-5 space-y-4">
              {!itemForms.length && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No RR items found for this RFQ.</div>}
              {itemForms.map((item, index) => (
                <div key={item.requisitionItemId || index} className="rounded-[24px] border border-[#dce8ef] bg-slate-50 p-5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-[#10283f]">{item.itemName}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.description || "No item description."}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#166e8c]">Required Qty {item.requiredQuantity}</span>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <TextField label="Quoted unit price" type="number" value={item.quotedUnitPrice} onChange={(e) => setItemValue(index, "quotedUnitPrice", e.target.value)} required />
                    <TextField label="Quantity" type="number" value={item.quantity} onChange={(e) => setItemValue(index, "quantity", e.target.value)} required />
                    <div className="md:col-span-2 overflow-x-auto rounded-[18px] border border-[#dce8ef] bg-white">
                      <table className="min-w-[860px] w-full border-collapse text-sm">
                        <thead className="bg-[#edf7fb] text-[#10283f]">
                          <tr>
                            <th className="border border-[#c8dce7] px-3 py-2 text-left">Description</th>
                            <th className="border border-[#c8dce7] px-3 py-2 text-left">Required Specification</th>
                            <th className="border border-[#c8dce7] px-3 py-2 text-center" colSpan={2}>Conformity</th>
                            <th className="border border-[#c8dce7] px-3 py-2 text-left">If No, Bidder's Response</th>
                          </tr>
                          <tr>
                            <th className="border border-[#c8dce7] px-3 py-2" />
                            <th className="border border-[#c8dce7] px-3 py-2" />
                            <th className="border border-[#c8dce7] px-3 py-2 text-center">Yes</th>
                            <th className="border border-[#c8dce7] px-3 py-2 text-center">No</th>
                            <th className="border border-[#c8dce7] px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {item.specificationRows.map((row, rowIndex) => (
                            <tr key={`${item.requisitionItemId}-${rowIndex}`} className="bg-white">
                              <td className="border border-[#c8dce7] px-3 py-2 align-top text-slate-700">{row.description || "Not provided"}</td>
                              <td className="border border-[#c8dce7] px-3 py-2 align-top text-slate-700">{row.requiredSpecification || "Not provided"}</td>
                              <td className="border border-[#c8dce7] px-3 py-2 text-center align-top">
                                <input type="radio" name={`conformity-${index}-${rowIndex}`} checked={row.conformity === "Yes"} onChange={() => setSpecificationResponse(index, rowIndex, "conformity", "Yes")} required />
                              </td>
                              <td className="border border-[#c8dce7] px-3 py-2 text-center align-top">
                                <input type="radio" name={`conformity-${index}-${rowIndex}`} checked={row.conformity === "No"} onChange={() => setSpecificationResponse(index, rowIndex, "conformity", "No")} required />
                              </td>
                              <td className="border border-[#c8dce7] px-3 py-2 align-top">
                                <textarea
                                  className="min-h-[72px] w-full rounded-xl border border-[#dce8ef] px-3 py-2 text-sm outline-none focus:border-[#166e8c] disabled:bg-slate-100"
                                  value={row.bidderResponse}
                                  onChange={(event) => setSpecificationResponse(index, rowIndex, "bidderResponse", event.target.value)}
                                  disabled={row.conformity !== "No"}
                                  required={row.conformity === "No"}
                                  placeholder={row.conformity === "No" ? "Enter bidder response" : "N/A"}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:col-span-2 rounded-[18px] border border-[#dce8ef] bg-white p-4">
                      <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Specification document</span>
                      <input ref={(element) => { itemInputRefs.current[index] = element; }} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => setItemFile(index, event.target.files?.[0] || null)} className="sr-only" />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="small" variant="outlined" startIcon={item.specificationDocumentUrl ? <EditRoundedIcon /> : <SaveRoundedIcon />} onClick={() => itemInputRefs.current[index]?.click()} sx={{ textTransform: "none", borderColor: "#166e8c", color: "#166e8c", borderRadius: "12px", fontWeight: 800 }}>
                          {item.specificationDocumentUrl ? "Edit Document" : "Upload Document"}
                        </Button>
                        <Button size="small" startIcon={<DeleteRoundedIcon />} onClick={() => clearItemFile(index)} disabled={!item.specificationDocumentUrl} sx={{ textTransform: "none", color: "#b42318", borderRadius: "12px", fontWeight: 800 }}>
                          Delete
                        </Button>
                      </div>
                      {item.specificationDocumentName && <span className="mt-2 block text-xs font-semibold text-slate-500">{item.specificationDocumentName}</span>}
                      {item.specificationDocumentUrl ? <a href={item.specificationDocumentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-[#166e8c] hover:underline">Open current document</a> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={cardClass}>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Delivery period days" type="number" value={form.deliveryPeriodDays} onChange={(e) => setForm({ ...form, deliveryPeriodDays: e.target.value })} required />
              <div className="rounded-[20px] bg-[#edf7fb] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Quotation Total</div>
                <div className="mt-2 text-2xl font-black text-[#10283f]">{money(total)}</div>
              </div>
              <TextField className="md:col-span-2" label="Remarks" multiline minRows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
            <div className="mt-5 flex justify-end">
              <Button type="submit" variant="contained" startIcon={<SendRoundedIcon />} disabled={submitting} sx={{ textTransform: "none", bgcolor: "#166e8c", borderRadius: "14px", fontWeight: 800 }}>
                {submitting ? "Submitting..." : "Submit Quotation"}
              </Button>
            </div>
          </section>
        </form>
      )}
    </div>
  );
}
