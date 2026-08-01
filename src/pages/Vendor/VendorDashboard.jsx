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

const emptyResubmitForm = {
  vendorName: "",
  companyRegistrationNumber: "",
  category: "",
  phone: "",
  address: "",
  contactPerson: "",
  businessRegistrationDocumentName: "",
  businessRegistrationDocument: "",
  vatDocumentName: "",
  vatDocument: "",
  cidaDocumentName: "",
  cidaDocument: "",
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });

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
  const [profile, setProfile] = useState(null);
  const [resubmitForm, setResubmitForm] = useState(emptyResubmitForm);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const [profileData, rfqList, bidList, quotationList, offerList, poList, reportList] = await Promise.all([
        vendorApi.profile.get().catch(() => null),
        vendorApi.rfqs.list().catch(() => []),
        vendorApi.bids.list().catch(() => []),
        vendorApi.quotations.list().catch(() => []),
        vendorApi.offers.list().catch(() => []),
        vendorApi.purchaseOrders.list().catch(() => []),
        vendorApi.reports.list().catch(() => []),
      ]);

      setProfile(profileData);
      if (profileData) {
        setResubmitForm((current) => ({
          ...current,
          vendorName: current.vendorName || profileData.vendorName || "",
          companyRegistrationNumber: current.companyRegistrationNumber || profileData.companyRegistrationNumber || "",
          category: current.category || profileData.vendorCategory || "",
          phone: current.phone || profileData.vendorPhone || profileData.phoneNumber || "",
          address: current.address || profileData.vendorAddress || profileData.address || "",
          contactPerson: current.contactPerson || profileData.vendorContactPerson || "",
        }));
      }
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
  const vendorStatus = profile?.vendorStatus || user?.vendorStatus || "";
  const isRejectedVendor = vendorStatus === "REJECTED";
  const isBlacklistedVendor = vendorStatus === "BLACK_LISTED";
  const canSubmitVendorWork = vendorStatus === "APPROVED";

  const cards = [
    { label: "Invited RFQs", value: rfqs.length, icon: BusinessCenterRoundedIcon },
    { label: "Open Opportunities", value: activeRfqs.length, icon: LocalOfferRoundedIcon },
    { label: "Submitted Bids", value: bids.length + quotations.length, icon: AssignmentRoundedIcon },
    { label: "Purchase Orders", value: purchaseOrders.length, icon: ReceiptLongRoundedIcon },
  ];

  const openDialog = (type, item) => {
    if (!canSubmitVendorWork) {
      setError(isBlacklistedVendor
        ? "Your vendor account is blacklisted. You can view the reason but cannot submit anything."
        : "Your vendor account must be approved before submitting procurement records.");
      return;
    }
    setNotice("");
    setError("");
    setDialog({ type, item });
    setForm(emptyForm);
  };

  const setResubmitValue = (field, value) => {
    setResubmitForm((current) => ({ ...current, [field]: value }));
  };

  const setResubmitFile = async (field, nameField, file) => {
    const dataUrl = await fileToDataUrl(file);
    setResubmitForm((current) => ({
      ...current,
      [nameField]: file?.name || "",
      [field]: dataUrl || "",
    }));
  };

  const submitResubmission = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsResubmitting(true);
    try {
      const updated = await vendorApi.profile.resubmit(resubmitForm);
      setProfile(updated);
      setNotice("Documents resubmitted successfully. Your registration is waiting for DPC review.");
      await load();
    } catch (resubmitError) {
      setError(resubmitError.message || "Could not resubmit vendor documents.");
    } finally {
      setIsResubmitting(false);
    }
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

      {(isRejectedVendor || isBlacklistedVendor || vendorStatus === "PENDING") && (
        <section className={`rounded-[30px] border p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)] ${
          isBlacklistedVendor ? "border-slate-300 bg-slate-900 text-white" : "border-amber-200 bg-amber-50"
        }`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className={`text-xs font-semibold uppercase tracking-[0.24em] ${isBlacklistedVendor ? "text-slate-300" : "text-amber-700"}`}>
                Registration Status
              </div>
              <h2 className={`mt-2 text-2xl font-black ${isBlacklistedVendor ? "text-white" : "text-[#10283f]"}`}>
                {isBlacklistedVendor ? "Vendor account blacklisted" : isRejectedVendor ? "Vendor registration rejected" : "Vendor registration pending review"}
              </h2>
              <p className={`mt-3 max-w-3xl text-sm leading-7 ${isBlacklistedVendor ? "text-slate-200" : "text-slate-700"}`}>
                {isBlacklistedVendor
                  ? "You can sign in and view the blacklist reason, but you cannot submit quotations, objections, catalog items, or register again with these vendor details."
                  : isRejectedVendor
                    ? "Review the DPC remarks below, update the requested documents, and resubmit them for another DPC review."
                    : "Your resubmitted documents are waiting for DPC review. Procurement submissions unlock after approval."}
              </p>
            </div>
            <span className={`self-start rounded-full px-3 py-1 text-xs font-black ${isBlacklistedVendor ? "bg-white text-slate-900" : "bg-white text-amber-700"}`}>
              {vendorStatus.replaceAll("_", " ")}
            </span>
          </div>

          {(profile?.rejectionReason || profile?.decisionRemarks || profile?.documentReviewRemarks) && (
            <div className={`mt-5 grid gap-3 ${isBlacklistedVendor ? "text-slate-900" : ""}`}>
              {profile?.rejectionReason && <ReasonBlock label="Reason" value={profile.rejectionReason} />}
              {profile?.decisionRemarks && <ReasonBlock label="Decision remarks" value={profile.decisionRemarks} />}
              {profile?.documentReviewRemarks && <ReasonBlock label="Document remarks" value={profile.documentReviewRemarks} />}
            </div>
          )}

          {isRejectedVendor && (
            <form onSubmit={submitResubmission} className="mt-6 rounded-[24px] bg-white p-5 text-slate-900">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Resubmit Documents</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextField label="Vendor name" value={resubmitForm.vendorName} onChange={(e) => setResubmitValue("vendorName", e.target.value)} required />
                <TextField label="Company registration number" value={resubmitForm.companyRegistrationNumber} onChange={(e) => setResubmitValue("companyRegistrationNumber", e.target.value)} required />
                <TextField label="Category" value={resubmitForm.category} onChange={(e) => setResubmitValue("category", e.target.value)} required />
                <TextField label="Phone" value={resubmitForm.phone} onChange={(e) => setResubmitValue("phone", e.target.value)} />
                <TextField label="Contact person" value={resubmitForm.contactPerson} onChange={(e) => setResubmitValue("contactPerson", e.target.value)} />
                <TextField className="md:col-span-2" label="Address" value={resubmitForm.address} onChange={(e) => setResubmitValue("address", e.target.value)} />
                <FileField label="Business registration document" onChange={(file) => setResubmitFile("businessRegistrationDocument", "businessRegistrationDocumentName", file)} fileName={resubmitForm.businessRegistrationDocumentName || profile?.businessRegistrationDocumentName} />
                <FileField label="VAT / Exemption document" onChange={(file) => setResubmitFile("vatDocument", "vatDocumentName", file)} fileName={resubmitForm.vatDocumentName || profile?.vatDocumentName} />
                <FileField label="CIDA document" onChange={(file) => setResubmitFile("cidaDocument", "cidaDocumentName", file)} fileName={resubmitForm.cidaDocumentName || profile?.cidaDocumentName} />
              </div>
              <div className="mt-5 flex justify-end">
                <Button type="submit" variant="contained" disabled={isResubmitting} sx={{ textTransform: "none", bgcolor: "#166e8c" }}>
                  {isResubmitting ? "Submitting..." : "Resubmit to DPC"}
                </Button>
              </div>
            </form>
          )}
        </section>
      )}

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

                  {canSubmitVendorWork && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddTaskRoundedIcon />}
                      onClick={() => openDialog("quotation", rfq)}
                      sx={{ textTransform: "none", bgcolor: "#166e8c" }}
                    >
                      Quotation
                    </Button>
                  </div>
                  )}
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
                  {canSubmitVendorWork && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => openDialog("offer", offerLetter)}
                    sx={{ textTransform: "none", bgcolor: "#166e8c" }}
                  >
                    Respond
                  </Button>
                  )}
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

function ReasonBlock({ label, value }) {
  return (
    <div className="rounded-[20px] bg-white p-4 text-sm leading-7">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">{label}</div>
      <div className="mt-2 whitespace-pre-wrap font-semibold text-[#10283f]">{value}</div>
    </div>
  );
}

function FileField({ label, fileName, onChange }) {
  return (
    <label className="rounded-[18px] border border-[#dce8ef] bg-slate-50 p-4">
      <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{label}</span>
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
        className="mt-3 block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-[#edf7fb] file:px-4 file:py-2 file:text-sm file:font-bold file:text-[#166e8c]"
      />
      {fileName && <span className="mt-2 block text-xs font-semibold text-slate-500">Current: {fileName}</span>}
    </label>
  );
}
