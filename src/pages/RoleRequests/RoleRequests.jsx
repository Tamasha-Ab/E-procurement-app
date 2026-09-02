import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  MenuItem,
  TextField,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";

const requestableRoles = [
  { label: "Staff member", mainRole: "FACULTY_STAFF", subRole: "STAFF_MEMBER" },
  { label: "BEC member", mainRole: "FINANCE", subRole: "BEC" },
  { label: "DPC member", mainRole: "DPC", subRole: null },
];

const initialForm = {
  roleKey: "",
  reason: "",
};

const roleKey = (role) => `${role.mainRole || ""}:${role.subRole || ""}`;
const roleLabel = (role) => {
  const match = requestableRoles.find((option) => roleKey(option) === roleKey(role));
  return match?.label || [role.mainRole, role.subRole].filter(Boolean).join(" / ");
};

const canUseRoleFeature = (user) =>
  user?.mainRole !== "ADMIN" && user?.mainRole !== "SUPER_ADMIN" && user?.mainRole !== "VENDOR";

const isStaffDeanDivisionHeadOrVc = (user) =>
  (user?.mainRole === "FACULTY_STAFF" && ["STAFF_MEMBER", "DIVISION_HEAD", "DEAN"].includes(user?.subRole))
  || (user?.mainRole === "UNIVERSITY_EXECUTIVE" && user?.subRole === "VC");

const getRequestableRolesForUser = (user) => {
  if (!canUseRoleFeature(user)) return [];
  if (isStaffDeanDivisionHeadOrVc(user)) return requestableRoles;
  if (user?.mainRole === "FINANCE" && ["BEC", "BEC_HEAD"].includes(user?.subRole)) {
    return requestableRoles.filter((role) =>
      role.mainRole === "DPC"
      || (role.mainRole === "FACULTY_STAFF" && role.subRole === "STAFF_MEMBER")
    );
  }
  return [];
};

const statusColor = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

export default function RoleRequests() {
  const { user, token, refreshCurrentUser } = useAuth();
  const isAdmin = user?.mainRole === "ADMIN" || user?.mainRole === "SUPER_ADMIN";
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [statusFilter, setStatusFilter] = useState(isAdmin ? "PENDING" : "");
  const [decisionRemarks, setDecisionRemarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const assignedRoleKeys = useMemo(
    () => new Set((user?.roles || []).map(roleKey)),
    [user?.roles]
  );
  const roleOptionsForUser = useMemo(() => getRequestableRolesForUser(user), [user]);
  const availableRoles = roleOptionsForUser.filter((role) => !assignedRoleKeys.has(roleKey(role)));
  const selectedRoleKey = availableRoles.some((role) => roleKey(role) === form.roleKey)
    ? form.roleKey
    : roleKey(availableRoles[0] || {});

  const apiRequest = async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
    });
    const text = await response.text().catch(() => "");
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(body?.message || body?.error || text || "Request failed");
    }
    return body?.data ?? body;
  };

  const loadRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const path = isAdmin
        ? `/api/admin/role-requests${statusFilter ? `?status=${statusFilter}` : ""}`
        : "/api/role-requests/my";
      const nextRequests = await apiRequest(path);
      setRequests(nextRequests);
      if (!isAdmin && nextRequests.some((request) => request.status === "APPROVED")) {
        await refreshCurrentUser();
      }
    } catch (loadError) {
      setError(loadError.message || "Could not load role requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [isAdmin, statusFilter]);

  const submitRequest = async (event) => {
    event.preventDefault();
    setError("");
    const selectedRole = availableRoles.find((role) => roleKey(role) === selectedRoleKey);
    if (!selectedRole) {
      setError("No role is available to request from your current login role.");
      toast.warning("No role is available to request from your current login role.", { autoClose: 4500 });
      return;
    }

    const payload = {
      mainRole: selectedRole?.mainRole,
      subRole: selectedRole?.subRole || null,
      reason: form.reason,
    };

    try {
      await apiRequest("/api/role-requests", { method: "POST", body: payload });
      toast.success("Role request submitted for admin approval.", { autoClose: 4500 });
      setForm({ ...initialForm, roleKey: roleKey(availableRoles[0] || {}) });
      await loadRequests();
    } catch (submitError) {
      const errorMessage = submitError.message || "Could not submit role request.";
      setError(errorMessage);
      toast.error(errorMessage, { autoClose: 5000 });
    }
  };

  const reviewRequest = async (request, approved) => {
    setError("");
    try {
      await apiRequest(`/api/admin/role-requests/${request.roleRequestId}/${approved ? "approve" : "reject"}`, {
        method: "PATCH",
        body: { decisionRemarks: decisionRemarks[request.roleRequestId] || "" },
      });
      toast.success(approved ? "Role request approved." : "Role request rejected.", { autoClose: 4500 });
      await loadRequests();
    } catch (reviewError) {
      const errorMessage = reviewError.message || "Could not review role request.";
      setError(errorMessage);
      toast.error(errorMessage, { autoClose: 5000 });
    }
  };

  useEffect(() => {
    if (!availableRoles.length) {
      return;
    }
    if (!availableRoles.some((role) => roleKey(role) === form.roleKey)) {
      setForm((current) => ({ ...current, roleKey: roleKey(availableRoles[0]) }));
    }
  }, [availableRoles, form.roleKey]);

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">
          {isAdmin ? "Admin" : "Access"}
        </div>
        <h1 className="mt-2 text-3xl font-black text-[#10283f]">
          {isAdmin ? "Role Requests" : "Request Another Role"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isAdmin
            ? "Review user requests and approve roles that should be added to their switch list."
            : "Submit a request for another internal role. After admin approval, it appears in your role switcher."}
        </p>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {!isAdmin ? (
        canUseRoleFeature(user) ? (
        <form onSubmit={submitRequest} className="grid gap-4 rounded-[26px] border border-[#dce8ef] bg-white p-5 shadow-[0_12px_30px_rgba(15,41,64,0.05)] md:grid-cols-2">
          <TextField
            select
            label="Requested role"
            value={selectedRoleKey}
            onChange={(event) => setForm({ ...form, roleKey: event.target.value })}
            disabled={!availableRoles.length}
          >
            {availableRoles.map((role) => (
              <MenuItem key={roleKey(role)} value={roleKey(role)}>
                {role.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            className="md:col-span-1"
            label="Reason"
            value={form.reason}
            onChange={(event) => setForm({ ...form, reason: event.target.value })}
            multiline
            minRows={3}
          />
          <Button type="submit" variant="contained" startIcon={<AddRoundedIcon />} disabled={!availableRoles.length} sx={{ textTransform: "none", bgcolor: "#166e8c" }}>
            {roleOptionsForUser.length ? (availableRoles.length ? "Submit Request" : "All requestable roles assigned") : "No role requests available"}
          </Button>
        </form>
        ) : (
          <div className="rounded-[26px] border border-slate-200 bg-white p-5 text-sm text-slate-600">
            Role switching is not available for this account type.
          </div>
        )
      ) : (
        <section className="rounded-[26px] border border-[#dce8ef] bg-white p-4 shadow-[0_12px_30px_rgba(15,41,64,0.05)]">
          <TextField select label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} size="small">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
          </TextField>
        </section>
      )}

      <section className="overflow-hidden rounded-[30px] border border-[#dce8ef] bg-white shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f5fbff] text-xs uppercase tracking-[0.18em] text-[#166e8c]">
              <tr>
                {isAdmin ? <th className="px-5 py-4">User</th> : null}
                <th className="px-5 py-4">Requested role</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Reason</th>
                {isAdmin ? <th className="px-5 py-4">Review</th> : <th className="px-5 py-4">Decision</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((request) => (
                <tr key={request.roleRequestId} className="align-top">
                  {isAdmin ? (
                    <td className="px-5 py-4">
                      <div className="font-semibold text-[#10283f]">{request.requesterName}</div>
                      <div className="mt-1 text-slate-500">{request.requesterEmail}</div>
                    </td>
                  ) : null}
                  <td className="px-5 py-4 font-semibold text-slate-700">{roleLabel(request)}</td>
                  <td className="px-5 py-4">
                    <Chip label={request.status} color={statusColor[request.status] || "default"} size="small" />
                  </td>
                  <td className="px-5 py-4 text-slate-600">{request.requestReason || "No reason provided"}</td>
                  <td className="px-5 py-4">
                    {isAdmin && request.status === "PENDING" ? (
                      <div className="min-w-[260px] space-y-3">
                        <TextField
                          label="Decision remarks"
                          size="small"
                          fullWidth
                          value={decisionRemarks[request.roleRequestId] || ""}
                          onChange={(event) => setDecisionRemarks({
                            ...decisionRemarks,
                            [request.roleRequestId]: event.target.value,
                          })}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button size="small" startIcon={<CheckRoundedIcon />} onClick={() => reviewRequest(request, true)} sx={{ textTransform: "none", color: "#166e8c" }}>
                            Approve
                          </Button>
                          <Button size="small" startIcon={<CloseRoundedIcon />} onClick={() => reviewRequest(request, false)} sx={{ textTransform: "none", color: "#b42318" }}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-600">{request.decisionRemarks || "No remarks"}</div>
                    )}
                  </td>
                </tr>
              ))}
              {!requests.length ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={isAdmin ? 5 : 4}>
                    {loading ? "Loading role requests..." : "No role requests found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
