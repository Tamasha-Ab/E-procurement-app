import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useAuth } from "../../contexts/AuthContext";

const formatDateTime = (value) => {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getResponseMessage = (body, fallback) =>
  body?.message || body?.error || fallback || "Request failed";

const formatActionLabel = (action) => {
  if (action === "BUDGET_CHECKED") return "APPROVED";
  return action || "ACTION";
};

export default function BursarAuditTrail() {
  const { token, user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [rrId, setRrId] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const isBursar = user?.mainRole === "FINANCE" && user?.subRole === "BURSAR";

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const requestJson = useCallback(
    async (path) => {
      const response = await fetch(path, { headers: authHeaders });
      const text = await response.text();
      const body = text ? JSON.parse(text) : null;

      if (!response.ok || body?.success === false) {
        throw new Error(getResponseMessage(body, response.statusText));
      }

      return body?.data ?? body;
    },
    [authHeaders]
  );

  const loadAllAuditEntries = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const data = await requestJson("/api/bursar/audit-trail");
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }, [requestJson]);

  useEffect(() => {
    if (isBursar) {
      loadAllAuditEntries();
    }
  }, [isBursar, loadAllAuditEntries]);

  const handleSearchByRequisition = async (event) => {
    event.preventDefault();
    if (!rrId) return;

    setLoading(true);
    setNotice(null);
    try {
      const data = await requestJson(`/api/bursar/audit-trail/requisition/${rrId}`);
      setEntries(Array.isArray(data) ? data : []);
      setNotice({ type: "success", message: `Showing audit trail for RR ID ${rrId}.` });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isBursar) {
    return (
      <section className="rounded-[30px] border border-[#dce8ef] bg-white p-8 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <Typography className="!text-2xl !font-bold !text-[#10283f]">Bursar Access Required</Typography>
        <Typography className="!mt-3 !text-sm !leading-7 !text-slate-600">
          This audit trail is available only for FINANCE users with BURSAR sub-role.
        </Typography>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#0f2940,#166e8c)] p-7 text-white shadow-[0_24px_60px_rgba(15,41,64,0.18)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">Audit Trail</div>
            <h1 className="mt-3 text-3xl font-black md:text-4xl">Approval action history</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-100">
              Review who performed each approval action, when it happened, the status transition, and the related comment.
            </p>
          </div>
          <Button
            variant="contained"
            startIcon={<RefreshRoundedIcon />}
            onClick={loadAllAuditEntries}
            sx={{
              bgcolor: "#f6c453",
              color: "#0f2940",
              borderRadius: "14px",
              textTransform: "none",
              fontWeight: 800,
              "&:hover": { bgcolor: "#efb93c" },
            }}
          >
            Load All
          </Button>
        </div>
      </section>

      {notice && (
        <Alert severity={notice.type} onClose={() => setNotice(null)} sx={{ borderRadius: "16px" }}>
          {notice.message}
        </Alert>
      )}

      <section className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <form className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" onSubmit={handleSearchByRequisition}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Filter</div>
            <h2 className="mt-2 text-2xl font-bold text-[#10283f]">Search by requisition ID</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <TextField
              label="RR ID"
              type="number"
              size="small"
              value={rrId}
              onChange={(event) => setRrId(event.target.value)}
              sx={{ minWidth: 180 }}
            />
            <Button type="submit" variant="contained" startIcon={<SearchRoundedIcon />} sx={primaryButtonSx}>
              Search
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <div className="mb-5">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Records</div>
          <h2 className="mt-2 text-2xl font-bold text-[#10283f]">Approval audit entries</h2>
        </div>

        <div className="space-y-4">
          {entries.length === 0 && !loading && (
            <div className="rounded-[24px] border border-dashed border-[#c8dce7] bg-[#f8fbfd] p-6 text-sm leading-7 text-slate-600">
              No audit records found.
            </div>
          )}

          {entries.map((entry) => (
            <article key={entry.approvalId} className="rounded-[24px] border border-[#e0ebf1] bg-[#fbfdff] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#edf7fb] text-[#166e8c]">
                    <HistoryRoundedIcon fontSize="small" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography className="!text-lg !font-bold !text-[#10283f]">
                        {formatActionLabel(entry.action)}
                      </Typography>
                      <Chip label={entry.actionRole || "ROLE"} size="small" sx={{ bgcolor: "#edf7fb", color: "#166e8c", fontWeight: 700 }} />
                    </div>
                    <Typography className="!mt-2 !text-sm !leading-7 !text-slate-600">
                      RR ID {entry.rrId} - {entry.actionByName || `User ${entry.actionById}`}
                    </Typography>
                  </div>
                </div>
                <div className="text-left lg:text-right">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Timestamp</div>
                  <div className="mt-1 text-sm font-bold text-[#10283f]">{formatDateTime(entry.createdAt)}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">From</div>
                  <div className="mt-2 text-sm font-bold text-[#10283f]">{entry.fromStatus || "Not set"}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">To</div>
                  <div className="mt-2 text-sm font-bold text-[#10283f]">{entry.toStatus || "Not set"}</div>
                </div>
              </div>

              {entry.comment && (
                <div className="mt-4 rounded-2xl bg-[#fff9ec] p-4 text-sm leading-7 text-[#6f4c00]">
                  {entry.comment}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {loading && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 rounded-2xl bg-[#10283f] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,41,64,0.22)]">
          <CircularProgress size={18} sx={{ color: "#fff" }} />
          Loading audit trail
        </div>
      )}
    </div>
  );
}

const primaryButtonSx = {
  bgcolor: "#166e8c",
  borderRadius: "14px",
  textTransform: "none",
  fontWeight: 800,
  "&:hover": { bgcolor: "#145f79" },
};
