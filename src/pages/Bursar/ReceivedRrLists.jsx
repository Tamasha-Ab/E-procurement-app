import { useEffect, useMemo, useState } from "react";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { useNavigate } from "react-router-dom";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney } from "../../services/apiClient";
import { requestDisplayName, requestContext } from "../../utils/procurementDisplay";
import { getSeniorAssistantBursarPath } from "../../utils/roleRoutes";
import { procurementApi } from "../../api/procurementApi";

const categoryLabel = (rr) => {
  if (Array.isArray(rr.vendorCategories) && rr.vendorCategories.length) {
    return rr.vendorCategories.join(", ");
  }
  if (typeof rr.vendorCategories === "string" && rr.vendorCategories.trim()) {
    return rr.vendorCategories;
  }
  return rr.vendorCategory || rr.category || "Uncategorized";
};

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

const rrTitle = (rr) => requestDisplayName(rr);
const createdRfqRrStorageKey = "astraea:finance:rfq-created-rrs";

const getCreatedRfqRrIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(createdRfqRrStorageKey) || "[]").map(String));
  } catch {
    return new Set();
  }
};

export default function ReceivedRrLists() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [rrs, setRrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const receivedData = await apiRequest("/api/tenders/bursar/requisitions/pending", { token });
      const rfqData = await procurementApi.rfqs.listAll(token).catch(() => []);
      const hiddenRrIds = getCreatedRfqRrIds();
      getArray(rfqData).forEach((rfq) => {
        if (rfq.rrId) hiddenRrIds.add(String(rfq.rrId));
        (rfq.requisitionRequests || []).forEach((rr) => rr?.rrId && hiddenRrIds.add(String(rr.rrId)));
      });
      setRrs(getArray(receivedData).filter((rr) => !hiddenRrIds.has(String(rr.rrId))));
    } catch (err) {
      setError(err.message || "Could not load received RR lists.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const groups = useMemo(() => {
    const grouped = new Map();
    rrs.forEach((rr) => {
      const category = categoryLabel(rr);
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category).push(rr);
    });
    return Array.from(grouped.entries()).map(([category, items]) => ({ category, items }));
  }, [rrs]);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Finance Department"
        title="Received RR Lists"
        description="Review category-wise requisition request lists submitted by BEC to the finance department."
      >
        <div className="rounded-xl bg-white/10 px-4 py-2.5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Received</div>
          <div className="mt-0.5 text-xl font-black">{rrs.length}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Submitted RR Details</div>
            <h2 className="mt-2 text-2xl font-black text-[#10283f]">BEC Submitted RR Lists</h2>
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

        <div className="mt-5 space-y-4">
          {loading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading received RR lists...</div>}
          {!loading && groups.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No received RR lists yet.</div>}

          {groups.map((group) => (
            <div key={group.category} className="overflow-hidden rounded-2xl border border-[#dce8ef] bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-[#dce8ef] bg-[#f5fbff] px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#166e8c] shadow-sm">
                    <AssignmentTurnedInRoundedIcon sx={{ fontSize: 17 }} />
                  </span>
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Category</div>
                    <h3 className="text-sm font-black text-[#10283f]">{group.category}</h3>
                  </div>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#166e8c] shadow-sm">
                  {group.items.length} request{group.items.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="overflow-x-auto p-3">
                <div className="grid min-w-[1010px] grid-cols-[minmax(190px,1.1fr)_minmax(200px,1.2fr)_130px_165px_150px_220px] gap-1 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#166e8c]">
                  <span>RR</span><span>Details</span><span>Amount</span><span>Status</span><span>Date / Time</span><span className="text-right">Actions</span>
                </div>
                <div className="space-y-2">
                {group.items.map((rr) => (
                  <div key={rr.rrId} className="grid min-w-[1010px] grid-cols-[minmax(190px,1.1fr)_minmax(200px,1.2fr)_130px_165px_150px_220px] items-center gap-1 rounded-xl border border-[#e1ebf0] px-3 py-2.5 transition hover:bg-[#f8fcff]">
                      <div className="min-w-0"><h4 className="truncate text-sm font-black text-[#10283f]">{rrTitle(rr)}</h4><span className="mt-0.5 block truncate text-[10px] font-semibold text-[#166e8c]">{rr.rrNumber || `RR-${rr.rrId}`}</span></div>
                      <div className="truncate text-xs text-slate-600">{requestContext(rr) || rr.requestingOfficerName || rr.createdByName || "Requester not recorded"}</div>
                      <div className="whitespace-nowrap text-xs font-bold text-[#10283f]">{formatMoney(rr.estimatedTotalAmount || rr.totalEstimatedCost || rr.estimatedTotal || rr.totalAmount)}</div>
                      <div><StatusPill status={rr.status || "SUBMITTED_TO_BURSAR"} /></div>
                      <div className="whitespace-nowrap text-[10px] font-semibold text-slate-500">{formatDateTime(rr.updatedAt || rr.createdAt)}</div>
                      <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`${getSeniorAssistantBursarPath(user, "received-rr", "/finance/category-rr")}/${rr.rrId}`)}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#166e8c] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#145f79]"
                      >
                        <VisibilityRoundedIcon sx={{ fontSize: 15 }} />
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`${getSeniorAssistantBursarPath(user, "rfq-creation", "/bursar/create-rfq")}?rrId=${rr.rrId}&category=${encodeURIComponent(categoryLabel(rr))}`)}
                        className="inline-flex items-center whitespace-nowrap rounded-lg border border-[#166e8c] bg-white px-3 py-2 text-[11px] font-bold text-[#166e8c] hover:bg-[#edf7fb]"
                      >
                        Create RFQ
                      </button>
                      </div>
                  </div>
                ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
