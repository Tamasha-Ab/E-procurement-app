import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useAuth } from "../../contexts/AuthContext";

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const initialTenderForm = {
  title: "",
  tenderNumber: "",
  description: "",
  tenderValue: "",
};

const getResponseMessage = (body, fallback) =>
  body?.message || body?.error || fallback || "Request failed";

export default function BursarBudgetWorkspace() {
  const { token, user } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [pendingRrs, setPendingRrs] = useState([]);
  const [finalRrs, setFinalRrs] = useState([]);
  const [rrTenderSelections, setRrTenderSelections] = useState({});
  const [tenderForm, setTenderForm] = useState(initialTenderForm);
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
    async (path, options = {}) => {
      const response = await fetch(path, {
        ...options,
        headers: {
          ...authHeaders,
          ...(options.headers || {}),
        },
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : null;

      if (!response.ok || body?.success === false) {
        throw new Error(getResponseMessage(body, response.statusText));
      }

      return body?.data ?? body;
    },
    [authHeaders]
  );

  const loadTenders = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const data = await requestJson("/api/tenders");
      setTenders(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }, [requestJson]);

  const loadRequisitionQueues = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const [pending, finalList] = await Promise.all([
        requestJson("/api/tenders/bursar/requisitions/pending"),
        requestJson("/api/tenders/bursar/requisitions/final"),
      ]);
      setPendingRrs(Array.isArray(pending) ? pending : []);
      setFinalRrs(Array.isArray(finalList) ? finalList : []);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }, [requestJson]);

  useEffect(() => {
    if (isBursar) {
      loadTenders();
      loadRequisitionQueues();
    }
  }, [isBursar, loadTenders, loadRequisitionQueues]);

  const handleTenderSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      await requestJson("/api/tenders", {
        method: "POST",
        body: JSON.stringify({
          title: tenderForm.title,
          tenderNumber: tenderForm.tenderNumber,
          description: tenderForm.description,
          tenderValue: Number(tenderForm.tenderValue),
        }),
      });
      setNotice({ type: "success", message: "Tender created and notifications sent to internal users." });
      setTenderForm(initialTenderForm);
      await loadTenders();
      await loadRequisitionQueues();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const approveRrBudget = async (rr) => {
    const tenderId = rrTenderSelections[rr.rrId];
    if (!tenderId) {
      setNotice({ type: "error", message: "Please select a tender before approving this RR." });
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      await requestJson(`/api/tenders/bursar/requisitions/${rr.rrId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({
          tenderId: Number(tenderId),
          action: "APPROVE",
          comment: "RR budget approved by Bursar.",
        }),
      });
      setNotice({ type: "success", message: "RR approved and added to the final RR list." });
      await Promise.all([loadTenders(), loadRequisitionQueues()]);
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Insufficient budget." });
    } finally {
      setLoading(false);
    }
  };

  if (!isBursar) {
    return (
      <Box className="rounded-[28px] border border-[#dce8ef] bg-white p-8 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <Typography className="!text-2xl !font-bold !text-[#10283f]">Bursar Access Required</Typography>
        <Typography className="!mt-3 !text-sm !leading-7 !text-slate-600">
          This workspace is available only for users with main role FINANCE and sub-role BURSAR.
        </Typography>
      </Box>
    );
  }

  const totalTenderValue = tenders.reduce((sum, tender) => sum + Number(tender.tenderValue || 0), 0);
  const totalAllocatedValue = tenders.reduce((sum, tender) => sum + Number(tender.allocatedValue || 0), 0);

  return (
    <div className="space-y-7">
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#0f2940,#166e8c)] p-7 text-white shadow-[0_24px_60px_rgba(15,41,64,0.18)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">Bursar Workspace</div>
            <h1 className="mt-3 text-3xl font-black md:text-4xl">Tender creation</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-100">
              Create tender value pools and notify staff members, division heads, and TEC officers as soon as the tender is saved.
            </p>
          </div>
          <Button
            variant="contained"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => {
              loadTenders();
              loadRequisitionQueues();
            }}
            sx={{
              bgcolor: "#f6c453",
              color: "#0f2940",
              borderRadius: "14px",
              textTransform: "none",
              fontWeight: 800,
              "&:hover": { bgcolor: "#efb93c" },
            }}
          >
            Refresh
          </Button>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-4">
          <SummaryCard icon={AccountBalanceWalletRoundedIcon} label="Tender Value Total" value={formatCurrency(totalTenderValue)} />
          <SummaryCard icon={AssignmentTurnedInRoundedIcon} label="TEC Approved RRs" value={pendingRrs.length} />
          <SummaryCard icon={CheckCircleRoundedIcon} label="Final RRs" value={finalRrs.length} />
          <SummaryCard icon={AccountBalanceWalletRoundedIcon} label="Allocated Value" value={formatCurrency(totalAllocatedValue)} />
        </div>
      </section>

      {notice && (
        <Alert severity={notice.type} onClose={() => setNotice(null)} sx={{ borderRadius: "16px" }}>
          {notice.message}
        </Alert>
      )}

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.2fr]">
        <Panel title="Create Tender" eyebrow="Tender Details">
          <Box component="form" className="space-y-4" onSubmit={handleTenderSubmit}>
            <TextField label="Tender title" value={tenderForm.title} onChange={(event) => setTenderForm((prev) => ({ ...prev, title: event.target.value }))} fullWidth required />
            <TextField label="Tender ID" value={tenderForm.tenderNumber} onChange={(event) => setTenderForm((prev) => ({ ...prev, tenderNumber: event.target.value }))} fullWidth required />
            <TextField label="Tender value" type="number" value={tenderForm.tenderValue} onChange={(event) => setTenderForm((prev) => ({ ...prev, tenderValue: event.target.value }))} fullWidth required />
            <TextField label="Description" value={tenderForm.description} onChange={(event) => setTenderForm((prev) => ({ ...prev, description: event.target.value }))} fullWidth multiline minRows={3} />
            <Button type="submit" variant="contained" disabled={loading} fullWidth sx={primaryButtonSx}>
              Create Tender
            </Button>
          </Box>
        </Panel>

        <Panel title="TEC Approved RR List" eyebrow="Bursar Approval">
          <div className="space-y-4">
            {pendingRrs.length === 0 && <EmptyState text="No TEC-approved RRs are waiting for Bursar approval." />}
            {pendingRrs.map((rr) => {
              const selectedTender = tenders.find((tender) => String(tender.tenderId) === String(rrTenderSelections[rr.rrId]));
              const rrValue = Number(rr.estimatedTotalAmount || 0);
              const tenderValue = Number(selectedTender?.tenderValue || 0);
              const allocatedValue = Number(selectedTender?.allocatedValue || 0);
              const availableAfter = tenderValue - allocatedValue - rrValue;
              const hasEnoughBudget = Boolean(selectedTender) && availableAfter >= 0;

              return (
              <div key={rr.rrId} className="rounded-[24px] border border-[#e0ebf1] bg-[#fbfdff] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <Typography className="!text-lg !font-bold !text-[#10283f]">{rr.title}</Typography>
                    <Typography className="!mt-2 !text-sm !leading-7 !text-slate-600">
                      {rr.rrNumber} - {rr.facultyName || "Faculty not set"} - {rr.divisionName || "Division not set"}
                    </Typography>
                    <Typography className="!mt-1 !text-sm !leading-7 !text-slate-600">
                      RR estimated value {formatCurrency(rr.estimatedTotalAmount)}
                    </Typography>
                  </div>
                  <Chip label={rr.status} size="small" sx={{ bgcolor: "#edf7fb", color: "#166e8c", fontWeight: 700 }} />
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                  <TextField
                    select
                    SelectProps={{ native: true }}
                    label="Tender"
                    value={rrTenderSelections[rr.rrId] || ""}
                    onChange={(event) => setRrTenderSelections((prev) => ({ ...prev, [rr.rrId]: event.target.value }))}
                    fullWidth
                  >
                    <option value="">Select tender</option>
                    {tenders.map((tender) => (
                      <option key={tender.tenderId} value={tender.tenderId}>
                        {tender.tenderNumber} - {tender.title} - Available {formatCurrency(Number(tender.tenderValue || 0) - Number(tender.allocatedValue || 0))}
                      </option>
                    ))}
                  </TextField>
                  <Button variant="contained" startIcon={<CheckCircleRoundedIcon />} onClick={() => approveRrBudget(rr)} disabled={loading || !selectedTender} sx={primaryButtonSx}>
                    Approve RR
                  </Button>
                </div>

                {selectedTender && (
                  <div className={`mt-4 rounded-2xl p-4 text-sm font-semibold ${hasEnoughBudget ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    Available balance = {formatCurrency(tenderValue)} - {formatCurrency(allocatedValue)} - {formatCurrency(rrValue)} = {formatCurrency(availableAfter)}
                    {!hasEnoughBudget ? " | Insufficient budget" : ""}
                  </div>
                )}
              </div>
            )})}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="Tender Value Pools" eyebrow="Tender Balances">
          <div className="space-y-4">
            {tenders.length === 0 && <EmptyState text="No tenders have been created yet." />}
            {tenders.map((tender) => (
              <div key={tender.tenderId} className="rounded-[24px] border border-[#e0ebf1] bg-[#fbfdff] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <Typography className="!text-lg !font-bold !text-[#10283f]">{tender.title}</Typography>
                    <Typography className="!mt-2 !text-sm !leading-7 !text-slate-600">{tender.tenderNumber}</Typography>
                    <Typography className="!mt-1 !text-sm !leading-7 !text-slate-600">
                      Tender value {formatCurrency(tender.tenderValue)} - Allocated {formatCurrency(tender.allocatedValue)} - Available {formatCurrency(Number(tender.tenderValue || 0) - Number(tender.allocatedValue || 0))}
                    </Typography>
                  </div>
                  <Chip label={tender.status} size="small" sx={{ bgcolor: "#edf7fb", color: "#166e8c", fontWeight: 700 }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Final RR List" eyebrow="Approved by Bursar">
          <div className="space-y-4">
            {finalRrs.length === 0 && <EmptyState text="No RRs have been approved by Bursar yet." />}
            {finalRrs.map((rr) => (
              <div key={rr.rrId} className="rounded-[24px] border border-[#e0ebf1] bg-[#fbfdff] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <Typography className="!text-lg !font-bold !text-[#10283f]">{rr.title}</Typography>
                    <Typography className="!mt-2 !text-sm !leading-7 !text-slate-600">
                      {rr.rrNumber} - {rr.facultyName || "Faculty not set"} - {formatCurrency(rr.estimatedTotalAmount)}
                    </Typography>
                  </div>
                  <Chip label={rr.status} size="small" sx={{ bgcolor: "#eaf7f4", color: "#14745f", fontWeight: 700 }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {loading && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 rounded-2xl bg-[#10283f] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,41,64,0.22)]">
          <CircularProgress size={18} sx={{ color: "#fff" }} />
          Working
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
        <Icon />
      </div>
      <div className="mt-4 text-2xl font-black">{value}</div>
      <div className="mt-1 text-sm text-slate-200">{label}</div>
    </div>
  );
}

function Panel({ title, eyebrow, children }) {
  return (
    <section className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">{eyebrow}</div>
        <h2 className="mt-2 text-2xl font-bold text-[#10283f]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#c8dce7] bg-[#f8fbfd] p-6 text-sm leading-7 text-slate-600">
      {text}
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
