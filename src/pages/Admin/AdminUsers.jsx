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
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import { adminApi } from "../../api/adminApi";

const mainRoles = ["ADMIN", "FACULTY_STAFF", "FINANCE", "VENDOR"];
const subRoles = ["DIVISION_HEAD", "STAFF_MEMBER", "TEC", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "BURSAR"];
const statuses = ["PENDING", "APPROVED", "REJECTED"];

const initialForm = {
  username: "",
  email: "",
  password: "",
  mainRole: "FACULTY_STAFF",
  subRole: "",
  facultyId: "",
  divisionId: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
  employeeId: "",
  designation: "",
  address: "",
  isActive: true,
};

const getFullName = (user) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Unnamed user";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState({ number: 0, totalPages: 1, totalElements: 0 });
  const [faculties, setFaculties] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", mainRole: "" });
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const next = { page: page.number, size: 10, sort: "createdAt,desc" };
    Object.entries(filters).forEach(([key, value]) => {
      if (value) next[key] = value;
    });
    return next;
  }, [filters, page.number]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [userPage, facultyList, divisionResponse] = await Promise.all([
        adminApi.users.list(params),
        adminApi.faculties.all().catch(() => []),
        fetch("/api/divisions").then((response) => response.json()).catch(() => ({ data: [] })),
      ]);
      setUsers(userPage.content || []);
      setPage({
        number: userPage.number || 0,
        totalPages: userPage.totalPages || 1,
        totalElements: userPage.totalElements || 0,
      });
      setFaculties(Array.isArray(facultyList) ? facultyList : []);
      setDivisions(Array.isArray(divisionResponse?.data) ? divisionResponse.data : []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [params]);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setDialogOpen(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      ...initialForm,
      ...user,
      password: "",
      facultyId: user.facultyId || "",
      divisionId: user.divisionId || "",
      subRole: user.subRole || "",
    });
    setDialogOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      facultyId: form.facultyId ? Number(form.facultyId) : null,
      divisionId: form.divisionId ? Number(form.divisionId) : null,
      vendorId: form.vendorId ? Number(form.vendorId) : null,
    };

    if (editing) {
      delete payload.password;
      await adminApi.users.update(editing.userId, payload);
    } else {
      await adminApi.users.create(payload);
    }

    setDialogOpen(false);
    await load();
  };

  const approve = async (user, approved) => {
    setError("");

    try {
      await adminApi.users.approve(user.userId, {
        status: approved ? "APPROVED" : "REJECTED",
        rejectionReason: approved ? "" : "Rejected by administrator",
        mainRole: user.mainRole || null,
        subRole: user.subRole || null,
      });
      await load();
    } catch (approvalError) {
      setError(approvalError.message);
    }
  };

  const toggle = async (user) => {
    await adminApi.users.toggle(user.userId);
    await load();
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Admin</div>
          <h1 className="mt-2 text-3xl font-black text-[#10283f]">User Governance</h1>
          <p className="mt-2 text-sm text-slate-600">{page.totalElements} users found across roles and approval states.</p>
        </div>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ textTransform: "none", borderRadius: "14px", bgcolor: "#166e8c" }}>
          Create User
        </Button>
      </section>

      <section className="grid gap-3 rounded-[26px] border border-[#dce8ef] bg-white p-4 shadow-[0_12px_30px_rgba(15,41,64,0.05)] md:grid-cols-3">
        <TextField label="Search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} size="small" />
        <TextField select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} size="small">
          <MenuItem value="">All</MenuItem>
          {statuses.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
        </TextField>
        <TextField select label="Main role" value={filters.mainRole} onChange={(e) => setFilters({ ...filters, mainRole: e.target.value })} size="small">
          <MenuItem value="">All</MenuItem>
          {mainRoles.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
        </TextField>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <section className="overflow-hidden rounded-[30px] border border-[#dce8ef] bg-white shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f5fbff] text-xs uppercase tracking-[0.18em] text-[#166e8c]">
              <tr>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Faculty / Division</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.userId} className="align-top">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[#10283f]">{getFullName(user)}</div>
                    <div className="mt-1 text-slate-500">{user.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-700">{user.mainRole}</div>
                    <div className="mt-1 text-slate-500">{user.subRole || "No sub role"}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{[user.facultyName, user.divisionName].filter(Boolean).join(" / ") || user.vendorName || "Not assigned"}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#edf7fb] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#166e8c]">{user.userStatus}</span>
                    <div className="mt-2 text-xs text-slate-500">{user.active ? "Active" : "Inactive"}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(user)} sx={{ textTransform: "none" }}>Edit</Button>
                      {user.userStatus === "PENDING" ? (
                        <>
                          <Button size="small" startIcon={<CheckRoundedIcon />} onClick={() => approve(user, true)} sx={{ textTransform: "none", color: "#166e8c" }}>Approve</Button>
                          <Button size="small" startIcon={<CloseRoundedIcon />} onClick={() => approve(user, false)} sx={{ textTransform: "none", color: "#b42318" }}>Reject</Button>
                        </>
                      ) : null}
                      <Button size="small" startIcon={<PowerSettingsNewRoundedIcon />} onClick={() => toggle(user)} sx={{ textTransform: "none" }}>Toggle</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>{loading ? "Loading users..." : "No users found."}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Edit User" : "Create User"}</DialogTitle>
        <form onSubmit={submit}>
          <DialogContent className="grid gap-4 md:grid-cols-2">
            <TextField label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            {!editing ? <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /> : null}
            <TextField select label="Main role" value={form.mainRole} onChange={(e) => setForm({ ...form, mainRole: e.target.value })}>
              {mainRoles.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
            </TextField>
            <TextField select label="Sub role" value={form.subRole} onChange={(e) => setForm({ ...form, subRole: e.target.value })}>
              <MenuItem value="">None</MenuItem>
              {subRoles.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
            </TextField>
            <TextField select label="Faculty" value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })}>
              <MenuItem value="">None</MenuItem>
              {faculties.map((faculty) => <MenuItem key={faculty.id} value={faculty.id}>{faculty.facultyName}</MenuItem>)}
            </TextField>
            <TextField select label="Division" value={form.divisionId} onChange={(e) => setForm({ ...form, divisionId: e.target.value })}>
              <MenuItem value="">None</MenuItem>
              {divisions.map((division) => <MenuItem key={division.divisionId} value={division.divisionId}>{division.divisionName}</MenuItem>)}
            </TextField>
            <TextField label="First name" value={form.firstName || ""} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <TextField label="Last name" value={form.lastName || ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <TextField label="Phone" value={form.phoneNumber || ""} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
            <TextField label="Employee ID" value={form.employeeId || ""} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
            <TextField className="md:col-span-2" label="Designation" value={form.designation || ""} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
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
