import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import { adminApi } from "../../api/adminApi";
import PaginationControls, { usePagination } from "../../components/PaginationControls";
import PageHero from "../../components/PageHero";

const initialForm = {
  facultyId: "",
  divisionName: "",
  description: "",
  active: true,
};

export default function AdminDepartments() {
  const [divisions, setDivisions] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredDivisions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return divisions;
    return divisions.filter((division) =>
      [division.divisionName, division.description, division.facultyName, division.facultyCode]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [divisions, search]);
  const { page, setPage, totalPages, pageItems, pageSize } = usePagination(filteredDivisions);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [divisionPage, facultyList] = await Promise.all([
        adminApi.divisions.list(),
        adminApi.faculties.all(),
      ]);
      setDivisions(divisionPage.content || []);
      setFaculties(Array.isArray(facultyList) ? facultyList : []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setDialogOpen(true);
  };

  const openEdit = (division) => {
    setEditing(division);
    setForm({
      facultyId: division.facultyId || "",
      divisionName: division.divisionName || "",
      description: division.description || "",
      active: division.active ?? true,
    });
    setDialogOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      facultyId: form.facultyId ? Number(form.facultyId) : null,
      divisionName: form.divisionName.trim(),
      description: form.description?.trim() || "",
      active: form.active,
    };

    if (editing) {
      await adminApi.divisions.update(editing.divisionId || editing.id, payload);
    } else {
      await adminApi.divisions.create(payload);
    }
    setDialogOpen(false);
    await load();
  };

  const toggle = async (division) => {
    await adminApi.divisions.toggle(division);
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Admin" title="Divisions" description="Create and maintain university divisions used for staff registration and Division Head approvals.">
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ textTransform: "none", borderRadius: "14px", bgcolor: "#166e8c" }}>
          Add Division
        </Button>
      </PageHero>

      <TextField fullWidth label="Search divisions" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white" />
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <section className="overflow-hidden rounded-[30px] border border-[#dce8ef] bg-white shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f5fbff] text-xs uppercase tracking-[0.18em] text-[#166e8c]">
              <tr>
                <th className="px-5 py-4">Division</th>
                <th className="px-5 py-4">Faculty</th>
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((division) => (
                <tr key={division.divisionId || division.id}>
                  <td className="px-5 py-2.5">
                    <div className="text-sm font-semibold text-[#10283f]">{division.divisionName}</div>
                  </td>
                  <td className="px-5 py-2.5"><div className="text-xs font-bold text-[#10283f]">{division.facultyName || "Not assigned"}</div><div className="mt-0.5 text-[10px] text-slate-400">{division.facultyCode || "Edit division to assign"}</div></td>
                  <td className="max-w-sm truncate px-5 py-2.5 text-xs text-slate-600">{division.description || "No description added."}</td>
                  <td className="px-5 py-2.5">
                    <span className="rounded-full bg-[#edf7fb] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#166e8c]">
                      {division.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(division)} sx={{ textTransform: "none" }}>Edit</Button>
                      <Button size="small" startIcon={<PowerSettingsNewRoundedIcon />} onClick={() => toggle(division)} sx={{ textTransform: "none" }}>
                        {division.active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredDivisions.length ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>{loading ? "Loading divisions..." : "No divisions found."}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-5"><PaginationControls page={page} setPage={setPage} totalPages={totalPages} totalItems={filteredDivisions.length} pageSize={pageSize} /></div>
      </section>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit Division" : "Add Division"}</DialogTitle>
        <form onSubmit={submit}>
          <DialogContent className="grid gap-4">
            <TextField select label="Faculty" value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })} required>
              {faculties.map((faculty) => <MenuItem key={faculty.id} value={faculty.id}>{faculty.facultyCode} - {faculty.facultyName}</MenuItem>)}
            </TextField>
            <TextField label="Division name" value={form.divisionName} onChange={(e) => setForm({ ...form, divisionName: e.target.value })} required />
            <TextField label="Description" multiline minRows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ textTransform: "none", bgcolor: "#166e8c" }}>Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
}
