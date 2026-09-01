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
import { useLocation } from "react-router-dom";
import { adminApi } from "../../api/adminApi";

const mainRoles = ["ADMIN", "UNIVERSITY_EXECUTIVE", "FACULTY_STAFF", "FINANCE", "DPC"];
const subRolesByMainRole = {
  UNIVERSITY_EXECUTIVE: ["VC"],
  FACULTY_STAFF: ["DIVISION_HEAD", "DEAN", "STAFF_MEMBER", "TEC"],
  FINANCE: [
    "PROCUREMENT_OFFICER",
    "FINANCE_OFFICER",
    "SENIOR_ASSISTANT_BURSAR",
    "ASSISTANT_BURSAR",
    "BURSAR",
    "BEC",
    "BEC_HEAD",
  ],
};
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
  roles: [],
};

const getFullName = (user) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Unnamed user";

const roleKey = (role) => `${role.mainRole || ""}:${role.subRole || ""}`;

const buildRole = (mainRole, subRole) => ({
  mainRole,
  subRole: subRole || null,
});

const normalizeRoles = (mainRole, subRole, roles = []) => {
  const nextSubRoles = subRolesByMainRole[mainRole] || [];
  const activeRole = buildRole(mainRole, nextSubRoles.length ? subRole : null);
  const byKey = new Map([[roleKey(activeRole), activeRole]]);

  roles
    .filter((role) => role?.mainRole && role.mainRole !== "VENDOR")
    .forEach((role) => {
      const allowedSubRoles = subRolesByMainRole[role.mainRole] || [];
      const normalizedRole = buildRole(role.mainRole, allowedSubRoles.length ? role.subRole : null);
      if (!allowedSubRoles.length || normalizedRole.subRole) {
        byKey.set(roleKey(normalizedRole), normalizedRole);
      }
    });

  return [...byKey.values()];
};

export default function AdminUsers() {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState({ number: 0, totalPages: 1, totalElements: 0 });
  const [faculties, setFaculties] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [filters, setFilters] = useState(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "",
      mainRole: searchParams.get("mainRole") || "",
    };
  });
  const [form, setForm] = useState(initialForm);
  const [becApprovalUser, setBecApprovalUser] = useState(null);
  const [becApprovalSubRole, setBecApprovalSubRole] = useState("BEC");
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const subRoleOptions = subRolesByMainRole[form.mainRole] || [];
  const isUniversityExecutive = form.mainRole === "UNIVERSITY_EXECUTIVE";

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
      const nonVendorUsers = (userPage.content || []).filter((user) => user.mainRole !== "VENDOR");
      setUsers(nonVendorUsers);
      setPage({
        number: userPage.number || 0,
        totalPages: userPage.totalPages || 1,
        totalElements: nonVendorUsers.length,
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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    setFilters({
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "",
      mainRole: searchParams.get("mainRole") || "",
    });
    setPage((current) => ({ ...current, number: 0 }));
  }, [location.search]);

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
      roles: normalizeRoles(user.mainRole, user.subRole, user.roles || []),
    });
    setDialogOpen(true);
  };

  const updateMainRole = (mainRole) => {
    const nextSubRoles = subRolesByMainRole[mainRole] || [];
    setForm((current) => ({
      ...current,
      mainRole,
      subRole: nextSubRoles.length === 1 ? nextSubRoles[0] : "",
      facultyId: mainRole === "UNIVERSITY_EXECUTIVE" ? "" : current.facultyId,
      divisionId: mainRole === "UNIVERSITY_EXECUTIVE" ? "" : current.divisionId,
      roles: normalizeRoles(mainRole, nextSubRoles.length === 1 ? nextSubRoles[0] : "", current.roles),
    }));
  };

  const addAssignedRole = () => {
    setForm((current) => ({
      ...current,
      roles: [...(current.roles || []), buildRole("FACULTY_STAFF", "STAFF_MEMBER")],
    }));
  };

  const updateAssignedRole = (index, field, value) => {
    setForm((current) => {
      const roles = [...(current.roles || [])];
      const nextRole = { ...roles[index], [field]: value };
      if (field === "mainRole") {
        const allowedSubRoles = subRolesByMainRole[value] || [];
        nextRole.subRole = allowedSubRoles.length === 1 ? allowedSubRoles[0] : "";
      }
      roles[index] = nextRole;
      return { ...current, roles };
    });
  };

  const removeAssignedRole = (index) => {
    setForm((current) => ({
      ...current,
      roles: (current.roles || []).filter((_, roleIndex) => roleIndex !== index),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const nextSubRoles = subRolesByMainRole[form.mainRole] || [];
    const payload = {
      ...form,
      subRole: nextSubRoles.length ? form.subRole : null,
      facultyId: isUniversityExecutive ? null : form.facultyId ? Number(form.facultyId) : null,
      divisionId: isUniversityExecutive ? null : form.divisionId ? Number(form.divisionId) : null,
      vendorId: form.vendorId ? Number(form.vendorId) : null,
      roles: normalizeRoles(form.mainRole, form.subRole, form.roles),
    };

    try {
      if (editing) {
        delete payload.password;
        await adminApi.users.update(editing.userId, payload);
      } else {
        await adminApi.users.create(payload);
      }

      setDialogOpen(false);
      await load();
    } catch (submitError) {
      setError(submitError.message || "Could not save user.");
    }
  };

  const approve = async (user, approved, subRoleOverride = null) => {
    setError("");

    try {
      await adminApi.users.approve(user.userId, {
        status: approved ? "APPROVED" : "REJECTED",
        rejectionReason: approved ? "" : "Rejected by administrator",
        mainRole: user.mainRole || null,
        subRole: subRoleOverride || user.subRole || null,
      });
      setBecApprovalUser(null);
      await load();
    } catch (approvalError) {
      setError(approvalError.message);
    }
  };

  const openBecApproval = (user) => {
    setBecApprovalUser(user);
    setBecApprovalSubRole(user.subRole === "BEC_HEAD" ? "BEC_HEAD" : "BEC");
  };

  const confirmBecApproval = () => {
    if (!becApprovalUser) return;
    approve(becApprovalUser, true, becApprovalSubRole);
  };

  const promoteBecHead = async (user) => {
    setError("");
    try {
      await adminApi.users.update(user.userId, {
        ...user,
        mainRole: "FINANCE",
        subRole: "BEC_HEAD",
        facultyId: user.facultyId || null,
        divisionId: user.divisionId || null,
        vendorId: user.vendorId || null,
        roles: normalizeRoles("FINANCE", "BEC_HEAD", user.roles || []),
      });
      await load();
    } catch (promotionError) {
      setError(promotionError.message || "Could not assign BEC Head role.");
    }
  };

  const removeBecHead = async (user) => {
    setError("");
    try {
      await adminApi.users.update(user.userId, {
        ...user,
        mainRole: "FINANCE",
        subRole: "BEC",
        facultyId: user.facultyId || null,
        divisionId: user.divisionId || null,
        vendorId: user.vendorId || null,
        roles: normalizeRoles("FINANCE", "BEC", user.roles || []),
      });
      await load();
    } catch (removeError) {
      setError(removeError.message || "Could not remove BEC Head role.");
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
                    <div className="flex flex-wrap items-center gap-2 font-semibold text-[#10283f]">
                      <span>{getFullName(user)}</span>
                      {user.subRole === "BEC_HEAD" ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Head</span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-slate-500">{user.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-700">{user.mainRole}</div>
                    <div className="mt-1 text-slate-500">{user.subRole || "No sub role"}</div>
                    {(user.roles || []).length > 1 ? (
                      <div className="mt-2 text-xs font-semibold text-[#166e8c]">
                        {(user.roles || []).length} assigned roles
                      </div>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {[user.facultyName, user.divisionName].filter(Boolean).join(" / ") || "Not assigned"}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#edf7fb] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#166e8c]">{user.userStatus}</span>
                    <div className="mt-2 text-xs text-slate-500">{user.active ? "Active" : "Inactive"}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(user)} sx={{ textTransform: "none" }}>Edit</Button>
                      {user.userStatus === "PENDING" ? (
                        <>
                          <Button size="small" startIcon={<CheckRoundedIcon />} onClick={() => user.mainRole === "FINANCE" && user.subRole === "BEC" ? openBecApproval(user) : approve(user, true)} sx={{ textTransform: "none", color: "#166e8c" }}>Approve</Button>
                          <Button size="small" startIcon={<CloseRoundedIcon />} onClick={() => approve(user, false)} sx={{ textTransform: "none", color: "#b42318" }}>Reject</Button>
                        </>
                      ) : null}
                      {user.userStatus === "APPROVED" && user.mainRole === "FINANCE" && user.subRole === "BEC" ? (
                        <Button size="small" startIcon={<CheckRoundedIcon />} onClick={() => promoteBecHead(user)} sx={{ textTransform: "none", color: "#b47a00" }}>Make Head</Button>
                      ) : null}
                      {user.userStatus === "APPROVED" && user.mainRole === "FINANCE" && user.subRole === "BEC_HEAD" ? (
                        <Button size="small" startIcon={<CloseRoundedIcon />} onClick={() => removeBecHead(user)} sx={{ textTransform: "none", color: "#b42318" }}>Remove Head</Button>
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
            <TextField select label="Main role" value={form.mainRole} onChange={(e) => updateMainRole(e.target.value)}>
              {mainRoles.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
            </TextField>
            <TextField select label="Sub role" value={form.subRole} onChange={(e) => setForm({ ...form, subRole: e.target.value })} disabled={!subRoleOptions.length}>
              <MenuItem value="">None</MenuItem>
              {subRoleOptions.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
            </TextField>
            <div className="md:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-[#10283f]">Assigned roles</div>
                  <div className="text-xs text-slate-500">Vendor role is not included in role switching.</div>
                </div>
                <Button size="small" startIcon={<AddRoundedIcon />} onClick={addAssignedRole} sx={{ textTransform: "none" }}>
                  Add Role
                </Button>
              </div>
              <div className="space-y-3">
                {(form.roles || []).map((role, index) => {
                  const assignedSubRoleOptions = subRolesByMainRole[role.mainRole] || [];
                  const isActiveRole = roleKey(role) === roleKey(buildRole(form.mainRole, form.subRole));

                  return (
                    <div key={`${roleKey(role)}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-3 md:grid-cols-[1fr_1fr_auto]">
                      <TextField select label="Main role" value={role.mainRole || ""} onChange={(e) => updateAssignedRole(index, "mainRole", e.target.value)} size="small">
                        {mainRoles.map((mainRole) => <MenuItem key={mainRole} value={mainRole}>{mainRole}</MenuItem>)}
                      </TextField>
                      <TextField
                        select
                        label="Sub role"
                        value={role.subRole || ""}
                        onChange={(e) => updateAssignedRole(index, "subRole", e.target.value)}
                        size="small"
                        disabled={!assignedSubRoleOptions.length}
                      >
                        <MenuItem value="">None</MenuItem>
                        {assignedSubRoleOptions.map((subRole) => <MenuItem key={subRole} value={subRole}>{subRole}</MenuItem>)}
                      </TextField>
                      <Button
                        onClick={() => removeAssignedRole(index)}
                        disabled={isActiveRole}
                        startIcon={<CloseRoundedIcon />}
                        sx={{ textTransform: "none", justifySelf: "start" }}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
            <TextField select label="Faculty" value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })} disabled={isUniversityExecutive}>
              <MenuItem value="">None</MenuItem>
              {faculties.map((faculty) => <MenuItem key={faculty.id} value={faculty.id}>{faculty.facultyName}</MenuItem>)}
            </TextField>
            <TextField select label="Division" value={form.divisionId} onChange={(e) => setForm({ ...form, divisionId: e.target.value })} disabled={isUniversityExecutive}>
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

      <Dialog open={Boolean(becApprovalUser)} onClose={() => setBecApprovalUser(null)} fullWidth maxWidth="xs">
        <DialogTitle>Approve BEC User</DialogTitle>
        <DialogContent className="space-y-4">
          <div className="text-sm leading-6 text-slate-600">
            Select whether {becApprovalUser ? getFullName(becApprovalUser) : "this user"} should be approved as a normal BEC member or BEC Head.
          </div>
          <TextField
            select
            label="BEC role"
            value={becApprovalSubRole}
            onChange={(event) => setBecApprovalSubRole(event.target.value)}
            fullWidth
          >
            <MenuItem value="BEC">BEC member</MenuItem>
            <MenuItem value="BEC_HEAD">BEC Head</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setBecApprovalUser(null)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" onClick={confirmBecApproval} sx={{ textTransform: "none", bgcolor: "#166e8c" }}>Approve</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
