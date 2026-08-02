import { useCallback, useEffect, useMemo, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateTime, formatMoney } from "../../services/apiClient";
import { rfqDisplayName, rfqContext } from "../../utils/procurementDisplay";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";
const selectedButtonClass = "border-[#166e8c] bg-[#e9f7fb] text-[#10283f] shadow-[0_14px_30px_rgba(22,110,140,0.12)]";
const idleButtonClass = "border-[#dce8ef] bg-white text-[#10283f] hover:border-[#9bcddd] hover:bg-[#f8fcff]";

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
  const [rows, setRows] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedItemKey, setSelectedItemKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingItemId, setSubmittingItemId] = useState("");
  const [sentApprovalItemIds, setSentApprovalItemIds] = useState(() => new Set());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isBecUser = user?.mainRole === "FINANCE" && user?.subRole === "BEC";

  const load = useCallback(async () => {
    if (!token || !isBecUser) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const rfqData = await procurementApi.rfqs.publishedForBec(token);
      const rfqs = getArray(rfqData);
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
      setError("Quotation item ID is missing.");
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
      await load();
    } catch (sendError) {
      setError(sendError.message || "Could not send this vendor quotation to approval.");
    } finally {
      setSubmittingItemId("");
    }
  };

  if (!isBecUser) {
    return (
      <section className={cardClass}>
        <h1 className="text-2xl font-black text-[#10283f]">BEC Access Required</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">This vendor review list is available only for BEC users.</p>
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
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {categories.map((category) => (
                    <button
                      key={category.name}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.name);
                        setSelectedItemKey("");
                      }}
                      className={`rounded-[22px] border p-4 text-left transition ${selectedCategory === category.name ? selectedButtonClass : idleButtonClass}`}
                    >
                      <div className="text-base font-black">{category.name}</div>
                      <div className="mt-2 text-sm font-semibold text-slate-600">
                        {category.itemKeys.size} item{category.itemKeys.size === 1 ? "" : "s"} | {category.vendors.size} vendor{category.vendors.size === 1 ? "" : "s"}
                      </div>
                      <div className="mt-1 text-sm font-bold text-[#166e8c]">{formatMoney(category.totalValue)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedCategory && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Items</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSelectedItemKey(item.key)}
                        className={`rounded-[22px] border p-4 text-left transition ${selectedItemKey === item.key ? selectedButtonClass : idleButtonClass}`}
                      >
                        <div className="text-base font-black">{item.name}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-600">
                          {item.vendors.size} vendor{item.vendors.size === 1 ? "" : "s"} quoted
                        </div>
                        <div className="mt-1 text-sm font-bold text-[#166e8c]">{formatMoney(item.totalValue)}</div>
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
                            const isSubmitting = submittingItemId === String(item.bidItemId);
                            const isSent = item.vendorSelected || sentApprovalItemIds.has(String(item.bidItemId));
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
                                      onClick={() => sendToApproval(row)}
                                      disabled={isSubmitting || isSent}
                                      className="rounded-2xl bg-[#166e8c] px-4 py-2 text-xs font-black text-white hover:bg-[#145f79] disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                      {isSent ? "Sent" : isSubmitting ? "Sending..." : "Send to Approval"}
                                    </button>
                                  ) : (
                                    <span className="text-xs font-semibold text-slate-400">-</span>
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
