import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatMoney } from "../../services/apiClient";

const initialForm = {
  title: "",
  description: "",
  justification: "",
  contactPerson: "",
  contactTelephone: "",
  goslFunded: true,
  projectName: "",
  voteNumber: "",
  includedInProcurementPlan: true,
  budgetAllocation: "",
  usedAmountSoFar: "",
};
const createSpecificationTable = () => ({
  columns: ["Description", "Required Specification"],
  rows: [["", ""]],
});
const createEmptyItem = () => ({
  itemName: "",
  description: "",
  quantity: 1,
  unitOfMeasure: "Units",
  estimatedUnitPrice: "",
  specificationTable: createSpecificationTable(),
});
const editableStatuses = new Set(["DRAFT", "HOD_REJECTED"]);

const normaliseSpecificationTable = (table) => {
  if (!table?.columns?.length) return createSpecificationTable();
  const columns = table.columns.map((column, index) => column || `Column ${index + 1}`);
  return {
    columns,
    rows: (table.rows?.length ? table.rows : [[...columns].map(() => "")]).map((row) =>
      columns.map((_, index) => row?.[index] || "")
    ),
  };
};

export default function CreateRequisition() {
  const { token } = useAuth();
  const { rrId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState([createEmptyItem()]);
  const [createdRequest, setCreatedRequest] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const isEditMode = Boolean(rrId);

  const estimatedTotal = useMemo(
    () => items.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.estimatedUnitPrice || 0), 0),
    [items]
  );

  const availableBalance = Math.max(0, Number(form.budgetAllocation || 0) - Number(form.usedAmountSoFar || 0));

  const updateField = ({ target: { name, value } }) => setForm((current) => ({ ...current, [name]: value }));
  const updateItem = (index, field, value) => setItems((current) => current.map((item, itemIndex) =>
    itemIndex === index ? { ...item, [field]: value } : item
  ));
  const updateSpecificationTable = (itemIndex, updater) => setItems((current) => current.map((item, index) =>
    index === itemIndex ? { ...item, specificationTable: updater(normaliseSpecificationTable(item.specificationTable)) } : item
  ));

  useEffect(() => {
    if (!rrId || !token) return;
    let active = true;
    setIsLoadingDraft(true);
    setError("");
    apiRequest(`/api/staff/requisitions/${rrId}`, { token })
      .then((data) => {
        if (!active) return;
        setCreatedRequest(data);
        setForm({
          title: data.title || "", description: data.description || "", justification: data.justification || "",
          contactPerson: data.contactPerson || "", contactTelephone: data.contactTelephone || "",
          goslFunded: data.goslFunded ?? true, projectName: data.projectName || "", voteNumber: data.voteNumber || "",
          includedInProcurementPlan: data.includedInProcurementPlan ?? true,
          budgetAllocation: data.budgetAllocation ?? "", usedAmountSoFar: data.usedAmountSoFar ?? "",
        });
        setItems((data.items?.length ? data.items : [createEmptyItem()]).map((item) => ({
          itemName: item.itemName || "",
          description: item.description || "",
          quantity: item.quantity || 1,
          unitOfMeasure: item.unitOfMeasure || "Units",
          estimatedUnitPrice: item.estimatedUnitPrice || "",
          specificationTable: normaliseSpecificationTable(item.specificationTable),
        })));
      })
      .catch((err) => active && setError(err.message || "Could not load requisition draft."))
      .finally(() => active && setIsLoadingDraft(false));
    return () => { active = false; };
  }, [rrId, token]);

  const saveDraft = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        budgetAllocation: Number(form.budgetAllocation || 0),
        usedAmountSoFar: Number(form.usedAmountSoFar || 0),
        items: items.map((item) => ({
          itemName: item.itemName,
          description: item.description,
          quantity: Number(item.quantity),
          unitOfMeasure: item.unitOfMeasure,
          estimatedUnitPrice: Number(item.estimatedUnitPrice),
          specificationTable: normaliseSpecificationTable(item.specificationTable),
        })),
      };
      const data = await apiRequest(isEditMode ? `/api/staff/requisitions/${rrId}` : "/api/staff/requisitions", {
        token, method: isEditMode ? "PUT" : "POST", body: payload,
      });
      setCreatedRequest(data);
      setMessage(`Draft ${data.rrNumber} ${isEditMode ? "updated" : "created"} successfully.`);
    } catch (err) {
      setError(err.message || "Could not save requisition draft.");
    } finally { setIsSaving(false); }
  };

  const submitToDivisionHead = async () => {
    if (!createdRequest?.rrId) return;
    setError(""); setMessage(""); setIsSubmitting(true);
    try {
      const data = await apiRequest(`/api/staff/requisitions/${createdRequest.rrId}/submit`, { token, method: "POST" });
      setCreatedRequest(data);
      setMessage(`${data.rrNumber} submitted to Division Head.`);
    } catch (err) { setError(err.message || "Could not submit requisition to Division Head."); }
    finally { setIsSubmitting(false); }
  };

  return <div className="space-y-8">
    <PageHero eyebrow="Staff Workspace" title={isEditMode ? "Edit Draft Requisition" : "Create Requisition"}
      description="Create a draft requisition with item details, flexible technical specifications, estimated value, and justification before sending it to the Division Head approval queue.">
      <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur"><div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Estimated Total</div><div className="mt-2 text-3xl font-black">{formatMoney(estimatedTotal)}</div></div>
    </PageHero>
    {isLoadingDraft && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading draft...</div>}
    <form onSubmit={saveDraft} className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="rounded-[34px] border border-[#dce8ef] bg-white p-8 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2"><span className="text-sm font-bold text-[#10283f]">Request title</span><input name="title" value={form.title} onChange={updateField} required className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" /></label>
          <label className="space-y-2 md:col-span-2"><span className="text-sm font-bold text-[#10283f]">Request description</span><textarea name="description" value={form.description} onChange={updateField} rows={3} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" /></label>
          <section className="space-y-4 rounded-[24px] border border-[#dce8ef] bg-[#f8fcff] p-5 md:col-span-2">
            <div><h3 className="text-lg font-black text-[#10283f]">Contact Details</h3><p className="mt-1 text-sm text-slate-600">Contact person for questions about this requisition.</p></div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2"><span className="text-sm font-bold text-[#10283f]">Contact person</span><input name="contactPerson" value={form.contactPerson} onChange={updateField} required className="w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 outline-none focus:border-[#166e8c]" /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-[#10283f]">Telephone number</span><input name="contactTelephone" type="tel" value={form.contactTelephone} onChange={updateField} required className="w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 outline-none focus:border-[#166e8c]" /></label>
            </div>
          </section>

          <section className="space-y-5 rounded-[24px] border border-[#dce8ef] bg-[#f8fcff] p-5 md:col-span-2">
            <div><h3 className="text-lg font-black text-[#10283f]">Funds</h3><p className="mt-1 text-sm text-slate-600">Record the funding source and current budget position for this request.</p></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><span className="block text-sm font-bold text-[#10283f]">Funds GOSL</span><div className="flex gap-4"><label className="inline-flex items-center gap-2 text-sm"><input type="radio" checked={form.goslFunded === true} onChange={() => setForm((current) => ({ ...current, goslFunded: true }))} /> Yes</label><label className="inline-flex items-center gap-2 text-sm"><input type="radio" checked={form.goslFunded === false} onChange={() => setForm((current) => ({ ...current, goslFunded: false }))} /> No</label></div></div>
              <label className="space-y-2"><span className="text-sm font-bold text-[#10283f]">Project</span><input name="projectName" value={form.projectName} onChange={updateField} placeholder="Project name or code" className="w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 outline-none focus:border-[#166e8c]" /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-[#10283f]">Vote</span><input name="voteNumber" value={form.voteNumber} onChange={updateField} placeholder="Vote number" className="w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 outline-none focus:border-[#166e8c]" /></label>
              <div className="space-y-2"><span className="block text-sm font-bold text-[#10283f]">Included in procurement plan?</span><div className="flex gap-4"><label className="inline-flex items-center gap-2 text-sm"><input type="radio" checked={form.includedInProcurementPlan === true} onChange={() => setForm((current) => ({ ...current, includedInProcurementPlan: true }))} /> Yes</label><label className="inline-flex items-center gap-2 text-sm"><input type="radio" checked={form.includedInProcurementPlan === false} onChange={() => setForm((current) => ({ ...current, includedInProcurementPlan: false }))} /> No</label></div></div>
              <label className="space-y-2"><span className="text-sm font-bold text-[#10283f]">Budget allocation (Rs.)</span><input name="budgetAllocation" type="number" min="0" step="0.01" value={form.budgetAllocation} onChange={updateField} required className="w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 outline-none focus:border-[#166e8c]" /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-[#10283f]">Used amount so far (Rs.)</span><input name="usedAmountSoFar" type="number" min="0" step="0.01" value={form.usedAmountSoFar} onChange={updateField} required className="w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 outline-none focus:border-[#166e8c]" /></label>
              <div className="rounded-2xl border border-[#9acbd9] bg-[#edf8fb] p-4"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[#166e8c]">Balance available</div><div className="mt-2 text-xl font-black text-[#10283f]">{formatMoney(availableBalance)}</div><div className="mt-1 text-xs text-slate-600">Budget allocation minus used amount so far</div></div>
            </div>
            {form.includedInProcurementPlan === false && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">This request is not in the procurement plan. Vice Chancellor approval will be handled in a later workflow step.</div>}
          </section>

          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-black text-[#10283f]">Requisition Items</h3><button type="button" onClick={() => setItems((current) => [...current, createEmptyItem()])} className="inline-flex items-center gap-1 rounded-xl bg-[#e7f5f9] px-3 py-2 text-sm font-bold text-[#166e8c]"><AddRoundedIcon fontSize="small" /> Add item</button></div>
            {items.map((item, index) => <ItemEditor key={index} item={item} index={index} canRemove={items.length > 1} updateItem={updateItem} removeItem={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} updateTable={updateSpecificationTable} />)}
          </div>
          <label className="space-y-2 md:col-span-2"><span className="text-sm font-bold text-[#10283f]">Justification</span><textarea name="justification" value={form.justification} onChange={updateField} rows={4} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" /></label>
        </div>
      </section>
      <aside className="space-y-5"><div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]"><div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Draft Control</div><div className="mt-4 space-y-3"><button type="submit" disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#166e8c] px-5 py-3 font-bold text-white transition hover:bg-[#145f79] disabled:opacity-60"><SaveRoundedIcon fontSize="small" />{isSaving ? "Saving..." : isEditMode ? "Update Draft" : "Save Draft"}</button><button type="button" onClick={submitToDivisionHead} disabled={!createdRequest?.rrId || !editableStatuses.has(createdRequest?.status) || isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f2940] px-5 py-3 font-bold text-white transition hover:bg-[#173b5a] disabled:cursor-not-allowed disabled:opacity-45"><SendRoundedIcon fontSize="small" />{isSubmitting ? "Submitting..." : "Submit to Division Head"}</button>{createdRequest?.rrId && !editableStatuses.has(createdRequest?.status) && <button type="button" onClick={() => navigate(`/requisitions/${createdRequest.rrId}`)} className="flex w-full items-center justify-center rounded-2xl border border-[#dce8ef] px-5 py-3 font-bold text-[#10283f] transition hover:bg-slate-50">View Submitted RR</button>}</div></div>{createdRequest && <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]"><div className="text-sm font-bold text-[#10283f]">{createdRequest.rrNumber}</div><div className="mt-3"><StatusPill status={createdRequest.status} /></div><div className="mt-4 text-sm leading-7 text-slate-600">Current stage: {createdRequest.currentStage}</div></div>}{(message || error) && <div className={`rounded-[24px] p-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</div>}</aside>
    </form>
  </div>;
}

function ItemEditor({ item, index, canRemove, updateItem, removeItem, updateTable }) {
  const table = normaliseSpecificationTable(item.specificationTable);
  const updateCell = (rowIndex, columnIndex, value) => updateTable(index, (current) => ({ ...current, rows: current.rows.map((row, currentRow) => currentRow === rowIndex ? row.map((cell, currentColumn) => currentColumn === columnIndex ? value : cell) : row) }));
  const updateColumn = (columnIndex, value) => updateTable(index, (current) => ({ ...current, columns: current.columns.map((column, currentColumn) => currentColumn === columnIndex ? value : column) }));
  const addColumn = () => updateTable(index, (current) => ({ columns: [...current.columns, `Column ${current.columns.length + 1}`], rows: current.rows.map((row) => [...row, ""]) }));
  const removeColumn = (columnIndex) => updateTable(index, (current) => current.columns.length <= 1 ? current : ({ columns: current.columns.filter((_, currentColumn) => currentColumn !== columnIndex), rows: current.rows.map((row) => row.filter((_, currentColumn) => currentColumn !== columnIndex)) }));
  const addRow = () => updateTable(index, (current) => ({ ...current, rows: [...current.rows, current.columns.map(() => "")] }));
  const removeRow = (rowIndex) => updateTable(index, (current) => current.rows.length <= 1 ? current : ({ ...current, rows: current.rows.filter((_, currentRow) => currentRow !== rowIndex) }));
  return <div className="rounded-[24px] border border-[#dce8ef] bg-[#f8fcff] p-4"><div className="mb-4 flex items-center justify-between"><div className="text-sm font-black text-[#10283f]">Item {index + 1}</div>{canRemove && <button type="button" onClick={removeItem} className="inline-flex items-center gap-1 text-sm font-bold text-red-600"><DeleteOutlineRoundedIcon fontSize="small" /> Remove item</button>}</div><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><span className="text-sm font-bold text-[#10283f]">Item name</span><input value={item.itemName} onChange={(event) => updateItem(index, "itemName", event.target.value)} required className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" /></label><label className="space-y-2"><span className="text-sm font-bold text-[#10283f]">Unit of measure</span><input value={item.unitOfMeasure} onChange={(event) => updateItem(index, "unitOfMeasure", event.target.value)} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" /></label><label className="space-y-2"><span className="text-sm font-bold text-[#10283f]">Quantity</span><input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} required className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" /></label><label className="space-y-2"><span className="text-sm font-bold text-[#10283f]">Estimated unit price</span><input type="number" min="0.01" step="0.01" value={item.estimatedUnitPrice} onChange={(event) => updateItem(index, "estimatedUnitPrice", event.target.value)} required className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" /></label><label className="space-y-2 md:col-span-2"><span className="text-sm font-bold text-[#10283f]">Item notes (optional)</span><textarea value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} rows={2} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" /></label></div><SpecificationTable table={table} updateColumn={updateColumn} updateCell={updateCell} addColumn={addColumn} removeColumn={removeColumn} addRow={addRow} removeRow={removeRow} /></div>;
}

function SpecificationTable({ table, updateColumn, updateCell, addColumn, removeColumn, addRow, removeRow }) {
  return <div className="mt-6 overflow-hidden rounded-2xl border border-[#cbdde6] bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce8ef] bg-[#edf8fb] px-4 py-3"><div><div className="font-black text-[#10283f]">Technical Specification Table</div><div className="mt-1 text-xs text-slate-600">Add the exact requirements for this item. Columns and rows can be changed as needed.</div></div><div className="flex gap-2"><button type="button" onClick={addColumn} className="rounded-xl border border-[#9acbd9] px-3 py-2 text-xs font-bold text-[#166e8c]">Add column</button><button type="button" onClick={addRow} className="rounded-xl bg-[#166e8c] px-3 py-2 text-xs font-bold text-white">Add row</button></div></div><div className="overflow-x-auto"><table className="min-w-full border-collapse text-sm"><thead><tr>{table.columns.map((column, columnIndex) => <th key={columnIndex} className="min-w-[180px] border-b border-r border-[#dce8ef] bg-slate-50 p-2 text-left"><div className="flex gap-1"><input aria-label={`Column ${columnIndex + 1} name`} value={column} onChange={(event) => updateColumn(columnIndex, event.target.value)} className="min-w-0 flex-1 bg-transparent font-bold text-[#10283f] outline-none" />{table.columns.length > 1 && <button type="button" onClick={() => removeColumn(columnIndex)} aria-label={`Remove ${column} column`} className="text-red-600"><DeleteOutlineRoundedIcon fontSize="small" /></button>}</div></th>)}<th className="w-10 border-b border-[#dce8ef] bg-slate-50" /></tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, columnIndex) => <td key={columnIndex} className="border-b border-r border-[#dce8ef] p-0"><textarea aria-label={`Specification row ${rowIndex + 1}, column ${columnIndex + 1}`} value={cell} onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)} rows={2} className="block w-full resize-y border-0 bg-transparent p-3 outline-none focus:bg-cyan-50" /></td>)}<td className="border-b border-[#dce8ef] text-center">{table.rows.length > 1 && <button type="button" onClick={() => removeRow(rowIndex)} aria-label={`Remove row ${rowIndex + 1}`} className="text-red-600"><DeleteOutlineRoundedIcon fontSize="small" /></button>}</td></tr>)}</tbody></table></div></div>;
}