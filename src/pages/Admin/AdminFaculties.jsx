import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import { adminApi } from "../../api/adminApi";
import PageHero from "../../components/PageHero";

const initialForm = {
  facultyCode: "",
  facultyName: "",
  description: "",
  building: "",
  floor: "",
  active: true,
};

const formatFacultyId = (id) => String(id ?? "").padStart(3, "0");

export default function AdminFaculties() {
  const [faculties, setFaculties] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const page = await adminApi.faculties.list({ size: 50, sort: "facultyId,asc", ...(search ? { search } : {}) });
      setFaculties([...(page.content || [])].sort((a, b) => Number(a.id) - Number(b.id)));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (faculty) => {
    setEditing(faculty);
    setForm({ ...initialForm, ...faculty });
    setFormErrors({});
    setDialogOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormErrors({});
    try {
      if (editing) {
        await adminApi.faculties.update(editing.id, form);
      } else {
        await adminApi.faculties.create(form);
      }
      setDialogOpen(false);
      await load();
    } catch (submitError) {
      const message = submitError.message || "Could not save faculty.";
      const normalized = message.toLowerCase();
      setFormErrors({
        facultyCode: normalized.includes("faculty code") && normalized.includes("already exists") ? message : "",
        facultyName: normalized.includes("faculty name") && normalized.includes("already exists") ? message : "",
        general: normalized.includes("already exists") ? "" : message,
      });
    }
  };

  const toggle = async (faculty) => {
    await adminApi.faculties.toggle(faculty.id);
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Admin" title="Faculties" description="Create and maintain university faculties used by divisions and staff users.">
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ textTransform: "none", borderRadius: "14px", bgcolor: "#166e8c" }}>
          Add Faculty
        </Button>
      </PageHero>

      <TextField fullWidth label="Search faculties" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white" />
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <section className="overflow-hidden rounded-[30px] border border-[#dce8ef] bg-white shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f5fbff] text-xs uppercase tracking-[0.18em] text-[#166e8c]">
              <tr>
                <th className="px-5 py-4">Faculty ID</th>
                <th className="px-5 py-4">Faculty</th>
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">Divisions</th>
                <th className="px-5 py-4">Building</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {faculties.map((faculty) => (
                <tr key={faculty.id} className="hover:bg-[#f8fcfe]">
                  <td className="px-5 py-2.5 font-mono text-xs font-bold tracking-[0.12em] text-[#166e8c]">{formatFacultyId(faculty.id)}</td>
                  <td className="px-5 py-2.5">
                    <div className="text-sm font-semibold text-[#10283f]">{faculty.facultyName}</div>
                  </td>
                  <td className="max-w-xs truncate px-5 py-2.5 text-xs text-slate-600">{faculty.description || "No description added."}</td>
                  <td className="px-5 py-2.5 text-xs text-slate-600">{faculty.divisionCount ?? 0}</td>
                  <td className="px-5 py-2.5 text-xs text-slate-600">{faculty.building || "Not set"}</td>
                  <td className="px-5 py-2.5">
                    <span className="rounded-full bg-[#edf7fb] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#166e8c]">{faculty.active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(faculty)} sx={{ textTransform: "none" }}>Edit</Button>
                      <Button size="small" startIcon={<PowerSettingsNewRoundedIcon />} onClick={() => toggle(faculty)} sx={{ textTransform: "none" }}>{faculty.active ? "Deactivate" : "Activate"}</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!faculties.length ? (
                <tr><td className="px-5 py-8 text-center text-slate-500" colSpan={7}>{loading ? "Loading faculties..." : "No faculties found."}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Edit Faculty" : "Add Faculty"}</DialogTitle>
        <form onSubmit={submit}>
          <DialogContent className="grid gap-4 md:grid-cols-2">
            <TextField label="Faculty code" value={form.facultyCode} onChange={(e) => { setForm({ ...form, facultyCode: e.target.value }); setFormErrors({ ...formErrors, facultyCode: "" }); }} error={Boolean(formErrors.facultyCode)} helperText={formErrors.facultyCode} required />
            <TextField label="Faculty name" value={form.facultyName} onChange={(e) => { setForm({ ...form, facultyName: e.target.value }); setFormErrors({ ...formErrors, facultyName: "" }); }} error={Boolean(formErrors.facultyName)} helperText={formErrors.facultyName} required />
            <TextField label="Building" value={form.building || ""} onChange={(e) => setForm({ ...form, building: e.target.value })} />
            <TextField label="Floor" value={form.floor || ""} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            <TextField className="md:col-span-2" label="Description" multiline minRows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {formErrors.general ? <div className="md:col-span-2 text-sm font-semibold text-red-600">{formErrors.general}</div> : null}
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
