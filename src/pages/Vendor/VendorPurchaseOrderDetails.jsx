import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { vendorApi } from "../../api/vendorApi";
import { formatDateTime, formatMoney } from "../../services/apiClient";

const cardClass = "rounded-[26px] border border-[#dce8ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";

function parseSpecificationRows(requiredText = "", vendorText = "") {
  const vendorRows = String(vendorText || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const clean = line.replace(/^\d+\.\s*/, "");
    const [description = "", rest = ""] = clean.split(/\s+-\s+Required:\s*/);
    const [required = "", conformityRest = ""] = rest.split(/\s+\|\s+Conformity:\s*/);
    const [conformity = "", response = ""] = conformityRest.split(/\s+\|\s+Bidder Response:\s*/);
    return { description, required, conformity, response };
  });
  if (vendorRows.length && vendorRows.some((row) => row.required || row.response)) return vendorRows;
  return [{ description: "Specification", required: requiredText || "Not provided", conformity: "Not recorded", response: vendorText || "Not provided" }];
}

export default function VendorPurchaseOrderDetails() {
  const { poId } = useParams();
  const navigate = useNavigate();
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await vendorApi.purchaseOrders.list();
      setPurchaseOrders(Array.isArray(result) ? result : result?.content || []);
    } catch (loadError) {
      setError(loadError.message || "Could not load purchase orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  const selectPurchaseOrder = useCallback(async (selectedPoId, shouldScroll = true) => {
    setError("");
    try {
      const detail = await vendorApi.purchaseOrders.detail(selectedPoId);
      setPurchaseOrder(detail);
      if (String(poId || "") !== String(selectedPoId)) navigate(`/vendor/purchase-orders/${selectedPoId}`, { replace: false });
      if (shouldScroll) requestAnimationFrame(() => document.getElementById("purchase-order-details")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (loadError) {
      setError(loadError.message || "Could not load purchase order details.");
    }
  }, [navigate, poId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (poId) selectPurchaseOrder(poId, true);
  }, [poId]);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Vendor"
        title="Received Purchase Orders"
        description="View every purchase order issued to your vendor account and select one to inspect its approved quotation details."
      />

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {loading && <section className={cardClass}>Loading purchase orders...</section>}

      {!loading && <section className={cardClass}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Purchase Order Inbox</div><h2 className="mt-1 text-xl font-black text-[#10283f]">All received purchase orders</h2></div>
          <span className="rounded-full bg-[#edf7fb] px-3 py-1 text-xs font-bold text-[#166e8c]">{purchaseOrders.length} received</span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-[#dce8ef]">
          <table className="w-full min-w-[850px] table-fixed border-collapse text-sm">
            <thead className="bg-[#edf7fb] text-left text-[11px] font-black uppercase tracking-[0.14em] text-[#166e8c]"><tr><th className="w-[18%] px-4 py-3">PO Number</th><th className="w-[24%] px-4 py-3">Item / RR</th><th className="w-[18%] px-4 py-3">Amount</th><th className="w-[16%] px-4 py-3">Status</th><th className="w-[24%] px-4 py-3 text-right">Issued Date / Time</th></tr></thead>
            <tbody>
              {purchaseOrders.map((order) => <tr key={order.poId} onClick={() => selectPurchaseOrder(order.poId)} className={`cursor-pointer border-t border-[#e5eef3] transition ${String(purchaseOrder?.poId) === String(order.poId) ? "bg-[#e7f5fb]" : "bg-white hover:bg-[#f5fbfe]"}`}><td className="px-4 py-3 font-black text-[#10283f]">{order.poNumber || `PO ${order.poId}`}</td><td className="truncate px-4 py-3 text-slate-600">{order.requisitionItemName || order.rrNumber || "Purchase order"}</td><td className="px-4 py-3 font-bold text-[#10283f]">{formatMoney(order.totalAmount || order.quotedTotalPrice)}</td><td className="px-4 py-3"><StatusPill status={order.status || "ISSUED"} /></td><td className="whitespace-nowrap px-4 py-3 text-right text-slate-600">{formatDateTime(order.createdAt)}</td></tr>)}
              {!purchaseOrders.length && <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No purchase orders received yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}

      {!loading && purchaseOrder && (
        <section id="purchase-order-details" className={`${cardClass} scroll-mt-28`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">{purchaseOrder.poNumber || `PO ${purchaseOrder.poId}`}</div>
              <h2 className="mt-2 text-2xl font-black text-[#10283f]">{purchaseOrder.vendorName || "Purchase order"}</h2>
              <div className="mt-2 text-sm leading-7 text-slate-600">Issued at {formatDateTime(purchaseOrder.createdAt)}</div>
            </div>
            <StatusPill status={purchaseOrder.status || "ISSUED"} />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailTile label="PO Number" value={purchaseOrder.poNumber} />
            <DetailTile label="Total Amount" value={formatMoney(purchaseOrder.totalAmount)} />
            <DetailTile label="PO Date" value={purchaseOrder.poDate || "Not recorded"} />
            <DetailTile label="Delivery Deadline" value={purchaseOrder.deliveryDeadline || "Not set"} />
            <DetailTile label="RFQ / Reference" value={purchaseOrder.offerLetterId ? `Selected quotation ${purchaseOrder.offerLetterId}` : purchaseOrder.quotationId || purchaseOrder.bidId || "Not recorded"} />
            <DetailTile label="RR Number" value={purchaseOrder.rrNumber || "Not recorded"} />
            <DetailTile label="Issued By" value={purchaseOrder.issuedByName || "BEC"} />
            <DetailTile label="Vendor ID" value={purchaseOrder.vendorId || "Not recorded"} />
          </div>

          <div className="mt-7">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Submitted Quotation</div>
            <div className="mt-3 overflow-hidden rounded-[24px] border border-[#dce8ef]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#dce8ef] text-left text-sm">
                  <thead className="bg-[#edf7fb] text-xs font-black uppercase tracking-[0.14em] text-[#166e8c]">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Quantity</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8f0f5] bg-white">
                    <tr>
                      <td className="px-4 py-4 font-bold text-[#10283f]">{purchaseOrder.requisitionItemName || "Selected item"}</td>
                      <td className="px-4 py-4 text-slate-700">{purchaseOrder.itemCategory || "Not recorded"}</td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-700">{purchaseOrder.quantity ?? "N/A"}</td>
                      <td className="px-4 py-4 text-right font-bold text-[#10283f]">{formatMoney(purchaseOrder.quotedUnitPrice)}</td>
                      <td className="px-4 py-4 text-right text-base font-black text-[#10283f]">{formatMoney(purchaseOrder.quotedTotalPrice || purchaseOrder.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <SpecificationComparison purchaseOrder={purchaseOrder} />

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <DetailTile label="BEC Technical Comment" value={purchaseOrder.technicalComment || "Approved"} />
            <DetailTile label="Quotation Item ID" value={purchaseOrder.quotationItemId || "Not recorded"} />
          </div>
        </section>
      )}
    </div>
  );
}

function SpecificationComparison({ purchaseOrder }) {
  const rows = parseSpecificationRows(purchaseOrder.requiredSpecification, purchaseOrder.vendorSpecification);
  return (
    <div className="mt-7 rounded-[24px] border border-[#e0ebf1] bg-[#fbfdff] p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">Specification Comparison</div>
      <p className="mt-1 text-xs text-slate-500">The first two columns show the University / RR Specification. The remaining columns show the Vendor Specification.</p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-[#c8dce7] bg-white"><table className="w-full min-w-[800px] table-fixed border-collapse text-sm"><thead className="bg-[#edf7fb] text-[#10283f]"><tr><th className="w-[24%] border border-[#c8dce7] px-3 py-2 text-left">Description</th><th className="w-[34%] border border-[#c8dce7] px-3 py-2 text-left">University / RR Specification</th><th className="w-[14%] border border-[#c8dce7] px-3 py-2 text-center">Conformity</th><th className="w-[28%] border border-[#c8dce7] px-3 py-2 text-left">Vendor Specification</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index}><td className="break-words border border-[#c8dce7] px-3 py-2 align-top">{row.description || "Specification"}</td><td className="break-words border border-[#c8dce7] px-3 py-2 align-top">{row.required || purchaseOrder.requiredSpecification || "Not provided"}</td><td className="break-words border border-[#c8dce7] px-3 py-2 text-center align-top font-bold">{row.conformity || "Not recorded"}</td><td className="break-words border border-[#c8dce7] px-3 py-2 align-top">{row.response || purchaseOrder.vendorSpecification || "Not provided"}</td></tr>)}</tbody></table></div>
      <div className="mt-3 flex flex-wrap gap-3">{purchaseOrder.requiredSpecificationDocumentUrl && <a href={purchaseOrder.requiredSpecificationDocumentUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-[#edf7fb] px-3 py-2 text-xs font-bold text-[#166e8c]">View University Document</a>}{purchaseOrder.specificationDocumentUrl && <a href={purchaseOrder.specificationDocumentUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-[#edf7fb] px-3 py-2 text-xs font-bold text-[#166e8c]">View Vendor Document</a>}</div>
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
