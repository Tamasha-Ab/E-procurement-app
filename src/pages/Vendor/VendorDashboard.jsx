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
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useNavigate } from "react-router-dom";
import { vendorApi } from "../../api/vendorApi";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";

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

const isPdfDataUrl = (value) => typeof value === "string" && value.startsWith("data:application/pdf");

const offerPdfFileName = (offerLetter) =>
  `Offer-Letter-${offerLetter.letterNumber || offerLetter.offerLetterId || "vendor"}.pdf`.replace(/[^a-z0-9._-]+/gi, "-");

const viewOfferPdf = (offerLetter) => {
  if (!isPdfDataUrl(offerLetter.letterContent)) return;
  window.open(offerLetter.letterContent, "_blank", "noopener,noreferrer");
};

const downloadOfferPdf = (offerLetter) => {
  if (!isPdfDataUrl(offerLetter.letterContent)) return;
  const link = document.createElement("a");
  link.href = offerLetter.letterContent;
  link.download = offerPdfFileName(offerLetter);
  link.click();
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
  const [bids, setBids] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [offers, setOffers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
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
      const [profileData, bidList, quotationList, offerList, poList] = await Promise.all([
        vendorApi.profile.get().catch(() => null),
        vendorApi.bids.list().catch(() => []),
        vendorApi.quotations.list().catch(() => []),
        vendorApi.offers.list().catch(() => []),
        vendorApi.purchaseOrders.list().catch(() => []),
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
      setBids(safeList(bidList));
      setQuotations(safeList(quotationList));
      setOffers(safeList(offerList));
      setPurchaseOrders(safeList(poList));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const vendorName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Vendor";
  const vendorStatus = profile?.vendorStatus || user?.vendorStatus || "";
  const isRejectedVendor = vendorStatus === "REJECTED";
  const isBlacklistedVendor = vendorStatus === "BLACK_LISTED";
  const canSubmitVendorWork = vendorStatus === "APPROVED";

  const cards = [
    { label: "Submitted Bids", value: bids.length + quotations.length, icon: AssignmentRoundedIcon },
    { label: "Purchase Orders", value: purchaseOrders.length, icon: ReceiptLongRoundedIcon },
    { label: "Offer Letters", value: offers.length, icon: LocalOfferRoundedIcon },
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
      toast.success("Documents resubmitted successfully. Your registration is waiting for DPC review.", { autoClose: 3500 });
      await load();
    } catch (resubmitError) {
      const message = resubmitError.message || "Could not resubmit vendor documents.";
      setError(message);
      toast.error(message, { autoClose: 4000 });
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
        toast.success("Quotation submitted successfully.", { autoClose: 3000 });
      }

      if (dialog.type === "bid") {
        await vendorApi.rfqs.bid(dialog.item.rfqId, {
          bidAmount: Number(form.amount),
          technicalDocumentUrl: form.technicalDocumentUrl,
          financialDocumentUrl: form.financialDocumentUrl,
          encryptedBidData: form.encryptedBidData,
        });
        setNotice("Bid submitted successfully.");
        toast.success("Bid submitted successfully.", { autoClose: 3000 });
      }

      if (dialog.type === "objection") {
        await vendorApi.rfqs.object(dialog.item.rfqId, {
          reason: form.objectionReason,
          details: form.objectionDetails,
          comment: form.comment,
        });
        setNotice("Objection submitted successfully.");
        toast.success("Objection submitted successfully.", { autoClose: 3000 });
      }

      if (dialog.type === "offer") {
        await vendorApi.offers.respond(dialog.item.offerLetterId, {
          decision: form.decision,
          comment: form.comment,
        });
        setNotice("Offer response saved successfully.");
        toast.success("Offer response saved successfully.", { autoClose: 3000 });
      }

      closeDialog();
      await load();
    } catch (submitError) {
      const message = submitError.message || "Could not complete the action.";
      setError(message);
      toast.error(message, { autoClose: 4000 });
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
      <section className="overflow-hidden rounded-2xl border border-[#2c7895] bg-[linear-gradient(110deg,#123047_0%,#175a75_52%,#6fb8cf_100%)] px-6 py-4 text-white shadow-[0_12px_30px_rgba(15,41,64,0.18)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">Vendor Dashboard</div>
            <h1 className="mt-1.5 text-xl font-bold leading-tight md:text-2xl">Welcome back, {vendorName}.</h1>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-100/90">
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

        <div className="mt-3 grid gap-2.5 md:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon sx={{ fontSize: 18 }} />
                </div>
                <div><div className="text-lg font-black leading-tight">{loading ? "..." : card.value}</div><div className="mt-1 text-xs text-slate-200">{card.label}</div></div>
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

      <section className="rounded-2xl border border-[#dce8ef] bg-white p-4 shadow-[0_12px_30px_rgba(15,41,64,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf7fb] text-[#166e8c]"><ReceiptLongRoundedIcon sx={{ fontSize: 18 }} /></span>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#166e8c]">Quotations</div>
              <div className="text-lg font-bold text-[#10283f]">{quotations.length} Submitted</div>
            </div></div>
            <button type="button" onClick={() => navigate("/vendor/quotations")} className="rounded-lg bg-[#edf7fb] px-3 py-2 text-xs font-bold text-[#166e8c]">View All</button>
          </div>
          <div className="mt-3 space-y-2">
            {quotations.slice(0, 3).map((quotation) => (
              <button
                key={quotation.quotationId}
                type="button"
                onClick={() => navigate("/vendor/quotations")}
                className="flex w-full items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2.5 text-left text-xs text-slate-600 hover:bg-[#edf7fb]"
              >
                <span className="font-semibold text-[#10283f]">{quotation.rfqNumber}</span>
                <span>{money(quotation.quotedAmount)}</span>
                <span className="font-semibold text-[#166e8c]">{quotation.status || "Submitted"}</span>
              </button>
            ))}
          </div>
      </section>

      <section className="rounded-2xl border border-[#dce8ef] bg-white p-4 shadow-[0_12px_30px_rgba(15,41,64,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Offer Letters</div>
            <h2 className="mt-1 text-xl font-bold text-[#10283f]">Received Offer Letters</h2>
          </div>
          <div className="flex items-center gap-2"><span className="rounded-full bg-[#edf7fb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">{offers.length} Received</span><button type="button" onClick={() => navigate("/vendor/offer-letters")} className="rounded-lg bg-[#166e8c] px-3 py-2 text-xs font-bold text-white hover:bg-[#125d77]">View All</button></div>
        </div>
        <div className="mt-4 space-y-2">
          {!offers.length ? (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No offer letters received yet.</div>
          ) : (
            offers.map((offerLetter) => (
              <div key={offerLetter.offerLetterId} className="rounded-xl border border-[#e6eef3] bg-slate-50 p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">
                      {offerLetter.letterNumber || `Offer ${offerLetter.offerLetterId}`}
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-[#10283f]">{offerLetter.requisitionItemName || offerLetter.rfqNumber || "Offer letter"}</h3>
                    <div className="mt-1 text-xs text-slate-600">{money(offerLetter.offerAmount)} | {offerLetter.status || "SENT_TO_VENDOR"}</div>
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
                {isPdfDataUrl(offerLetter.letterContent) ? (
                  <div className="mt-4 flex flex-wrap gap-3 rounded-2xl bg-white p-4">
                    <Button size="small" onClick={() => viewOfferPdf(offerLetter)} sx={{ textTransform: "none", color: "#166e8c", fontWeight: 800 }}>
                      View Offer Letter PDF
                    </Button>
                    <Button size="small" onClick={() => downloadOfferPdf(offerLetter)} sx={{ textTransform: "none", color: "#166e8c", fontWeight: 800 }}>
                      Download Offer Letter
                    </Button>
                  </div>
                ) : (
                  <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-7 text-slate-700">
                    {offerLetter.letterContent || "No letter content available."}
                  </pre>
                )}
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
