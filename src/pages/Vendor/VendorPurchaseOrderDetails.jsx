import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { vendorApi } from "../../api/vendorApi";
import { formatDateTime, formatMoney } from "../../services/apiClient";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";

export default function VendorPurchaseOrderDetails() {
  const { poId } = useParams();
  const navigate = useNavigate();
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPurchaseOrder(await vendorApi.purchaseOrders.detail(poId));
    } catch (loadError) {
      setError(loadError.message || "Could not load purchase order.");
    } finally {
      setLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Vendor"
        title="Purchase Order"
        description="View the purchase order issued for your selected quotation."
      />

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-2xl border border-[#dce8ef] bg-white px-4 py-2 text-sm font-bold text-[#10283f] hover:bg-slate-50"
      >
        <ArrowBackRoundedIcon fontSize="small" />
        Back
      </button>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {loading && <section className={cardClass}>Loading purchase order...</section>}

      {!loading && purchaseOrder && (
        <section className={cardClass}>
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

          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <SpecCard
              title="University / RR Specification"
              text={purchaseOrder.requiredSpecification || "No university specification recorded."}
              documentUrl={purchaseOrder.requiredSpecificationDocumentUrl}
            />
            <SpecCard
              title="Vendor Specification"
              text={purchaseOrder.vendorSpecification || "No vendor specification submitted."}
              documentUrl={purchaseOrder.specificationDocumentUrl}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <DetailTile label="BEC Technical Comment" value={purchaseOrder.technicalComment || "Approved"} />
            <DetailTile label="Quotation Item ID" value={purchaseOrder.quotationItemId || "Not recorded"} />
          </div>
        </section>
      )}
    </div>
  );
}

function SpecCard({ title, text, documentUrl }) {
  return (
    <div className="rounded-[24px] border border-[#e0ebf1] bg-[#fbfdff] p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">{title}</div>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{text}</div>
      {documentUrl && (
        <a href={documentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
          View Document
        </a>
      )}
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
