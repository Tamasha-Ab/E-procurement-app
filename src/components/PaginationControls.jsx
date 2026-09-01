import { useEffect, useState } from "react";

export function usePagination(items = [], pageSize = 10) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages - 1));
  }, [totalPages]);

  return {
    page,
    setPage,
    totalPages,
    pageItems: items.slice(page * pageSize, (page + 1) * pageSize),
    pageSize,
  };
}

export default function PaginationControls({ page, setPage, totalPages, totalItems, pageSize = 10 }) {
  if (totalItems <= pageSize) return null;

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-[#e6eef3] pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-semibold text-slate-500">
        Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalItems)} of {totalItems}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="rounded-xl border border-[#dce8ef] px-3 py-2 text-xs font-bold text-[#166e8c] hover:bg-[#edf7fb] disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
        {Array.from({ length: totalPages }, (_, index) => index).map((pageNumber) => (
          <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`h-9 min-w-9 rounded-xl px-2 text-xs font-black ${page === pageNumber ? "bg-[#166e8c] text-white" : "border border-[#dce8ef] text-[#166e8c] hover:bg-[#edf7fb]"}`}>{pageNumber + 1}</button>
        ))}
        <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} className="rounded-xl border border-[#dce8ef] px-3 py-2 text-xs font-bold text-[#166e8c] hover:bg-[#edf7fb] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
