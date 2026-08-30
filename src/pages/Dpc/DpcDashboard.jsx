import { useEffect, useMemo, useState } from "react";
import StoreRoundedIcon from "@mui/icons-material/StoreRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import { useNavigate } from "react-router-dom";
import PageHero from "../../components/PageHero";
import { useAuth } from "../../contexts/AuthContext";
import { dpcApi } from "../../api/dpcApi";

export default function DpcDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    dpcApi.vendors.list(token)
      .then((list) => setVendors(Array.isArray(list) ? list : []))
      .catch((err) => setError(err.message || "Could not load DPC overview."))
      .finally(() => setLoading(false));
  }, [token]);

  const counts = useMemo(() => vendors.reduce((acc, vendor) => {
    const key = vendor.vendorStatus || "PENDING";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}), [vendors]);

  const cards = [
    { label: "All Vendors", value: vendors.length, icon: StoreRoundedIcon, path: "/dpc/vendors" },
    { label: "Pending", value: counts.PENDING || 0, icon: PendingActionsRoundedIcon, path: "/dpc/vendors?status=PENDING" },
    { label: "Approved", value: counts.APPROVED || 0, icon: CheckCircleRoundedIcon, path: "/dpc/vendors?status=APPROVED" },
    { label: "Black Listed", value: counts.BLACK_LISTED || 0, icon: BlockRoundedIcon, path: "/dpc/vendors/blacklist" },
  ];

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="DPC Overview"
        title="Vendor registration control"
        description="Review supplier registrations, inspect uploaded documents, approve qualified vendors, and maintain black list decisions."
      />

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button key={card.label} type="button" onClick={() => navigate(card.path)} className="rounded-[26px] border border-[#dce8ef] bg-white p-5 text-left shadow-[0_18px_45px_rgba(15,41,64,0.06)] transition hover:border-[#166e8c]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-500">{card.label}</div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf7fb] text-[#166e8c]">
                  <Icon fontSize="small" />
                </span>
              </div>
              <div className="mt-4 text-3xl font-black text-[#10283f]">{loading ? "..." : card.value}</div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
