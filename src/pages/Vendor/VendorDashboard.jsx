import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import AddTaskRoundedIcon from "@mui/icons-material/AddTaskRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useNavigate } from "react-router-dom";
import { vendorApi } from "../../api/vendorApi";
import { useAuth } from "../../contexts/AuthContext";

const emptyForm = {
  amount: "",
  deliveryPeriodDays: "",
  remarks: "",
  attachmentUrl: "",
  technicalDocumentUrl: "",
  financialDocumentUrl: "",
  encryptedBidData: "",
  objectionReason: "",
  objectionDetails: "",
  decision: "ACCEPTED",
  comment: "",
};

const money = (value) => {
  const number = Number(value || 0);
  return number ? `LKR ${number.toLocaleString()}` : "LKR 0";
};

const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const statusClass = (status = "") => {
  const normalized = status.toUpperCase();
  if (normalized.includes("APPROV") || normalized.includes("ACCEPT") || normalized.includes("AWARD")) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (normalized.includes("REJECT") || normalized.includes("DECLIN")) {
    return "bg-red-50 text-red-700";
  }
  if (normalized.includes("PENDING") || normalized.includes("SUBMIT")) {
    return "bg-[#fff9ec] text-[#b47a00]";
  }
  return "bg-[#edf7fb] text-[#166e8c]";
};

const safeList = (value) => (Array.isArray(value) ? value : []);

export default function VendorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState([]);
  const [bids, setBids] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [offers, setOffers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const [rfqList, bidList, quotationList, offerList, poList, reportList] = await Promise.all([
        vendorApi.rfqs.list().catch(() => []),
        vendorApi.bids.list().catch(() => []),
        vendorApi.quotations.list().catch(() => []),
        vendorApi.offers.list().catch(() => []),
        vendorApi.purchaseOrders.list().catch(() => []),
        vendorApi.reports.list().catch(() => []),
      ]);

      setRfqs(safeList(rfqList));
      setBids(safeList(bidList));
      setQuotations(safeList(quotationList));
      setOffers(safeList(offerList));
      setPurchaseOrders(safeList(poList));
      setReports(safeList(reportList));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submittedRfqIds = useMemo(() => {
    const ids = new Set();
    bids.forEach((bid) => ids.add(bid.rfqId));
    quotations.forEach((quotation) => ids.add(quotation.rfqId));
    return ids;
  }, [bids, quotations]);

  const activeRfqs = rfqs.filter((rfq) => !submittedRfqIds.has(rfq.rfqId));
  const vendorName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Vendor";

  const cards = [
    { label: "Invited RFQs", value: rfqs.length, icon: BusinessCenterRoundedIcon },
    { label: "Open Opportunities", value: activeRfqs.length, icon: LocalOfferRoundedIcon },
    { label: "Submitted Bids", value: bids.length + quotations.length, icon: AssignmentRoundedIcon },
    { label: "Purchase Orders", value: purchaseOrders.length, icon: ReceiptLongRoundedIcon },
  ];

  const openDialog = (type, item) => {
    setNotice("");
    setError("");
    setDialog({ type, item });
    setForm(emptyForm);
  };

  const closeDialog = () => {
    setDialog(null);
    setForm(emptyForm);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!dialog) return;

    try {
      if (dialog.type === "quotation") {
        await vendorApi.rfqs.quote(dialog.item.rfqId, {
          quotedAmount: Number(form.amount),
          deliveryPeriodDays: form.deliveryPeriodDays ? Number(form.deliveryPeriodDays) : null,
          remarks: form.remarks,
          attachmentUrl: form.attachmentUrl,
        });
        setNotice("Quotation submitted successfully.");
      }

      if (dialog.type === "bid") {
        await vendorApi.rfqs.bid(dialog.item.rfqId, {
          bidAmount: Number(form.amount),
          technicalDocumentUrl: form.technicalDocumentUrl,
          financialDocumentUrl: form.financialDocumentUrl,
          encryptedBidData: form.encryptedBidData,
        });
        setNotice("Bid submitted successfully.");
      }

      if (dialog.type === "objection") {
        await vendorApi.rfqs.object(dialog.item.rfqId, {
          reason: form.objectionReason,
          details: form.objectionDetails,
          comment: form.comment,
        });
        setNotice("Objection submitted successfully.");
      }

      if (dialog.type === "offer") {
        await vendorApi.offers.respond(dialog.item.offerLetterId, {
          decision: form.decision,
          comment: form.comment,
        });
        setNotice("Offer response saved successfully.");
      }

      closeDialog();
      await load();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const dialogTitle = {
    quotation: "Submit Quotation",
    bid: "Submit Bid",
    objection: "Submit Objection",
    offer: "Respond to Offer Letter",
  }[dialog?.type];

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#0f2940,#166e8c)] p-8 text-white shadow-[0_28px_70px_rgba(15,41,64,0.22)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">Vendor Dashboard</div>
            <h1 className="mt-4 text-4xl font-black leading-tight">Welcome back, {vendorName}.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-100/90">
              Review RFQ invitations, submit quotations or sealed bids, respond to offer letters, and track awarded
              purchase orders from one workspace.
            </p>
          </div>
          <Button
            variant="contained"
            startIcon={<RefreshRoundedIcon />}
            onClick={load}
            sx={{
              alignSelf: "flex-start",
              bgcolor: "#f6c453",
              color: "#10283f",
              textTransform: "none",
              fontWeight: 800,
              borderRadius: "14px",
              "&:hover": { bgcolor: "#f0b93a" },
            }}
          >
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 mt-8 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-[24px] bg-white/10 p-4 backdrop-blur">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <Icon />
                </div>
                <div className="mt-5 text-3xl font-black">{loading ? "..." : card.value}</div>
                <div className="mt-1 text-sm text-slate-200">{card.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div> : null}

      <section>
        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RFQ Invitations</div>
              <h2 className="mt-2 text-2xl font-bold text-[#10283f]">Open vendor opportunities</h2>
            </div>
            <div className="rounded-full bg-[#edf7fb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">
              {activeRfqs.length} Actionable
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {rfqs.length ? (
              rfqs.map((rfq) => (
                <div key={rfq.rfqId} className="rounded-[24px] border border-[#e6eef3] bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">
                        {rfq.rfqNumber || `RFQ-${rfq.rfqId}`}
                      </div>
                      <h3 className="mt-2 text-xl font-bold text-[#10283f]">{rfq.title || "Untitled RFQ"}</h3>
                      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{rfq.description || "No description provided."}</p>
                      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                        <span>Submission: {formatDate(rfq.submissionDeadline)}</span>
                        <span>Bid opening: {formatDate(rfq.bidOpeningDateTime)}</span>
                        <span>Objection: {formatDate(rfq.objectionDeadline)}</span>
                      </div>
                    </div>
                    <span className={`self-start rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${statusClass(rfq.status)}`}>
                      {rfq.status || "Open"}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddTaskRoundedIcon />}
                      onClick={() => navigate(`/vendor/tenders?section=quotation&rfqId=${rfq.rfqId}`)}
                      sx={{ textTransform: "none", bgcolor: "#166e8c" }}
                    >
                      Quotation
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No RFQ invitations are available right now.</div>
            )}
          </div>
        </div>

      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf7fb] text-[#166e8c]"><ReceiptLongRoundedIcon /></span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Quotations</div>
              <div className="text-xl font-bold text-[#10283f]">{quotations.length} Submitted</div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {quotations.slice(0, 3).map((quotation) => (
              <button
                key={quotation.quotationId}
                type="button"
                onClick={() => navigate("/vendor/quotations")}
                className="w-full rounded-[20px] bg-slate-50 p-4 text-left text-sm text-slate-600 hover:bg-[#edf7fb]"
              >
                <div className="font-semibold text-[#10283f]">{quotation.rfqNumber}</div>
                <div className="mt-1">{money(quotation.quotedAmount)} | {quotation.status || "Submitted"}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><AssignmentRoundedIcon /></span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Reports</div>
              <div className="text-xl font-bold text-[#10283f]">{reports.length} Records</div>
            </div>
          </div>
          <div className="mt-5 rounded-[20px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            Vendor bid reports from TEC evaluations appear here once procurement publishes them through the backend.
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Offer Letters</div>
            <h2 className="mt-2 text-2xl font-bold text-[#10283f]">Received Offer Letters</h2>
          </div>
          <span className="rounded-full bg-[#edf7fb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">
            {offers.length} Received
          </span>
        </div>
        <div className="mt-6 space-y-4">
          {!offers.length ? (
            <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No offer letters received yet.</div>
          ) : (
            offers.map((offerLetter) => (
              <div key={offerLetter.offerLetterId} className="rounded-[24px] border border-[#e6eef3] bg-slate-50 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">
                      {offerLetter.letterNumber || `Offer ${offerLetter.offerLetterId}`}
                    </div>
                    <h3 className="mt-2 text-xl font-bold text-[#10283f]">{offerLetter.requisitionItemName || offerLetter.rfqNumber || "Offer letter"}</h3>
                    <div className="mt-2 text-sm text-slate-600">{money(offerLetter.offerAmount)} | {offerLetter.status || "SENT_TO_VENDOR"}</div>
                  </div>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => openDialog("offer", offerLetter)}
                    sx={{ textTransform: "none", bgcolor: "#166e8c" }}
                  >
                    Respond
                  </Button>
                </div>
                <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-7 text-slate-700">
                  {offerLetter.letterContent || "No letter content available."}
                </pre>
              </div>
            ))
          )}
        </div>
      </section>

      <Dialog open={!!dialog} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <form onSubmit={submit}>
          <DialogContent className="grid gap-4 md:grid-cols-2">
            {dialog?.type === "quotation" ? (
              <>
                <TextField label="Quoted amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                <TextField label="Delivery period days" type="number" value={form.deliveryPeriodDays} onChange={(e) => setForm({ ...form, deliveryPeriodDays: e.target.value })} />
                <TextField className="md:col-span-2" label="Attachment URL" value={form.attachmentUrl} onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })} />
                <TextField className="md:col-span-2" label="Remarks" multiline minRows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </>
            ) : null}

            {dialog?.type === "bid" ? (
              <>
                <TextField label="Bid amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                <TextField label="Technical document URL" value={form.technicalDocumentUrl} onChange={(e) => setForm({ ...form, technicalDocumentUrl: e.target.value })} />
                <TextField label="Financial document URL" value={form.financialDocumentUrl} onChange={(e) => setForm({ ...form, financialDocumentUrl: e.target.value })} />
                <TextField className="md:col-span-2" label="Encrypted bid data" multiline minRows={3} value={form.encryptedBidData} onChange={(e) => setForm({ ...form, encryptedBidData: e.target.value })} />
              </>
            ) : null}

            {dialog?.type === "objection" ? (
              <>
                <TextField label="Reason" value={form.objectionReason} onChange={(e) => setForm({ ...form, objectionReason: e.target.value })} required />
                <TextField className="md:col-span-2" label="Details" multiline minRows={3} value={form.objectionDetails} onChange={(e) => setForm({ ...form, objectionDetails: e.target.value })} />
                <TextField className="md:col-span-2" label="Comment" multiline minRows={2} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
              </>
            ) : null}

            {dialog?.type === "offer" ? (
              <>
                <TextField select label="Decision" value={form.decision} onChange={(e) => setForm({ ...form, decision: e.target.value })} required>
                  <MenuItem value="ACCEPTED">Accept</MenuItem>
                  <MenuItem value="REJECTED">Reject</MenuItem>
                </TextField>
                <TextField className="md:col-span-2" label="Comment" multiline minRows={3} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
              </>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={closeDialog} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ textTransform: "none", bgcolor: "#166e8c" }}>Submit</Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
}
