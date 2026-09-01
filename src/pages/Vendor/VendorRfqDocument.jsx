import { useEffect, useState } from "react";
import { Button } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import { useNavigate, useParams } from "react-router-dom";
import { vendorApi } from "../../api/vendorApi";
import { rfqDisplayName, rfqContext } from "../../utils/procurementDisplay";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";

export default function VendorRfqDocument() {
  const { rfqId } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    vendorApi.rfqs.detail(rfqId)
      .then((data) => {
        if (!cancelled) setRfq(data);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || "Could not load RFQ document.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rfqId]);

  const rrDetails = (rfq?.description || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":");
      return separatorIndex > -1
        ? {
          label: line.slice(0, separatorIndex).trim(),
          value: line.slice(separatorIndex + 1).trim(),
        }
        : { label: "Detail", value: line };
    });

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#0f2940,#166e8c)] p-7 text-white shadow-[0_28px_70px_rgba(15,41,64,0.22)]">
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate(-1)}
          sx={{ color: "white", textTransform: "none", fontWeight: 800 }}
        >
          Back
        </Button>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">Vendor RFQ Document</div>
            <h1 className="mt-3 text-3xl font-black">{rfq ? rfqDisplayName(rfq) : "RFQ details"}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-100/90">
              Review the requisition details and vendor instructions document before preparing your quotation.
            </p>
          </div>
          <span className="self-start rounded-full bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em]">
            {rfqContext(rfq) || "Vendor invitation"}
          </span>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <section className={cardClass}>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RR Details</div>
          <h2 className="mt-2 text-2xl font-black text-[#10283f]">{rfq ? rfqDisplayName(rfq) : "Related requisition"}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {loading ? (
              <DetailTile label="Status" value="Loading..." />
            ) : rrDetails.length ? (
              rrDetails.map((detail, index) => (
                <DetailTile key={`${detail.label}-${index}`} label={detail.label} value={detail.value} />
              ))
            ) : (
              <DetailTile label="RR Details" value="No RR details provided." />
            )}
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf7fb] text-[#166e8c]">
            <PictureAsPdfRoundedIcon />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">PDF Document</div>
            <div className="text-lg font-black text-[#10283f]">{rfq?.vendorDocumentName || "Vendor instructions"}</div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading PDF...</div>
        ) : rfq?.vendorDocument ? (
          <iframe
            title={rfq.vendorDocumentName || "RFQ vendor instructions PDF"}
            src={rfq.vendorDocument}
            className="h-[720px] w-full rounded-[22px] border border-[#dce8ef]"
          />
        ) : (
          <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No PDF document is attached to this RFQ.</div>
        )}
      </section>
    </div>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-[20px] bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{label}</div>
      <div className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-[#10283f]">{value || "Not available"}</div>
    </div>
  );
}
