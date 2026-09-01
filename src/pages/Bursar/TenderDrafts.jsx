import { useEffect, useState } from "react";
import { Button } from "@mui/material";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import PageHero from "../../components/PageHero";
import { deleteTenderDraft, loadTenderDrafts } from "../../utils/tenderDrafts";

export default function TenderDrafts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.userId || user?.id || user?.username;
  const [drafts, setDrafts] = useState([]);

  useEffect(() => setDrafts(loadTenderDrafts(userId)), [userId]);

  return <div className="space-y-6">
    <PageHero eyebrow="Tender Workspace" title="Saved Tender Drafts" description="Continue editing a saved tender before creating and publishing it.">
      <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate("/senior-assistant-bursar/tender-creation")} sx={{ color: "white", textTransform: "none", fontWeight: 800 }}>Tender Creation</Button>
    </PageHero>
    <section className="rounded-2xl border border-[#dce8ef] bg-white p-4 shadow-[0_12px_30px_rgba(15,41,64,0.06)]">
      <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#166e8c]">{drafts.length} saved drafts</div>
      <div className="space-y-2">
        {!drafts.length && <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No tender drafts have been saved.</div>}
        {drafts.map((draft) => <div key={draft.id} className="grid gap-3 rounded-xl border border-[#e1ebf0] px-4 py-3 md:grid-cols-[1fr_170px_190px] md:items-center">
          <div className="min-w-0"><div className="truncate text-sm font-black text-[#10283f]">{draft.form?.title || "Untitled tender draft"}</div><div className="mt-1 text-xs text-slate-500">{draft.form?.tenderNumber || "No reference number"} · Saved {new Date(draft.savedAt).toLocaleString()}</div></div>
          <div className="text-xs font-semibold text-slate-600">LKR {Number(draft.form?.tenderValue || 0).toLocaleString()}</div>
          <div className="flex justify-end gap-2">
            <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => navigate(`/senior-assistant-bursar/tender-creation?draftId=${draft.id}`)} sx={{ textTransform: "none", fontWeight: 800 }}>Edit</Button>
            <Button size="small" startIcon={<DeleteRoundedIcon />} onClick={() => setDrafts(deleteTenderDraft(userId, draft.id))} sx={{ textTransform: "none", color: "#b42318", fontWeight: 800 }}>Delete</Button>
          </div>
        </div>)}
      </div>
    </section>
  </div>;
}
