import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import { adminApi } from "../../api/adminApi";

const initialForm = {
  departmentCode: "",
  departmentName: "",
  description: "",
  facultyId: "",
  hodName: "",
  hodEmail: "",
  hodPhone: "",
  building: "",
  room: "",
  extension: "",
  active: true,
};

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
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
      const [page, facultyList] = await Promise.all([
        adminApi.departments.list({ size: 50, sort: "departmentName,asc", ...(search ? { search } : {}) }),
        adminApi.faculties.all().catch(() => []),
      ]);
      setDepartments(page.content || []);
      setFaculties(Array.isArray(facultyList) ? facultyList : []);
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

  const openEdit = (department) => {
    setEditing(department);
    setForm({ ...initialForm, ...department, facultyId: department.facultyId || "" });
    setDialogOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    const payload = { ...form, facultyId: Number(form.facultyId) };
    if (editing) {
      await adminApi.departments.update(editing.id, payload);
    } else {
      await adminApi.departments.create(payload);
    }
    setDialogOpen(false);
    await load();
  };

  const toggle = async (department) => {
    await adminApi.departments.toggle(department.id);
    await load();
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Admin</div>
          <h1 className="mt-2 text-3xl font-black text-[#10283f]">Departments</h1>
          <p className="mt-2 text-sm text-slate-600">Manage departments, HOD contacts, and faculty assignment records.</p>
        </div>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ textTransform: "none", borderRadius: "14px", bgcolor: "#166e8c" }}>
          Add Department
        </Button>
      </section>

      <TextField fullWidth label="Search departments" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white" />
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <section className="overflow-hidden rounded-[30px] border border-[#dce8ef] bg-white shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f5fbff] text-xs uppercase tracking-[0.18em] text-[#166e8c]">
              <tr>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Faculty</th>
                <th className="px-5 py-4">HOD</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((department) => (
                <tr key={department.id}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[#10283f]">{department.departmentName}</div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[#166e8c]">{department.departmentCode}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{department.facultyName || "Not assigned"}</td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-700">{department.hodName || "Not assigned"}</div>
                    <div className="mt-1 text-slate-500">{department.hodEmail || department.extension || ""}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{[department.building, department.room].filter(Boolean).join(", ") || "Not set"}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(department)} sx={{ textTransform: "none" }}>Edit</Button>
                      <Button size="small" startIcon={<PowerSettingsNewRoundedIcon />} onClick={() => toggle(department)} sx={{ textTransform: "none" }}>
                        {department.active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!departments.length ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>{loading ? "Loading departments..." : "No departments found."}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Edit Department" : "Add Department"}</DialogTitle>
        <form onSubmit={submit}>
          <DialogContent className="grid gap-4 md:grid-cols-2">
            <TextField label="Department code" value={form.departmentCode} onChange={(e) => setForm({ ...form, departmentCode: e.target.value })} required />
            <TextField label="Department name" value={form.departmentName} onChange={(e) => setForm({ ...form, departmentName: e.target.value })} required />
            <TextField select label="Faculty" value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })} required>
              {faculties.map((faculty) => <MenuItem key={faculty.id} value={faculty.id}>{faculty.facultyName}</MenuItem>)}
            </TextField>
            <TextField label="HOD name" value={form.hodName || ""} onChange={(e) => setForm({ ...form, hodName: e.target.value })} />
            <TextField label="HOD email" type="email" value={form.hodEmail || ""} onChange={(e) => setForm({ ...form, hodEmail: e.target.value })} />
            <TextField label="HOD phone" value={form.hodPhone || ""} onChange={(e) => setForm({ ...form, hodPhone: e.target.value })} />
            <TextField label="Building" value={form.building || ""} onChange={(e) => setForm({ ...form, building: e.target.value })} />
            <TextField label="Room" value={form.room || ""} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            <TextField label="Extension" value={form.extension || ""} onChange={(e) => setForm({ ...form, extension: e.target.value })} />
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
