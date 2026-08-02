import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
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
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { useAuth } from "../../contexts/AuthContext";
import { downloadRequisitionForm } from "../../utils/requisitionDocument";
import { requestDisplayName, requestContext } from "../../utils/procurementDisplay";

const bursarSubRoles = ["BURSAR", "ASSISTANT_BURSAR", "SENIOR_ASSISTANT_BURSAR"];
const tenderTypeOptions = ["Goods", "Works", "Services", "IT Systems"];
const procurementMethodOptions = ["NCB", "National Shopping"];
const fundingSourceOptions = ["GOSL", "Project", "Vote"];

const normalizeTenderTypes = (values = []) =>
  Array.from(new Set(values.map((item) => String(item).trim()).filter(Boolean)));

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
  tenderTypes: [],
  procurementMethod: "",
  tenderValue: "",
  fundingSource: "",
  dateOfPublication: "",
  closingDateTime: "",
  description: "",
};

const tenderTemplateRows = [
  ["Tender Reference No.", "tenderNumber"],
  ["Tender Title", "title"],
  ["Tender Type", "tenderType"],
  ["Procurement Method", "procurementMethod"],
  ["Estimated Contract Value (LKR)", "tenderValue"],
  ["Funding Source", "fundingSource"],
  ["Date of Publication", "dateOfPublication"],
  ["Closing Date & Time", "closingDateTime"],
  ["Description", "description"],
];

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const buildTenderViewModel = (formOrTender) => ({
  tenderNumber: formOrTender.tenderNumber || "",
  title: formOrTender.title || "",
  tenderType: Array.isArray(formOrTender.tenderTypes)
    ? formOrTender.tenderTypes.join(", ")
    : formOrTender.tenderType || "",
  procurementMethod: formOrTender.procurementMethod || "",
  tenderValue: formatCurrency(formOrTender.tenderValue),
  fundingSource: formOrTender.fundingSource || "",
  dateOfPublication: formOrTender.dateOfPublication || "",
  closingDateTime: formOrTender.closingDateTime
    ? new Date(formOrTender.closingDateTime).toLocaleString()
    : "",
  description: formOrTender.description || "",
});

const buildTenderHtml = (formOrTender) => {
  const tender = buildTenderViewModel(formOrTender);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(tender.tenderNumber || "Tender Creation Form")}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #10283f; margin: 36px; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 0 0 24px; color: #475569; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #166e8c; color: white; text-align: left; padding: 12px; }
    td { border: 1px solid #dce8ef; padding: 12px; vertical-align: top; }
    td:first-child { width: 38%; font-weight: 700; background: #f8fbfd; }
  </style>
</head>
<body>
  <h1>TENDER CREATION TEMPLATE</h1>
  <p>University e-Procurement System - Sri Lanka Government Universities</p>
  <table>
    <thead><tr><th colspan="2">A. ADMINISTRATIVE INFORMATION</th></tr></thead>
    <tbody>
      ${tenderTemplateRows.map(([label, key]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(tender[key])}</td></tr>`).join("")}
    </tbody>
  </table>
</body>
</html>`;
};

const downloadTenderForm = (formOrTender) => {
  const blob = buildTenderPdfBlob(formOrTender);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${formOrTender.tenderNumber || "tender-creation-form"}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

const escapePdfText = (value) => String(value ?? "")
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)");

const wrapPdfText = (value, maxLength = 70) => {
  const words = String(value || "Not filled").split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    if ((line + " " + word).trim().length > maxLength) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : ["Not filled"];
};

const buildTenderPdfBlob = (formOrTender) => {
  const tender = buildTenderViewModel(formOrTender);
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    `(TENDER CREATION TEMPLATE) Tj`,
    "/F1 10 Tf",
    "0 -22 Td",
    `(University e-Procurement System - Sri Lanka Government Universities) Tj`,
    "/F1 12 Tf",
    "0 -30 Td",
    `(A. ADMINISTRATIVE INFORMATION) Tj`,
    "/F1 10 Tf",
  ];

  tenderTemplateRows.forEach(([label, key]) => {
    content.push("0 -24 Td", `(${escapePdfText(label)}:) Tj`);
    wrapPdfText(tender[key], 82).forEach((line, index) => {
      content.push(index === 0 ? "230 0 Td" : "0 -14 Td", `(${escapePdfText(line)}) Tj`);
      if (index === 0) content.push("-230 0 Td");
    });
  });
  content.push("ET");

  const stream = content.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
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
  return new Blob([pdf], { type: "application/pdf" });
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
  const [previewTender, setPreviewTender] = useState(null);
  const [tenderTypeInput, setTenderTypeInput] = useState("");

  const isBursar = user?.mainRole === "FINANCE" && bursarSubRoles.includes(user?.subRole);
  const canActOnBursarRrs = user?.mainRole === "FINANCE" && user?.subRole === "ASSISTANT_BURSAR";

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
    const tenderTypes = normalizeTenderTypes([...tenderForm.tenderTypes, tenderTypeInput]);
    setLoading(true);
    setNotice(null);

    try {
      const createdTender = await requestJson("/api/tenders", {
        method: "POST",
        body: JSON.stringify({
          title: tenderForm.title,
          tenderNumber: tenderForm.tenderNumber,
          description: tenderForm.description,
          tenderType: tenderTypes.join(", "),
          procurementMethod: tenderForm.procurementMethod,
          fundingSource: tenderForm.fundingSource,
          dateOfPublication: tenderForm.dateOfPublication,
          closingDateTime: tenderForm.closingDateTime,
          tenderValue: Number(tenderForm.tenderValue),
        }),
      });
      setNotice({ type: "success", message: "Tender created and notifications sent to internal users." });
      setPreviewTender(createdTender);
      setTenderForm(initialTenderForm);
      setTenderTypeInput("");
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
          This workspace is available only for FINANCE users with Bursar, Assistant Bursar, or Senior Assistant Bursar sub-role.
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
  const tenderTypeChoices = Array.from(new Set([
    ...tenderTypeOptions,
    ...tenders.flatMap((tender) => String(tender.tenderType || "").split(",").map((type) => type.trim()).filter(Boolean)),
    ...tenderForm.tenderTypes,
  ])).sort((left, right) => left.localeCompare(right));
  const tenderFormForOutput = {
    ...tenderForm,
    tenderTypes: normalizeTenderTypes([...tenderForm.tenderTypes, tenderTypeInput]),
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

      </section>

      {notice && (
        <Alert severity={notice.type} onClose={() => setNotice(null)} sx={{ borderRadius: "16px" }}>
          {notice.message}
        </Alert>
      )}

      <section className="mx-auto max-w-7xl">
        <Panel title="Create Tender" eyebrow="Tender Details">
          <Box component="form" className="grid gap-5 md:grid-cols-2" onSubmit={handleTenderSubmit}>
            <TextField label="Tender Reference No." value={tenderForm.tenderNumber} onChange={(event) => setTenderForm((prev) => ({ ...prev, tenderNumber: event.target.value }))} fullWidth required />
            <TextField label="Tender Title" value={tenderForm.title} onChange={(event) => setTenderForm((prev) => ({ ...prev, title: event.target.value }))} fullWidth required />
            <div className="md:col-span-2">
              <Autocomplete
                multiple
                freeSolo
                filterSelectedOptions
                options={tenderTypeChoices}
                value={tenderForm.tenderTypes}
                inputValue={tenderTypeInput}
                onInputChange={(_, value) => setTenderTypeInput(value)}
                onChange={(_, value) => setTenderForm((prev) => ({
                  ...prev,
                  tenderTypes: normalizeTenderTypes(value),
                }))}
                onBlur={() => {
                  if (!tenderTypeInput.trim()) return;
                  setTenderForm((prev) => ({
                    ...prev,
                    tenderTypes: normalizeTenderTypes([...prev.tenderTypes, tenderTypeInput]),
                  }));
                  setTenderTypeInput("");
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip key={option} label={option} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} label="Tender Type" placeholder="Search, select, or type a new type" required={!tenderForm.tenderTypes.length} />
                )}
              />
            </div>
            <TextField select SelectProps={{ native: true }} label="Procurement Method" value={tenderForm.procurementMethod} onChange={(event) => setTenderForm((prev) => ({ ...prev, procurementMethod: event.target.value }))} fullWidth required InputLabelProps={{ shrink: true }}>
              <option value="">Select procurement method</option>
              {procurementMethodOptions.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </TextField>
            <TextField select SelectProps={{ native: true }} label="Funding Source" value={tenderForm.fundingSource} onChange={(event) => setTenderForm((prev) => ({ ...prev, fundingSource: event.target.value }))} fullWidth required InputLabelProps={{ shrink: true }}>
              <option value="">Select funding source</option>
              {fundingSourceOptions.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </TextField>
            <TextField label="Estimated Contract Value (LKR)" type="number" value={tenderForm.tenderValue} onChange={(event) => setTenderForm((prev) => ({ ...prev, tenderValue: event.target.value }))} fullWidth required />
            <TextField label="Date of Publication" type="date" value={tenderForm.dateOfPublication} onChange={(event) => setTenderForm((prev) => ({ ...prev, dateOfPublication: event.target.value }))} fullWidth required InputLabelProps={{ shrink: true }} />
            <TextField label="Closing Date & Time" type="datetime-local" value={tenderForm.closingDateTime} onChange={(event) => setTenderForm((prev) => ({ ...prev, closingDateTime: event.target.value }))} fullWidth required InputLabelProps={{ shrink: true }} className="md:col-span-2" />
            <TextField label="Description" value={tenderForm.description} onChange={(event) => setTenderForm((prev) => ({ ...prev, description: event.target.value }))} fullWidth multiline minRows={4} className="md:col-span-2" />
            <div className="grid gap-3 sm:grid-cols-2 md:col-span-2">
              <Button type="button" variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={() => setPreviewTender(tenderFormForOutput)} fullWidth sx={{ borderRadius: "14px", textTransform: "none", fontWeight: 800 }}>
                View Filled Form
              </Button>
              <Button type="button" variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => downloadTenderForm(tenderFormForOutput)} fullWidth sx={{ borderRadius: "14px", textTransform: "none", fontWeight: 800 }}>
                Download PDF
              </Button>
            </div>
            <Button type="submit" variant="contained" disabled={loading} fullWidth sx={primaryButtonSx} className="md:col-span-2">
              Create Tender
            </Button>
          </Box>
        </Panel>
      </section>

      {loading && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 rounded-2xl bg-[#10283f] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,41,64,0.22)]">
          <CircularProgress size={18} sx={{ color: "#fff" }} />
          Working
        </div>
      )}

      <Dialog open={Boolean(previewTender)} onClose={() => setPreviewTender(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800, color: "#10283f" }}>Tender Creation Form</DialogTitle>
        <DialogContent>
          {previewTender && <TenderFormPreview tender={previewTender} />}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setPreviewTender(null)} sx={{ textTransform: "none", fontWeight: 800 }}>
            Close
          </Button>
          <Button variant="contained" startIcon={<DownloadRoundedIcon />} onClick={() => downloadTenderForm(previewTender)} sx={primaryButtonSx}>
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(selectedRr)} onClose={closeRrReview} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800, color: "#10283f" }}>Review RR details</DialogTitle>
        <DialogContent>
          {selectedRr && (
            <div className="space-y-5">
              <div className="rounded-[22px] border border-[#e0ebf1] bg-[#fbfdff] p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Typography className="!text-xl !font-black !text-[#10283f]">{requestDisplayName(selectedRr)}</Typography>
                    <Typography className="!mt-2 !text-sm !leading-7 !text-slate-600">
                      {requestContext(selectedRr) || `${selectedRr.facultyName || "Faculty not set"} - ${selectedRr.divisionName || "Division not set"}`}
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
                {!canActOnBursarRrs && (
                  <Alert severity="info" sx={{ mt: 3, borderRadius: "14px" }}>
                    This RR list is read-only for Bursar and Senior Assistant Bursar users.
                  </Alert>
                )}
                {canActOnBursarRrs && (
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
                )}
                {canActOnBursarRrs && (
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
                )}
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeRrReview} sx={{ textTransform: "none", fontWeight: 800 }}>
            Cancel
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadRoundedIcon />}
            onClick={() => downloadRequisitionForm(selectedRr)}
            disabled={!selectedRr}
            sx={{ borderRadius: "14px", textTransform: "none", fontWeight: 800 }}
          >
            Download RR Form
          </Button>
          <Button
            variant="contained"
            startIcon={<ErrorRoundedIcon />}
            onClick={() => rejectRrBudget(selectedRr, bursarComment)}
            disabled={!canActOnBursarRrs || loading || !bursarComment.trim()}
            sx={dangerButtonSx}
          >
            Reject RR
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleRoundedIcon />}
            onClick={() => approveRrBudget(selectedRr, bursarComment)}
            disabled={!canActOnBursarRrs || loading || !selectedReviewTender || !selectedReviewHasEnoughBudget}
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

function TenderFormPreview({ tender }) {
  const view = buildTenderViewModel(tender);
  return (
    <div className="rounded-[24px] border border-[#dce8ef] bg-white p-5">
      <div>
        <Typography className="!text-2xl !font-black !text-[#10283f]">TENDER CREATION TEMPLATE</Typography>
        <Typography className="!mt-2 !text-sm !leading-7 !text-slate-600">
          University e-Procurement System - Sri Lanka Government Universities
        </Typography>
        <Typography className="!mt-1 !text-xs !font-semibold !uppercase !tracking-[0.16em] !text-[#166e8c]">
          A. Administrative Information
        </Typography>
      </div>
      <div className="mt-5 overflow-hidden rounded-[18px] border border-[#dce8ef]">
        {tenderTemplateRows.map(([label, key]) => (
          <div key={key} className="grid border-b border-[#dce8ef] last:border-b-0 md:grid-cols-[0.42fr_0.58fr]">
            <div className="bg-[#f8fbfd] px-4 py-3 text-sm font-black text-[#10283f]">{label}</div>
            <div className="px-4 py-3 text-sm font-semibold text-slate-700">{view[key] || "Not filled"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalRrCard({ rr }) {
  return (
    <div className="rounded-2xl border border-[#e0ebf1] bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Typography className="!text-base !font-bold !text-[#10283f]">{requestDisplayName(rr)}</Typography>
          <Typography className="!mt-1 !text-sm !leading-7 !text-slate-600">
            {requestContext(rr) || `${rr.facultyName || "Faculty not set"} - ${rr.divisionName || "Division not set"}`}
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
