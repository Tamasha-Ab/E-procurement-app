import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
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
  tenderNumber: "",
  procuringEntityDepartment: "",
  title: "",
  tenderType: "",
  procurementMethod: "",
  tenderValue: "",
  fundingSource: "",
  publicationDate: "",
  closingDateTime: "",
  bidValidityPeriod: "",
};

const tenderFormRows = [
  { key: "tenderNumber", label: "Tender Reference No.", required: true },
  { key: "procuringEntityDepartment", label: "Procuring Entity / Department" },
  { key: "title", label: "Tender Title", required: true },
  { key: "tenderType", label: "Tender Type (Goods / Works / Services / Consultancy / IT Systems)" },
  { key: "procurementMethod", label: "Procurement Method (NCB / National Shopping)", input: "procurementMethod", required: true },
  { key: "tenderValue", label: "Estimated Contract Value (LKR)", type: "number", required: true },
  { key: "fundingSource", label: "Funding Source (GOSL / Project / Vote)", input: "fundingSource" },
  { key: "publicationDate", label: "Date of Publication", type: "date" },
  { key: "closingDateTime", label: "Closing Date & Time", type: "datetime-local" },
  { key: "bidValidityPeriod", label: "Bid Validity Period" },
];

const procurementMethodOptions = ["NCB", "National Shopping"];
const fundingSourceOptions = ["GOSL", "Project", "Vote"];

const toApiDateTime = (value) => (value ? `${value}${value.includes("T") ? "" : "T00:00:00"}` : null);

const formatTenderDate = (value, includeTime = false) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
};

const getTenderFormValue = (tender, key) => {
  if (key === "tenderValue") return tender.tenderValue ? formatCurrency(tender.tenderValue) : "";
  if (key === "publicationDate") return formatTenderDate(tender.publicationDate);
  if (key === "closingDateTime") return formatTenderDate(tender.closingDateTime, true);
  return tender[key] || "";
};

const normalizePdfText = (value) =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7E]/g, " ")
    .trim();

const escapePdfText = (value) =>
  normalizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const wrapPdfText = (value, maxChars) => {
  const text = normalizePdfText(value);
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
};

const downloadTenderForm = (tender) => {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 26;
  const tableWidth = pageWidth - margin * 2;
  const labelWidth = 270;
  const startY = pageHeight - margin;
  const lineHeight = 13;
  let y = startY;
  const commands = [
    "0.96 0.98 1 rg",
    "1 w",
  ];

  tenderFormRows.forEach((row) => {
    const labelLines = wrapPdfText(row.label, 34);
    const valueLines = wrapPdfText(getTenderFormValue(tender, row.key), 62);
    const rowHeight = Math.max(36, (Math.max(labelLines.length, valueLines.length) * lineHeight) + 18);
    y -= rowHeight;

    commands.push(`0.86 0.91 0.96 rg ${margin} ${y} ${labelWidth} ${rowHeight} re f`);
    commands.push(`0 0 0 RG ${margin} ${y} ${tableWidth} ${rowHeight} re S`);
    commands.push(`${margin + labelWidth} ${y} m ${margin + labelWidth} ${y + rowHeight} l S`);
    commands.push("0 0 0 rg");

    labelLines.forEach((line, index) => {
      commands.push(`BT /F2 12 Tf 1 0 0 1 ${margin + 10} ${y + rowHeight - 18 - (index * lineHeight)} Tm (${escapePdfText(line)}) Tj ET`);
    });
    valueLines.forEach((line, index) => {
      commands.push(`BT /F1 12 Tf 1 0 0 1 ${margin + labelWidth + 10} ${y + rowHeight - 18 - (index * lineHeight)} Tm (${escapePdfText(line)}) Tj ET`);
    });
  });

  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${tender.tenderNumber || "tender-form"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  const [deleteTender, setDeleteTender] = useState(null);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [selectedRr, setSelectedRr] = useState(null);
  const [bursarComment, setBursarComment] = useState("");

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
          procuringEntityDepartment: tenderForm.procuringEntityDepartment,
          tenderType: tenderForm.tenderType,
          procurementMethod: tenderForm.procurementMethod,
          tenderValue: Number(tenderForm.tenderValue),
          fundingSource: tenderForm.fundingSource,
          publicationDate: toApiDateTime(tenderForm.publicationDate),
          closingDateTime: toApiDateTime(tenderForm.closingDateTime),
          bidValidityPeriod: tenderForm.bidValidityPeriod,
          description: "Official tender creation form",
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

  const openRrReview = (rr) => {
    setSelectedRr(rr);
    setBursarComment("");
  };

  const closeRrReview = () => {
    setSelectedRr(null);
    setBursarComment("");
  };

  const approveRrBudget = async (rr, comment = "") => {
    if (!rr) return;
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
          comment: comment?.trim() || "RR budget approved by Bursar.",
        }),
      });
      setNotice({ type: "success", message: "RR approved and added to the final RR list." });
      closeRrReview();
      await Promise.all([loadTenders(), loadRequisitionQueues()]);
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Insufficient budget." });
    } finally {
      setLoading(false);
    }
  };

  const rejectRrBudget = async (rr, comment) => {
    if (!rr) return;
    if (!comment?.trim()) {
      setNotice({ type: "error", message: "Please add a rejection comment before rejecting this RR." });
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      await requestJson(`/api/tenders/bursar/requisitions/${rr.rrId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "REJECT",
          comment: comment.trim(),
        }),
      });
      setNotice({ type: "success", message: "RR returned to TEC with Bursar comment." });
      closeRrReview();
      await loadRequisitionQueues();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const submitTenderToProcurement = async (tender) => {
    setLoading(true);
    setNotice(null);
    try {
      await requestJson(`/api/tenders/${tender.tenderId}/submit-to-procurement`, {
        method: "POST",
      });
      setNotice({ type: "success", message: `${tender.tenderNumber} RR list submitted to Procurement Officer.` });
      await Promise.all([loadTenders(), loadRequisitionQueues()]);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (tender) => {
    setDeleteTender(tender);
    setDeleteStep(1);
    setDeleteConfirmation("");
  };

  const closeDeleteDialog = () => {
    setDeleteTender(null);
    setDeleteStep(1);
    setDeleteConfirmation("");
  };

  const confirmDeleteTender = async () => {
    if (!deleteTender) return;

    setLoading(true);
    setNotice(null);
    try {
      await requestJson(`/api/tenders/${deleteTender.tenderId}`, {
        method: "DELETE",
      });
      setNotice({ type: "success", message: "Tender deleted successfully." });
      closeDeleteDialog();
      await Promise.all([loadTenders(), loadRequisitionQueues()]);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
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
  const assignableTenders = tenders.filter((tender) => !tender.submittedToProcurement && tender.status !== "RFQ_CREATED");
  const selectedReviewTender = selectedRr
    ? tenders.find((tender) => String(tender.tenderId) === String(rrTenderSelections[selectedRr.rrId]))
    : null;
  const selectedReviewRrValue = Number(selectedRr?.estimatedTotalAmount || 0);
  const selectedReviewTenderValue = Number(selectedReviewTender?.tenderValue || 0);
  const selectedReviewAllocatedValue = Number(selectedReviewTender?.allocatedValue || 0);
  const selectedReviewAvailableAfter =
    selectedReviewTenderValue - selectedReviewAllocatedValue - selectedReviewRrValue;
  const selectedReviewHasEnoughBudget = Boolean(selectedReviewTender) && selectedReviewAvailableAfter >= 0;
  const finalRrsByTender = tenders
    .map((tender) => ({
      tender,
      rrs: finalRrs.filter((rr) => String(rr.tenderId) === String(tender.tenderId)),
    }))
    .filter((group) => group.rrs.length > 0);
  const finalRrsWithoutTender = finalRrs.filter((rr) => !rr.tenderId);
  const updateTenderFormField = (key, value) => {
    setTenderForm((prev) => ({ ...prev, [key]: value }));
  };

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

      <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Panel title="Create Tender" eyebrow="Tender Details">
          <Box component="form" className="space-y-4" onSubmit={handleTenderSubmit}>
            <div className="overflow-hidden border border-[#111] bg-white">
              {tenderFormRows.map((row) => (
                <div key={row.key} className="grid grid-cols-[42%_58%] border-b border-[#111] last:border-b-0">
                  <label className="flex items-center border-r border-[#111] bg-[#dbe7f3] px-3 py-3 font-serif text-base font-bold leading-5 text-[#111]">
                    {row.label}
                  </label>
                  <div className="bg-white p-2">
                    {row.input === "procurementMethod" ? (
                      <TextField
                        select
                        SelectProps={{ native: true }}
                        value={tenderForm[row.key]}
                        onChange={(event) => updateTenderFormField(row.key, event.target.value)}
                        fullWidth
                        required={row.required}
                        variant="standard"
                        InputProps={{ disableUnderline: true }}
                      >
                        <option value="">Select method</option>
                        {procurementMethodOptions.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </TextField>
                    ) : (
                      <TextField
                        type={row.type || "text"}
                        value={tenderForm[row.key]}
                        onChange={(event) => updateTenderFormField(row.key, event.target.value)}
                        fullWidth
                        required={row.required}
                        variant="standard"
                        InputProps={{ disableUnderline: true }}
                        inputProps={{
                          ...(row.type === "number" ? { min: 0, step: "0.01" } : {}),
                          ...(row.input === "fundingSource" ? { list: "funding-source-options" } : {}),
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <datalist id="funding-source-options">
              {fundingSourceOptions.map((source) => (
                <option key={source} value={source} />
              ))}
            </datalist>
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
                    InputLabelProps={{ shrink: true }}
                    value={rrTenderSelections[rr.rrId] || ""}
                    onChange={(event) => setRrTenderSelections((prev) => ({ ...prev, [rr.rrId]: event.target.value }))}
                    fullWidth
                  >
                    <option value="">Select tender</option>
                    {assignableTenders.map((tender) => (
                      <option key={tender.tenderId} value={tender.tenderId}>
                        {tender.tenderNumber} - {tender.title} - Available {formatCurrency(Number(tender.tenderValue || 0) - Number(tender.allocatedValue || 0))}
                      </option>
                    ))}
                  </TextField>
                  <Button variant="contained" startIcon={<VisibilityRoundedIcon />} onClick={() => openRrReview(rr)} disabled={loading} sx={primaryButtonSx}>
                    View Details
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
                    <Typography className="!mt-1 !text-sm !leading-7 !text-slate-600">
                      {tender.procuringEntityDepartment || "Department not set"} - {tender.procurementMethod || "Method not set"}
                    </Typography>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip label={tender.submittedToProcurement ? "SUBMITTED_TO_PROCUREMENT" : tender.status} size="small" sx={{ bgcolor: "#edf7fb", color: "#166e8c", fontWeight: 700 }} />
                    <Tooltip title="Download tender form">
                      <IconButton
                        aria-label={`Download tender form ${tender.tenderNumber}`}
                        onClick={() => downloadTenderForm(tender)}
                        sx={{
                          color: "#166e8c",
                          bgcolor: "#edf7fb",
                          "&:hover": { bgcolor: "#d8eef6" },
                        }}
                      >
                        <DownloadRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete tender">
                      <span>
                        <IconButton
                          aria-label={`Delete tender ${tender.tenderNumber}`}
                          onClick={() => openDeleteDialog(tender)}
                          disabled={loading || Number(tender.allocatedValue || 0) > 0 || tender.status === "RFQ_CREATED"}
                          sx={{
                            color: "#b42318",
                            bgcolor: "#fff1f0",
                            "&:hover": { bgcolor: "#ffe3df" },
                            "&.Mui-disabled": { bgcolor: "#f1f5f9" },
                          }}
                        >
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Final RR List" eyebrow="Approved by Bursar">
          <div className="space-y-4">
            {finalRrs.length === 0 && <EmptyState text="No RRs have been approved by Bursar yet." />}
            {finalRrsByTender.map(({ tender, rrs }) => (
              <div key={tender.tenderId} className="rounded-[24px] border border-[#dce8ef] bg-[#fbfdff] p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <Typography className="!text-lg !font-black !text-[#10283f]">{tender.title}</Typography>
                    <Typography className="!mt-2 !text-sm !leading-7 !text-slate-600">
                      {tender.tenderNumber} - Tender value {formatCurrency(tender.tenderValue)}
                    </Typography>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Chip label={`${rrs.length} approved RR${rrs.length === 1 ? "" : "s"}`} size="small" sx={{ bgcolor: "#eaf7f4", color: "#14745f", fontWeight: 700 }} />
                    <Button
                      variant="contained"
                      startIcon={<SendRoundedIcon />}
                      onClick={() => submitTenderToProcurement(tender)}
                      disabled={loading || !rrs.some((rr) => rr.status === "BURSAR_APPROVED")}
                      sx={primaryButtonSx}
                    >
                      {rrs.some((rr) => rr.status === "BURSAR_APPROVED") ? "Send to Procurement" : "Submitted"}
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {rrs.map((rr) => (
                    <FinalRrCard key={rr.rrId} rr={rr} />
                  ))}
                </div>
              </div>
            ))}
            {finalRrsWithoutTender.length > 0 && (
              <div className="rounded-[24px] border border-[#dce8ef] bg-[#fbfdff] p-5">
                <Typography className="!text-lg !font-black !text-[#10283f]">No tender assigned</Typography>
                <div className="mt-4 space-y-3">
                  {finalRrsWithoutTender.map((rr) => (
                    <FinalRrCard key={rr.rrId} rr={rr} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
      </section>

      {loading && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 rounded-2xl bg-[#10283f] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,41,64,0.22)]">
          <CircularProgress size={18} sx={{ color: "#fff" }} />
          Working
        </div>
      )}

      <Dialog open={Boolean(selectedRr)} onClose={closeRrReview} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800, color: "#10283f" }}>Review RR details</DialogTitle>
        <DialogContent>
          {selectedRr && (
            <div className="space-y-5">
              <div className="rounded-[22px] border border-[#e0ebf1] bg-[#fbfdff] p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Typography className="!text-xl !font-black !text-[#10283f]">{selectedRr.title}</Typography>
                    <Typography className="!mt-2 !text-sm !leading-7 !text-slate-600">
                      {selectedRr.rrNumber} - {selectedRr.facultyName || "Faculty not set"} - {selectedRr.divisionName || "Division not set"}
                    </Typography>
                  </div>
                  <Chip label={selectedRr.status} size="small" sx={{ bgcolor: "#edf7fb", color: "#166e8c", fontWeight: 700 }} />
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <DetailTile label="Requested by" value={selectedRr.requestedByName || "Staff member"} />
                  <DetailTile label="Estimated value" value={formatCurrency(selectedRr.estimatedTotalAmount)} />
                  <DetailTile label="Item" value={selectedRr.itemName || "Not set"} />
                  <DetailTile label="Quantity" value={selectedRr.quantity || "Not set"} />
                  <DetailTile label="Unit price" value={formatCurrency(selectedRr.estimatedUnitPrice)} />
                  <DetailTile label="Current stage" value={selectedRr.currentStage || "BURSAR"} />
                </div>
                {selectedRr.description && (
                  <DetailBlock label="Description" value={selectedRr.description} />
                )}
                {selectedRr.justification && (
                  <DetailBlock label="Justification" value={selectedRr.justification} />
                )}
              </div>

              {Array.isArray(selectedRr.items) && selectedRr.items.length > 0 && (
                <div className="rounded-[22px] border border-[#e0ebf1] bg-white p-5">
                  <Typography className="!text-sm !font-black !uppercase !tracking-[0.18em] !text-[#166e8c]">Item Details</Typography>
                  <div className="mt-4 space-y-3">
                    {selectedRr.items.map((item) => (
                      <div key={item.itemId || item.itemName} className="rounded-2xl bg-slate-50 p-4">
                        <div className="font-bold text-[#10283f]">{item.itemName || "Unnamed item"}</div>
                        <div className="mt-2 text-sm leading-7 text-slate-600">
                          {item.description || "No item description"} - Qty {item.quantity || 0} - {formatCurrency(item.estimatedTotalPrice)}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.priority && <Chip label={`Priority: ${item.priority}`} size="small" />}
                          {item.hodDecision && <Chip label={`Division Head: ${item.hodDecision}`} size="small" />}
                        </div>
                        {item.hodComment && (
                          <div className="mt-3 text-sm leading-7 text-slate-600">Division Head comment: {item.hodComment}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[22px] border border-[#e0ebf1] bg-white p-5">
                <Typography className="!text-sm !font-black !uppercase !tracking-[0.18em] !text-[#166e8c]">Bursar Decision</Typography>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                  <TextField
                    select
                    SelectProps={{ native: true }}
                    label="Tender"
                    InputLabelProps={{ shrink: true }}
                    value={rrTenderSelections[selectedRr.rrId] || ""}
                    onChange={(event) => setRrTenderSelections((prev) => ({ ...prev, [selectedRr.rrId]: event.target.value }))}
                    fullWidth
                  >
                    <option value="">Select tender</option>
                    {assignableTenders.map((tender) => (
                      <option key={tender.tenderId} value={tender.tenderId}>
                        {tender.tenderNumber} - {tender.title} - Available {formatCurrency(Number(tender.tenderValue || 0) - Number(tender.allocatedValue || 0))}
                      </option>
                    ))}
                  </TextField>
                  <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${selectedReviewHasEnoughBudget ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {selectedReviewTender
                      ? `Available after approval: ${formatCurrency(selectedReviewAvailableAfter)}`
                      : "Select tender to check balance"}
                  </div>
                </div>
                <TextField
                  label="Bursar comment"
                  value={bursarComment}
                  onChange={(event) => setBursarComment(event.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
                  sx={{ mt: 3 }}
                  helperText="Required for rejection. Optional for approval."
                />
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeRrReview} sx={{ textTransform: "none", fontWeight: 800 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<ErrorRoundedIcon />}
            onClick={() => rejectRrBudget(selectedRr, bursarComment)}
            disabled={loading || !bursarComment.trim()}
            sx={dangerButtonSx}
          >
            Reject RR
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleRoundedIcon />}
            onClick={() => approveRrBudget(selectedRr, bursarComment)}
            disabled={loading || !selectedReviewTender || !selectedReviewHasEnoughBudget}
            sx={primaryButtonSx}
          >
            Approve RR
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTender)} onClose={closeDeleteDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, color: "#10283f" }}>Delete tender</DialogTitle>
        <DialogContent>
          {deleteStep === 1 ? (
            <div className="space-y-4">
              <Typography className="!text-sm !leading-7 !text-slate-600">
                This will permanently delete tender {deleteTender?.tenderNumber} - {deleteTender?.title}. You can delete only tenders that have no allocated RR budget and no RFQ.
              </Typography>
              <Alert severity="warning" sx={{ borderRadius: "14px" }}>
                Step 1 of 2: confirm that you want to continue.
              </Alert>
            </div>
          ) : (
            <div className="space-y-4">
              <Typography className="!text-sm !leading-7 !text-slate-600">
                Step 2 of 2: type the Tender ID exactly as shown to unlock deletion.
              </Typography>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-[#10283f]">
                {deleteTender?.tenderNumber}
              </div>
              <TextField
                label="Type Tender ID"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                fullWidth
                autoFocus
              />
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeDeleteDialog} sx={{ textTransform: "none", fontWeight: 800 }}>
            Cancel
          </Button>
          {deleteStep === 1 ? (
            <Button variant="contained" onClick={() => setDeleteStep(2)} sx={dangerButtonSx}>
              Continue
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={confirmDeleteTender}
              disabled={loading || deleteConfirmation.trim() !== deleteTender?.tenderNumber}
              sx={dangerButtonSx}
            >
              Delete Tender
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
        {createElement(icon)}
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

function DetailTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-bold text-[#10283f]">{value}</div>
    </div>
  );
}

function DetailBlock({ label, value }) {
  return (
    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm leading-7 text-slate-600">{value}</div>
    </div>
  );
}

function FinalRrCard({ rr }) {
  return (
    <div className="rounded-2xl border border-[#e0ebf1] bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Typography className="!text-base !font-bold !text-[#10283f]">{rr.title}</Typography>
          <Typography className="!mt-1 !text-sm !leading-7 !text-slate-600">
            {rr.rrNumber} - {rr.facultyName || "Faculty not set"} - {rr.divisionName || "Division not set"}
          </Typography>
          <Typography className="!mt-1 !text-sm !leading-7 !text-slate-600">
            {rr.itemName || "Item not set"} - {formatCurrency(rr.estimatedTotalAmount)}
          </Typography>
        </div>
        <Chip label={rr.status} size="small" sx={{ bgcolor: "#eaf7f4", color: "#14745f", fontWeight: 700 }} />
      </div>
    </div>
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

const dangerButtonSx = {
  bgcolor: "#b42318",
  borderRadius: "14px",
  textTransform: "none",
  fontWeight: 800,
  "&:hover": { bgcolor: "#991b12" },
};
