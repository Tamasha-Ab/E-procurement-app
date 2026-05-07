import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import { adminApi } from "../../api/adminApi";

const initialForm = {
  facultyCode: "",
  facultyName: "",
  description: "",
  deanName: "",
  deanEmail: "",
  deanPhone: "",
  building: "",
  floor: "",
  active: true,
};

export default function AdminFaculties() {
  const [faculties, setFaculties] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const page = await adminApi.faculties.list({ size: 50, sort: "facultyName,asc", ...(search ? { search } : {}) });
      setFaculties(page.content || []);
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
    setDialogOpen(true);
  };

  const openEdit = (faculty) => {
    setEditing(faculty);
    setForm({ ...initialForm, ...faculty });
    setDialogOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (editing) {
      await adminApi.faculties.update(editing.id, form);
    } else {
      await adminApi.faculties.create(form);
    }
    setDialogOpen(false);
    await load();
  };

  const toggle = async (faculty) => {
    await adminApi.faculties.toggle(faculty.id);
    await load();
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Admin</div>
          <h1 className="mt-2 text-3xl font-black text-[#10283f]">Faculties</h1>
          <p className="mt-2 text-sm text-slate-600">Create and maintain university faculties used by departments and staff users.</p>
        </div>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ textTransform: "none", borderRadius: "14px", bgcolor: "#166e8c" }}>
          Add Faculty
        </Button>
      </section>

      <TextField fullWidth label="Search faculties" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white" />
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {faculties.map((faculty) => (
          <article key={faculty.id} className="rounded-[28px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#166e8c]">{faculty.facultyCode}</div>
                <h2 className="mt-2 text-2xl font-bold text-[#10283f]">{faculty.facultyName}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{faculty.description || "No description added."}</p>
              </div>
              <span className="rounded-full bg-[#edf7fb] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#166e8c]">
                {faculty.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <div><span className="font-semibold text-[#10283f]">Dean:</span> {faculty.deanName || "Not assigned"}</div>
              <div><span className="font-semibold text-[#10283f]">Departments:</span> {faculty.departmentCount || 0}</div>
              <div><span className="font-semibold text-[#10283f]">Building:</span> {faculty.building || "Not set"}</div>
              <div><span className="font-semibold text-[#10283f]">Users:</span> {faculty.userCount || 0}</div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(faculty)} sx={{ textTransform: "none" }}>Edit</Button>
              <Button size="small" startIcon={<PowerSettingsNewRoundedIcon />} onClick={() => toggle(faculty)} sx={{ textTransform: "none" }}>Toggle</Button>
            </div>
          </article>
        ))}
        {!faculties.length ? <div className="rounded-[28px] border border-[#dce8ef] bg-white p-8 text-center text-slate-500">{loading ? "Loading faculties..." : "No faculties found."}</div> : null}
      </section>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Edit Faculty" : "Add Faculty"}</DialogTitle>
        <form onSubmit={submit}>
          <DialogContent className="grid gap-4 md:grid-cols-2">
            <TextField label="Faculty code" value={form.facultyCode} onChange={(e) => setForm({ ...form, facultyCode: e.target.value })} required />
            <TextField label="Faculty name" value={form.facultyName} onChange={(e) => setForm({ ...form, facultyName: e.target.value })} required />
            <TextField label="Dean name" value={form.deanName || ""} onChange={(e) => setForm({ ...form, deanName: e.target.value })} />
            <TextField label="Dean email" type="email" value={form.deanEmail || ""} onChange={(e) => setForm({ ...form, deanEmail: e.target.value })} />
            <TextField label="Dean phone" value={form.deanPhone || ""} onChange={(e) => setForm({ ...form, deanPhone: e.target.value })} />
            <TextField label="Building" value={form.building || ""} onChange={(e) => setForm({ ...form, building: e.target.value })} />
            <TextField label="Floor" value={form.floor || ""} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            <TextField className="md:col-span-2" label="Description" multiline minRows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
