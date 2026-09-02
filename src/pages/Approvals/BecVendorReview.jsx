import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { becHeadPath } from "../../utils/roleRoutes";
import { formatDateTime, formatMoney } from "../../services/apiClient";
import { rfqDisplayName, rfqContext } from "../../utils/procurementDisplay";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";
const selectedButtonClass = "border-[#166e8c] bg-[#e9f7fb] text-[#10283f] shadow-[0_14px_30px_rgba(22,110,140,0.12)]";
const idleButtonClass = "border-[#dce8ef] bg-white text-[#10283f] hover:border-[#9bcddd] hover:bg-[#f8fcff]";
const finalListStorageKey = "bec_final_vendor_list";

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

const clean = (value) => (typeof value === "string" && value.trim() ? value.trim() : "");
const splitCategories = (value) => {
  const rawCategory = clean(value);
  if (!rawCategory) return [];
  return Array.from(new Set(
    rawCategory
      .split(/[,|;\n]/)
      .map((category) => category.trim())
      .filter(Boolean)
  ));
};
const itemKeyFor = (item) => String(item.requisitionItemId || clean(item.requisitionItemName) || item.bidItemId || "unknown-item");
const itemNameFor = (item) => clean(item.requisitionItemName) || `Item ${item.requisitionItemId || item.bidItemId || "not recorded"}`;
const finalSelectionKeyFor = (row) => `${row.category}::${row.itemKey}`;
const readFinalList = () => {
  try {
    const value = window.sessionStorage.getItem(finalListStorageKey);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const writeFinalList = (items) => {
  window.sessionStorage.setItem(finalListStorageKey, JSON.stringify(items));
};
const itemCategoriesFor = (rfq, quotation, item) => {
  const itemCategories = splitCategories(item?.itemCategory);
  if (itemCategories.length) return itemCategories;

  const sentCategories = splitCategories(quotation?.rfqVendorCategory || rfq?.vendorCategory);
  if (sentCategories.length) return sentCategories;

  const requestCategories = splitCategories(quotation?.vendorCategories || rfq?.vendorCategories);
  if (requestCategories.length) return requestCategories;
  return ["Uncategorized"];
};

export default function BecVendorReview() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedItemKey, setSelectedItemKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingItemId, setSubmittingItemId] = useState("");
  const [addingFinalListKey, setAddingFinalListKey] = useState("");
  const [submittingDocumentId, setSubmittingDocumentId] = useState("");
  const [documentRequests, setDocumentRequests] = useState({});
  const [finalList, setFinalList] = useState(() => readFinalList());
  const [sentApprovalItemIds, setSentApprovalItemIds] = useState(() => new Set());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isBecUser = user?.mainRole === "FINANCE" && user?.subRole === "BEC_HEAD";

  const load = useCallback(async () => {
    if (!token || !isBecUser) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const rfqData = await procurementApi.rfqs.publishedForBec(token);
      const rfqs = getArray(rfqData);
      const offerData = await procurementApi.offers.selectedVendors(token).catch(() => []);
      const rejectedQuotationItemIds = new Set(
        getArray(offerData)
          .filter((offer) => offer.status === "REJECTED_BY_VENDOR" && offer.quotationItemId)
          .map((offer) => String(offer.quotationItemId))
      );
      const quotationGroups = await Promise.all(
        rfqs.map((rfq) =>
          procurementApi.rfqs.quotations(token, rfq.rfqId)
            .then((quotationData) => ({ rfq, quotations: getArray(quotationData) }))
            .catch(() => ({ rfq, quotations: [] }))
        )
      );

      const approvedRows = quotationGroups.flatMap(({ rfq, quotations }) =>
        quotations
          .filter((quotation) => !quotation.sealed)
          .flatMap((quotation) =>
            (quotation.items || [])
              .filter((item) => item.technicalStatus === "APPROVED" || item.technicallyCompliant)
              .filter((item) => !rejectedQuotationItemIds.has(String(item.bidItemId || item.requisitionItemId || "")))
              .flatMap((item) =>
                itemCategoriesFor(rfq, quotation, item).map((category) => ({
                  rfq,
                  quotation,
                  item,
                  category,
                  itemKey: itemKeyFor(item),
                  itemName: itemNameFor(item),
                }))
              )
          )
      );

      approvedRows.sort((a, b) => {
        const aTime = new Date(a.quotation.updatedAt || a.quotation.submittedAt || 0).getTime();
        const bTime = new Date(b.quotation.updatedAt || b.quotation.submittedAt || 0).getTime();
        return bTime - aTime;
      });
      setRows(approvedRows);
      setSelectedCategory((current) => {
        if (current && approvedRows.some((row) => row.category === current)) return current;
        return approvedRows[0]?.category || "";
      });
      setSelectedItemKey((current) => {
        if (current && approvedRows.some((row) => row.itemKey === current)) return current;
        return "";
      });
    } catch (loadError) {
      setError(loadError.message || "Could not load vendor review list.");
    } finally {
      setLoading(false);
    }
  }, [token, isBecUser]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => ({
    vendors: new Set(rows.map((row) => row.quotation.vendorId).filter(Boolean)).size,
    totalValue: rows.reduce((sum, row) => sum + Number(row.item.quotedTotalPrice || 0), 0),
  }), [rows]);

  const finalListSummary = useMemo(() => ({
    count: finalList.length,
    categories: new Set(finalList.map((item) => item.category).filter(Boolean)).size,
    totalValue: finalList.reduce((sum, item) => sum + Number(item.quotedTotalPrice || 0), 0),
  }), [finalList]);

  const categories = useMemo(() => {
    const grouped = new Map();
    rows.forEach((row) => {
      const existing = grouped.get(row.category) || { name: row.category, itemKeys: new Set(), vendors: new Set(), totalValue: 0, count: 0 };
      existing.itemKeys.add(row.itemKey);
      if (row.quotation.vendorId) existing.vendors.add(row.quotation.vendorId);
      existing.totalValue += Number(row.item.quotedTotalPrice || 0);
      existing.count += 1;
      grouped.set(row.category, existing);
    });
    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const categoryRows = useMemo(
    () => rows.filter((row) => row.category === selectedCategory),
    [rows, selectedCategory]
  );

  const items = useMemo(() => {
    const grouped = new Map();
    categoryRows.forEach((row) => {
      const existing = grouped.get(row.itemKey) || { key: row.itemKey, name: row.itemName, vendors: new Set(), totalValue: 0, count: 0 };
      if (row.quotation.vendorId) existing.vendors.add(row.quotation.vendorId);
      existing.totalValue += Number(row.item.quotedTotalPrice || 0);
      existing.count += 1;
      grouped.set(row.itemKey, existing);
    });
    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryRows]);

  useEffect(() => {
    if (!selectedCategory) {
      setSelectedItemKey("");
      return;
    }
    if (selectedItemKey && categoryRows.some((row) => row.itemKey === selectedItemKey)) return;
    setSelectedItemKey("");
  }, [categoryRows, selectedCategory, selectedItemKey]);

  const vendorRows = useMemo(
    () => categoryRows.filter((row) => row.itemKey === selectedItemKey),
    [categoryRows, selectedItemKey]
  );

  const sortedVendorRows = useMemo(
    () => [...vendorRows].sort((a, b) => Number(a.item.quotedTotalPrice || Infinity) - Number(b.item.quotedTotalPrice || Infinity)),
    [vendorRows]
  );

  const lowestBidRowKey = sortedVendorRows.length
    ? `${sortedVendorRows[0].quotation.quotationId}-${sortedVendorRows[0].item.bidItemId || sortedVendorRows[0].item.requisitionItemId}`
    : "";

  const addToFinalList = (row) => {
    const selectionKey = finalSelectionKeyFor(row);
    const alreadyAdded = finalList.some((entry) =>
      entry.selectionKey === selectionKey && String(entry.quotationItemId) === String(row.item.bidItemId)
    );
    if (alreadyAdded) return;
    setError("");
    setMessage("");
    setAddingFinalListKey(selectionKey);
    const entry = {
      selectionKey,
      addedAt: new Date().toISOString(),
      category: row.category,
      itemKey: row.itemKey,
      itemName: row.itemName,
      rfqId: row.rfq.rfqId,
      tenderId: row.rfq.tenderId || row.rfq.requisitionRequests?.[0]?.tenderId || "",
      tenderNumber: row.rfq.tenderNumber || row.rfq.requisitionRequests?.[0]?.tenderNumber || "",
      tenderTitle: row.rfq.tenderTitle || row.rfq.requisitionRequests?.[0]?.tenderTitle || "",
      rfqName: rfqDisplayName(row.rfq),
      rfqContext: rfqContext(row.rfq),
      quotationId: row.quotation.quotationId,
      quotationItemId: row.item.bidItemId,
      vendorId: row.quotation.vendorId,
      vendorName: row.quotation.vendorName || "Vendor not recorded",
      quantity: row.item.quantity,
      quotedUnitPrice: row.item.quotedUnitPrice,
      quotedTotalPrice: row.item.quotedTotalPrice,
      submittedAt: row.quotation.submittedAt,
      status: row.item.technicalStatus || row.quotation.status || "APPROVED",
      bidderDetails: sortedVendorRows.map((bidRow, index) => ({
        bidderNo: String(index + 1).padStart(2, "0"),
        vendorId: bidRow.quotation.vendorId,
        vendorName: bidRow.quotation.vendorName || "Vendor not recorded",
        quotationId: bidRow.quotation.quotationId,
        quotationItemId: bidRow.item.bidItemId,
        quantity: bidRow.item.quantity,
        quotedUnitPrice: bidRow.item.quotedUnitPrice,
        quotedTotalPrice: bidRow.item.quotedTotalPrice,
        submittedAt: bidRow.quotation.submittedAt,
        technicalStatus: bidRow.item.technicalStatus || bidRow.quotation.status || "APPROVED",
        conformity: bidRow.item.conformity || bidRow.item.technicalConformity || "",
        bidderResponse: bidRow.item.bidderResponse || bidRow.item.vendorSpecification || bidRow.item.offeredSpecification || "",
        requiredSpecification: bidRow.item.requiredSpecification || "",
        specificationDescription: bidRow.item.specificationDescription || bidRow.item.requisitionItemName || "",
        comment: bidRow.item.becComment || bidRow.item.evaluationComment || "",
      })),
    };
    setFinalList((current) => {
      const next = [entry, ...current.filter((item) => item.selectionKey !== selectionKey)];
      writeFinalList(next);
      return next;
    });
    const successMessage = `${entry.vendorName} added to the final list for ${entry.category}.`;
    setMessage(successMessage);
    toast.success(successMessage, { autoClose: 4500 });
    window.setTimeout(() => setAddingFinalListKey(""), 200);
  };

  const buildApprovalContent = ({ rfq, quotation, item }) => `Offer Letter

RFQ: ${rfqDisplayName(rfq)}
Vendor: ${quotation.vendorName || "Vendor"}
Requisition Item: ${itemNameFor(item)}
Quantity: ${item.quantity || "Not recorded"}
Unit Price: ${formatMoney(item.quotedUnitPrice)}
Total Offer Amount: ${formatMoney(item.quotedTotalPrice)}

University Specification:
${item.requiredSpecification || "No specification recorded."}

BEC Comment:
Lowest quoted technically approved vendor sent to approval.`;

  const sendToApproval = async (row) => {
    const quotationItemId = row?.item?.bidItemId;
    if (!quotationItemId) {
      const errorMessage = "Quotation item ID is missing.";
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }
    setError("");
    setMessage("");
    setSubmittingItemId(String(quotationItemId));
    try {
      await procurementApi.quotations.selectItemVendor(token, quotationItemId, {
        selected: true,
        comment: "Lowest quoted technically approved vendor sent to approval by BEC",
        offerLetterContent: buildApprovalContent(row),
      });
      setSentApprovalItemIds((current) => new Set(current).add(String(quotationItemId)));
      setMessage("Lowest vendor quotation sent to approval.");
      toast.success("Lowest vendor quotation sent to approval.");
      await load();
    } catch (sendError) {
      const errorMessage = sendError.message || "Could not send this vendor quotation to approval.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmittingItemId("");
    }
  };

  const updateDocumentRequest = (quotationId, field, value) => {
    setDocumentRequests((current) => ({
      ...current,
      [quotationId]: {
        requestedDocumentName: "",
        note: "",
        ...(current[quotationId] || {}),
        [field]: value,
      },
    }));
  };

  const requestDocument = async (row) => {
    const quotationId = row?.quotation?.quotationId;
    const form = documentRequests[quotationId] || {};
    if (!quotationId) {
      const errorMessage = "Quotation ID is missing.";
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }
    if (!form.requestedDocumentName?.trim()) {
      const errorMessage = "Enter the document name BEC needs from the vendor.";
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    setError("");
    setMessage("");
    setSubmittingDocumentId(String(quotationId));
    try {
      await procurementApi.quotations.requestDocument(token, quotationId, {
        requestedDocumentName: form.requestedDocumentName.trim(),
        note: form.note?.trim() || "",
      });
      setMessage("Document request sent to vendor.");
      toast.success("Document request sent to vendor.");
      setDocumentRequests((current) => ({ ...current, [quotationId]: { requestedDocumentName: "", note: "" } }));
      await load();
    } catch (requestError) {
      const errorMessage = requestError.message || "Could not request this document from the vendor.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmittingDocumentId("");
    }
  };

  const acceptDocument = async (row) => {
    const quotationId = row?.quotation?.quotationId;
    if (!quotationId) {
      const errorMessage = "Quotation ID is missing.";
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    setError("");
    setMessage("");
    setSubmittingDocumentId(String(quotationId));
    try {
      await procurementApi.quotations.acceptDocument(token, quotationId);
      setMessage("Vendor document accepted.");
      toast.success("Vendor document accepted.");
      await load();
    } catch (acceptError) {
      const errorMessage = acceptError.message || "Could not accept this document.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmittingDocumentId("");
    }
  };

  if (!isBecUser) {
    return (
      <section className={cardClass}>
        <h1 className="text-2xl font-black text-[#10283f]">BEC Access Required</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">This vendor review list is available only for BEC Head users.</p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="BEC"
        title="Vendor Review"
        description="Review vendor quotations approved from the BEC specification check, with vendor details and submitted prices."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Approved Items</div>
          <div className="mt-2 text-3xl font-black">{rows.length}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {message && <div className="rounded-[24px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}

      <section className={cardClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Final Vendor List</div>
            <h2 className="mt-2 text-2xl font-black text-[#10283f]">Category-wise lowest vendor list</h2>
            <div className="mt-2 text-sm leading-7 text-slate-600">
              {finalListSummary.count} selected vendor{finalListSummary.count === 1 ? "" : "s"} across {finalListSummary.categories} categor{finalListSummary.categories === 1 ? "y" : "ies"} | Total {formatMoney(finalListSummary.totalValue)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(becHeadPath("vendor-final-list"))}
            className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-black text-white hover:bg-[#145f79]"
          >
            View Final List
          </button>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Approved Vendor Quotations</div>
            <h2 className="mt-2 text-2xl font-black text-[#10283f]">Vendor review list</h2>
            <div className="mt-2 text-sm leading-7 text-slate-600">
              {totals.vendors} vendor{totals.vendors === 1 ? "" : "s"} | Total approved value {formatMoney(totals.totalValue)}
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]"
          >
            <RefreshRoundedIcon fontSize="small" />
            Refresh
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {loading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading approved vendor quotations...</div>}
          {!loading && rows.length === 0 && (
            <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">
              No approved vendor quotations yet. Approved items from Quotation Review will appear here.
            </div>
          )}

          {!loading && rows.length > 0 && (
            <>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Categories</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {categories.map((category) => (
                    <button
                      key={category.name}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.name);
                        setSelectedItemKey("");
                      }}
                      className={`rounded-2xl border px-3 py-2.5 text-left transition ${selectedCategory === category.name ? selectedButtonClass : idleButtonClass}`}
                    >
                      <div className="text-sm font-black leading-5">{category.name}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-600">
                        {category.itemKeys.size} item{category.itemKeys.size === 1 ? "" : "s"} | {category.vendors.size} vendor{category.vendors.size === 1 ? "" : "s"}
                      </div>
                      <div className="mt-1 text-xs font-bold text-[#166e8c]">{formatMoney(category.totalValue)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedCategory && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Items</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSelectedItemKey(item.key)}
                        className={`rounded-2xl border px-3 py-2.5 text-left transition ${selectedItemKey === item.key ? selectedButtonClass : idleButtonClass}`}
                      >
                        <div className="text-sm font-black leading-5">{item.name}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-600">
                          {item.vendors.size} vendor{item.vendors.size === 1 ? "" : "s"} quoted
                        </div>
                        <div className="mt-1 text-xs font-bold text-[#166e8c]">{formatMoney(item.totalValue)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedCategory && !selectedItemKey && (
                <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">
                  Select an item to view the vendors who bid for it and their quoted prices.
                </div>
              )}

              {selectedItemKey && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Vendor Bids</div>
                  <div className="mt-3 overflow-hidden rounded-[24px] border border-[#dce8ef]">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-[#dce8ef] text-left text-sm">
                        <thead className="bg-[#edf7fb] text-xs font-black uppercase tracking-[0.14em] text-[#166e8c]">
                          <tr>
                            <th className="px-4 py-3">Vendor</th>
                            <th className="px-4 py-3">RFQ</th>
                            <th className="px-4 py-3">Item Category</th>
                            <th className="px-4 py-3 text-right">Quantity</th>
                            <th className="px-4 py-3 text-right">Unit Price</th>
                            <th className="px-4 py-3 text-right">Total Price</th>
                            <th className="px-4 py-3">Submitted</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e8f0f5] bg-white">
                          {sortedVendorRows.map((row) => {
                            const { rfq, quotation, item } = row;
                            const rowKey = `${quotation.quotationId}-${item.bidItemId || item.requisitionItemId}`;
                            const isLowest = rowKey === lowestBidRowKey;
                            const isAdding = addingFinalListKey === finalSelectionKeyFor(row);
                            const isAddedToFinalList = finalList.some((entry) => entry.selectionKey === finalSelectionKeyFor(row) && String(entry.quotationItemId) === String(item.bidItemId));
                            return (
                              <tr key={rowKey} className={isLowest ? "bg-emerald-50/90 ring-1 ring-inset ring-emerald-200" : "bg-white"}>
                                <td className="px-4 py-4 align-top">
                                  <div className="font-black text-[#10283f]">{quotation.vendorName || "Vendor not recorded"}</div>
                                  <div className="mt-1 text-xs font-semibold text-slate-500">Vendor ID {quotation.vendorId || "N/A"}</div>
                                  {isLowest && <div className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">Lowest price</div>}
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <div className="font-bold text-[#10283f]">{rfqDisplayName(rfq)}</div>
                                  <div className="mt-1 text-xs text-slate-500">{rfqContext(rfq) || "Approved quotation"}</div>
                                </td>
                                <td className="px-4 py-4 align-top font-semibold text-slate-700">{item.itemCategory || quotation.rfqVendorCategory || quotation.vendorCategories || "Not recorded"}</td>
                                <td className="px-4 py-4 text-right align-top font-semibold text-slate-700">{item.quantity ?? "N/A"}</td>
                                <td className="px-4 py-4 text-right align-top font-bold text-[#10283f]">{formatMoney(item.quotedUnitPrice)}</td>
                                <td className="px-4 py-4 text-right align-top text-base font-black text-[#10283f]">{formatMoney(item.quotedTotalPrice)}</td>
                                <td className="px-4 py-4 align-top text-slate-600">{formatDateTime(quotation.submittedAt)}</td>
                                <td className="px-4 py-4 align-top"><StatusPill status={item.technicalStatus || quotation.status || "APPROVED"} /></td>
                                <td className="px-4 py-4 text-right align-top">
                                  {isLowest ? (
                                    <button
                                      type="button"
                                      onClick={() => addToFinalList(row)}
                                      disabled={isAdding || isAddedToFinalList}
                                      className="rounded-2xl bg-[#166e8c] px-4 py-2 text-xs font-black text-white hover:bg-[#145f79] disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                      {isAdding ? "Adding..." : isAddedToFinalList ? "Added" : "Add to list"}
                                    </button>
                                  ) : (
                                    <span className="text-xs font-semibold text-slate-400">Only lowest price</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
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
