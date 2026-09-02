import { useEffect, useMemo, useState } from "react";
import StoreRoundedIcon from "@mui/icons-material/StoreRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import { useNavigate } from "react-router-dom";
import PageHero from "../../components/PageHero";
import { useAuth } from "../../contexts/AuthContext";
import { dpcApi } from "../../api/dpcApi";
import { toast } from "react-toastify";

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
      .then((list) => setVendors(Array.isArray(list) ? list : Array.isArray(list?.content) ? list.content : []))
      .catch((err) => {
        const errorMessage = err.message || "Could not load DPC overview.";
        setError(errorMessage);
        toast.error(errorMessage, { toastId: "dpc-dashboard-load-error", autoClose: 5000 });
      })
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

  const recentVendors = useMemo(() => [...vendors]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    .slice(0, 5), [vendors]);

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

      <section className="overflow-hidden rounded-[26px] border border-[#dce8ef] bg-white shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <div className="flex flex-col gap-3 border-b border-[#e5eef3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Recent activity</div>
            <h2 className="mt-1 text-xl font-black text-[#10283f]">Latest vendor registrations</h2>
          </div>
          <button type="button" onClick={() => navigate("/dpc/vendors")} className="w-fit rounded-xl bg-[#edf7fb] px-4 py-2 text-sm font-black text-[#166e8c] hover:bg-[#d9edf5]">View all</button>
        </div>
        <div className="divide-y divide-[#e8f0f5]">
          {!loading && recentVendors.map((vendor) => (
            <button key={vendor.userId || vendor.vendorId} type="button" onClick={() => navigate("/dpc/vendors")} className="grid w-full gap-2 px-5 py-3 text-left text-sm hover:bg-[#f7fbfd] sm:grid-cols-[1.2fr_1fr_0.8fr] sm:items-center">
              <span className="font-black text-[#10283f]">{vendor.vendorName || vendor.username || vendor.email || "Vendor"}</span>
              <span className="text-slate-600">{vendor.vendorCategory || "Category not recorded"}</span>
              <span className="font-bold text-[#166e8c] sm:text-right">{String(vendor.vendorStatus || "PENDING").replaceAll("_", " ")}</span>
            </button>
          ))}
          {loading && <div className="px-5 py-5 text-sm text-slate-500">Loading recent registrations...</div>}
          {!loading && recentVendors.length === 0 && <div className="px-5 py-5 text-sm text-slate-500">No vendor registrations available.</div>}
        </div>
      </section>
    </div>
  );
}
