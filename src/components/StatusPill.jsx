import { statusLabel } from "../services/apiClient";

const toneMap = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED_TO_HOD: "bg-blue-50 text-blue-700",
  HOD_APPROVED: "bg-cyan-50 text-cyan-700",
  SUBMITTED_TO_DEAN: "bg-amber-50 text-amber-700",
  DEAN_APPROVED: "bg-emerald-50 text-emerald-700",
  DEAN_REJECTED: "bg-red-50 text-red-700",
  SUBMITTED_TO_VC: "bg-violet-50 text-violet-700",
  VC_REJECTED: "bg-red-50 text-red-700",
  SUBMITTED_TO_BEC: "bg-teal-50 text-teal-700",
  BEC_CATEGORY_ASSIGNED: "bg-cyan-50 text-cyan-700",
  BEC_REJECTED: "bg-red-50 text-red-700",
  SUBMITTED_TO_TEC: "bg-indigo-50 text-indigo-700",
  SUBMITTED_TO_BURSAR: "bg-emerald-50 text-emerald-700",
  HOD_REJECTED: "bg-red-50 text-red-700",
  TEC_REJECTED: "bg-red-50 text-red-700",
};

export default function StatusPill({ status }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${toneMap[status] || "bg-slate-100 text-slate-700"}`}>
      {statusLabel(status)}
    </span>
  );
}
