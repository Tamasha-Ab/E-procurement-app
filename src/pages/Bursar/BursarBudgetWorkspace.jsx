import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useAuth } from "../../contexts/AuthContext";
import { useSearchParams } from "react-router-dom";

const currentYear = new Date().getFullYear();

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const initialBudgetForm = {
  departmentId: "",
  budgetYear: currentYear,
  allocatedAmount: "",
  active: true,
};

const initialAvailableForm = {
  departmentId: "",
  year: currentYear,
};

const getResponseMessage = (body, fallback) =>
  body?.message || body?.error || fallback || "Request failed";

export default function BursarBudgetWorkspace() {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const getInitialPanel = () => {
    const tab = searchParams.get("tab");
    return ["budgets", "available", "approvals"].includes(tab) ? tab : "budgets";
  };
  const [activePanel, setActivePanel] = useState(getInitialPanel);
  const [budgets, setBudgets] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [availableBudget, setAvailableBudget] = useState(null);
  const [budgetForm, setBudgetForm] = useState(initialBudgetForm);
  const [availableForm, setAvailableForm] = useState(initialAvailableForm);
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [actionComment, setActionComment] = useState("");

  const isBursar = user?.mainRole === "FINANCE" && user?.subRole === "BURSAR";

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const requestJson = useCallback(
    async (path, options = {}) => {
      const response = await fetch(path, {
        ...options,
        headers: {
          ...authHeaders,
          ...(options.headers || {}),
        },
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : null;

      if (!response.ok || body?.success === false) {
        throw new Error(getResponseMessage(body, response.statusText));
      }

      return body?.data ?? body;
    },
    [authHeaders]
  );

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const query = yearFilter ? `?year=${yearFilter}` : "";
      const data = await requestJson(`/api/bursar/department-budgets${query}`);
      setBudgets(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }, [requestJson, yearFilter]);

  const loadPendingRequests = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const data = await requestJson("/api/bursar/requisitions/pending-budget-approval");
      setPendingRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }, [requestJson]);

  useEffect(() => {
    if (!isBursar) return;
    loadBudgets();
    loadPendingRequests();
  }, [isBursar, loadBudgets, loadPendingRequests]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (["budgets", "available", "approvals"].includes(tab) && tab !== activePanel) {
      setActivePanel(tab);
    }
  }, [activePanel, searchParams]);

  const changePanel = (panel) => {
    setActivePanel(panel);
    setSearchParams({ tab: panel });
  };

  const handleBudgetSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      await requestJson("/api/bursar/department-budgets", {
        method: "POST",
        body: JSON.stringify({
          departmentId: Number(budgetForm.departmentId),
          budgetYear: Number(budgetForm.budgetYear),
          allocatedAmount: Number(budgetForm.allocatedAmount),
          active: budgetForm.active,
        }),
      });
      setNotice({ type: "success", message: "Annual department budget created." });
      setBudgetForm({ ...initialBudgetForm, budgetYear: Number(budgetForm.budgetYear) });
      await loadBudgets();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAvailableCheck = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice(null);
    setAvailableBudget(null);

    try {
      const query = new URLSearchParams({
        departmentId: availableForm.departmentId,
        year: availableForm.year,
      }).toString();
      const data = await requestJson(`/api/bursar/department-budgets/available?${query}`);
      setAvailableBudget(data);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const openActionDialog = (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    setActionComment(type === "accept" ? "Budget checked and accepted." : "");
  };

  const closeActionDialog = () => {
    setSelectedRequest(null);
    setActionType(null);
    setActionComment("");
  };

  const submitRequestAction = async () => {
    if (!selectedRequest || !actionType) return;
    setLoading(true);
    setNotice(null);

    try {
      const endpoint =
        actionType === "accept"
          ? `/api/bursar/requisitions/${selectedRequest.rrId}/accept`
          : `/api/bursar/requisitions/${selectedRequest.rrId}/reject`;

      await requestJson(endpoint, {
        method: "POST",
        body: JSON.stringify({
          budgetYear: currentYear,
          comment: actionComment,
        }),
      });

      setNotice({
        type: "success",
        message:
          actionType === "accept"
            ? "Requisition accepted and budget reserved."
            : "Requisition rejected.",
      });
      closeActionDialog();
      await loadBudgets();
      await loadPendingRequests();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isBursar) {
    return (
      <Box className="rounded-[28px] border border-[#dce8ef] bg-white p-8 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <Typography className="!text-2xl !font-bold !text-[#10283f]">Bursar Access Required</Typography>
        <Typography className="!mt-3 !text-sm !leading-7 !text-slate-600">
          This workspace is available only for users with main role FINANCE and sub-role BURSAR.
        </Typography>
      </Box>
    );
  }

  const summary = {
    allocations: budgets.length,
    pending: pendingRequests.length,
    reserved: budgets.reduce((total, item) => total + Number(item.reservedAmount || 0), 0),
  };

  return (
    <div className="space-y-7">
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#0f2940,#166e8c)] p-7 text-white shadow-[0_24px_60px_rgba(15,41,64,0.18)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">Bursar Workspace</div>
            <h1 className="mt-3 text-3xl font-black md:text-4xl">Budget control and requisition checks</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-100">
              Manage annual allocations, inspect available balances, and approve only the requisitions that fit within
              departmental budgets.
            </p>
          </div>
          <Button
            variant="contained"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => {
              loadBudgets();
              loadPendingRequests();
            }}
            sx={{
              bgcolor: "#f6c453",
              color: "#0f2940",
              borderRadius: "14px",
              textTransform: "none",
              fontWeight: 800,
              "&:hover": { bgcolor: "#efb93c" },
            }}
          >
            Refresh
          </Button>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <SummaryCard icon={AccountBalanceWalletRoundedIcon} label="Budget Allocations" value={summary.allocations} />
          <SummaryCard icon={AssignmentTurnedInRoundedIcon} label="Pending Checks" value={summary.pending} />
          <SummaryCard icon={CheckCircleRoundedIcon} label="Reserved Funds" value={formatCurrency(summary.reserved)} />
        </div>
      </section>

      {notice && (
        <Alert severity={notice.type} onClose={() => setNotice(null)} sx={{ borderRadius: "16px" }}>
          {notice.message}
        </Alert>
      )}

      <section className="flex flex-wrap gap-3">
        {[
          ["budgets", "Annual Budgets"],
          ["available", "Available Balance"],
          ["approvals", "Pending Approvals"],
        ].map(([key, label]) => (
          <Button
            key={key}
            variant={activePanel === key ? "contained" : "outlined"}
            onClick={() => changePanel(key)}
            sx={{
              borderRadius: "14px",
              textTransform: "none",
              fontWeight: 800,
              borderColor: "#c8dce7",
              bgcolor: activePanel === key ? "#166e8c" : "#fff",
              color: activePanel === key ? "#fff" : "#10283f",
              "&:hover": { bgcolor: activePanel === key ? "#145f79" : "#eef7fb" },
            }}
          >
            {label}
          </Button>
        ))}
      </section>

      {activePanel === "budgets" && (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.35fr]">
          <Panel title="Create Annual Budget" eyebrow="Allocation">
            <Box component="form" className="space-y-4" onSubmit={handleBudgetSubmit}>
              <TextField
                label="Department ID"
                type="number"
                value={budgetForm.departmentId}
                onChange={(event) => setBudgetForm((prev) => ({ ...prev, departmentId: event.target.value }))}
                fullWidth
                required
              />
              <TextField
                label="Budget Year"
                type="number"
                value={budgetForm.budgetYear}
                onChange={(event) => setBudgetForm((prev) => ({ ...prev, budgetYear: event.target.value }))}
                fullWidth
                required
              />
              <TextField
                label="Allocated Amount"
                type="number"
                value={budgetForm.allocatedAmount}
                onChange={(event) => setBudgetForm((prev) => ({ ...prev, allocatedAmount: event.target.value }))}
                fullWidth
                required
              />
              <TextField
                select
                label="Status"
                value={budgetForm.active ? "active" : "inactive"}
                onChange={(event) =>
                  setBudgetForm((prev) => ({ ...prev, active: event.target.value === "active" }))
                }
                fullWidth
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
              <Button type="submit" variant="contained" disabled={loading} fullWidth sx={primaryButtonSx}>
                Create Budget
              </Button>
            </Box>
          </Panel>

          <Panel
            title="Annual Allocations"
            eyebrow="Department Budgets"
            action={
              <TextField
                label="Year"
                type="number"
                size="small"
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
                onBlur={loadBudgets}
                sx={{ width: 130 }}
              />
            }
          >
            <BudgetTable budgets={budgets} loading={loading} />
          </Panel>
        </section>
      )}

      {activePanel === "available" && (
        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.2fr]">
          <Panel title="Check Available Balance" eyebrow="Budget Lookup">
            <Box component="form" className="space-y-4" onSubmit={handleAvailableCheck}>
              <TextField
                label="Department ID"
                type="number"
                value={availableForm.departmentId}
                onChange={(event) => setAvailableForm((prev) => ({ ...prev, departmentId: event.target.value }))}
                fullWidth
                required
              />
              <TextField
                label="Budget Year"
                type="number"
                value={availableForm.year}
                onChange={(event) => setAvailableForm((prev) => ({ ...prev, year: event.target.value }))}
                fullWidth
                required
              />
              <Button type="submit" variant="contained" startIcon={<SearchRoundedIcon />} disabled={loading} fullWidth sx={primaryButtonSx}>
                Check Balance
              </Button>
            </Box>
          </Panel>

          <Panel title="Available Budget" eyebrow="Result">
            {availableBudget ? (
              <div className="grid gap-4 md:grid-cols-2">
                <AmountTile label="Allocated" value={availableBudget.allocatedAmount} />
                <AmountTile label="Reserved" value={availableBudget.reservedAmount} />
                <AmountTile label="Used" value={availableBudget.usedAmount} />
                <AmountTile label="Available" value={availableBudget.availableAmount} accent />
              </div>
            ) : (
              <EmptyState text="Enter a department and year to view the available budget." />
            )}
          </Panel>
        </section>
      )}

      {activePanel === "approvals" && (
        <Panel
          title="Requisitions To Be Approved"
          eyebrow="Bursar Budget Approval Queue"
          action={
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={loadPendingRequests}
              sx={secondaryButtonSx}
            >
              Refresh Queue
            </Button>
          }
        >
          <div className="mb-5 rounded-[24px] bg-[#f5fbff] p-5">
            <div className="text-sm font-semibold text-[#166e8c]">Approval rule</div>
            <div className="mt-2 text-sm leading-7 text-slate-600">
              Accept only when the requisition estimated total amount is within the department's available budget.
              Reject requests with a clear comment when the budget is insufficient or the request needs correction.
            </div>
          </div>
          <div className="space-y-4">
            {pendingRequests.length === 0 && <EmptyState text="No requisitions are waiting for Bursar review." />}
            {pendingRequests.map((request) => (
              <div key={request.rrId} className="rounded-[24px] border border-[#e0ebf1] bg-[#fbfdff] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography className="!text-lg !font-bold !text-[#10283f]">{request.title}</Typography>
                      <Chip label={request.status} size="small" sx={{ bgcolor: "#edf7fb", color: "#166e8c", fontWeight: 700 }} />
                    </div>
                    <Typography className="!mt-2 !text-sm !leading-7 !text-slate-600">
                      {request.departmentName || `Department ${request.departmentId}`} · {request.itemName} · Qty {request.quantity}
                    </Typography>
                  </div>
                  <div className="text-left lg:text-right">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated Total</div>
                    <div className="mt-1 text-2xl font-black text-[#10283f]">
                      {formatCurrency(request.estimatedTotalAmount)}
                    </div>
                  </div>
                </div>

                <Divider sx={{ my: 2.5 }} />

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <Typography className="!text-sm !leading-7 !text-slate-600">
                    RR {request.rrNumber} · Requested by {request.requestedByName || "staff"}
                  </Typography>
                  <div className="flex gap-3">
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<ErrorRoundedIcon />}
                      onClick={() => openActionDialog(request, "reject")}
                      sx={secondaryButtonSx}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<CheckCircleRoundedIcon />}
                      onClick={() => openActionDialog(request, "accept")}
                      sx={primaryButtonSx}
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Dialog open={!!selectedRequest} onClose={closeActionDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {actionType === "accept" ? "Accept requisition" : "Reject requisition"}
        </DialogTitle>
        <DialogContent className="space-y-4">
          <Typography className="!text-sm !leading-7 !text-slate-600">
            {selectedRequest?.title} · {formatCurrency(selectedRequest?.estimatedTotalAmount)}
          </Typography>
          <TextField
            label={actionType === "accept" ? "Comment" : "Rejection comment"}
            value={actionComment}
            onChange={(event) => setActionComment(event.target.value)}
            fullWidth
            required={actionType === "reject"}
            multiline
            minRows={3}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeActionDialog} sx={{ textTransform: "none", fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitRequestAction}
            disabled={loading || (actionType === "reject" && !actionComment.trim())}
            sx={actionType === "accept" ? primaryButtonSx : dangerButtonSx}
          >
            {actionType === "accept" ? "Accept" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>

      {loading && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 rounded-2xl bg-[#10283f] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,41,64,0.22)]">
          <CircularProgress size={18} sx={{ color: "#fff" }} />
          Working
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
        <Icon />
      </div>
      <div className="mt-4 text-2xl font-black">{value}</div>
      <div className="mt-1 text-sm text-slate-200">{label}</div>
    </div>
  );
}

function Panel({ title, eyebrow, action, children }) {
  return (
    <section className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">{eyebrow}</div>
          <h2 className="mt-2 text-2xl font-bold text-[#10283f]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function BudgetTable({ budgets, loading }) {
  if (!loading && budgets.length === 0) {
    return <EmptyState text="No department budgets found for this year." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-left">
        <thead>
          <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
            <th className="px-4 py-2">Department</th>
            <th className="px-4 py-2">Year</th>
            <th className="px-4 py-2">Allocated</th>
            <th className="px-4 py-2">Reserved</th>
            <th className="px-4 py-2">Used</th>
            <th className="px-4 py-2">Available</th>
          </tr>
        </thead>
        <tbody>
          {budgets.map((budget) => (
            <tr key={budget.budgetId} className="rounded-2xl bg-[#f8fbfd] text-sm text-[#10283f]">
              <td className="rounded-l-2xl px-4 py-4 font-semibold">
                {budget.departmentName || `Department ${budget.departmentId}`}
              </td>
              <td className="px-4 py-4">{budget.budgetYear}</td>
              <td className="px-4 py-4">{formatCurrency(budget.allocatedAmount)}</td>
              <td className="px-4 py-4">{formatCurrency(budget.reservedAmount)}</td>
              <td className="px-4 py-4">{formatCurrency(budget.usedAmount)}</td>
              <td className="rounded-r-2xl px-4 py-4 font-black text-[#166e8c]">
                {formatCurrency(budget.availableAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AmountTile({ label, value, accent = false }) {
  return (
    <div className={accent ? "rounded-[24px] bg-[#eaf7f4] p-5" : "rounded-[24px] bg-slate-50 p-5"}>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className={accent ? "mt-3 text-3xl font-black text-[#14745f]" : "mt-3 text-3xl font-black text-[#10283f]"}>
        {formatCurrency(value)}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#c8dce7] bg-[#f8fbfd] p-6 text-sm leading-7 text-slate-600">
      {text}
    </div>
  );
}

const primaryButtonSx = {
  bgcolor: "#166e8c",
  borderRadius: "14px",
  textTransform: "none",
  fontWeight: 800,
  "&:hover": { bgcolor: "#145f79" },
};

const secondaryButtonSx = {
  borderRadius: "14px",
  textTransform: "none",
  fontWeight: 800,
};

const dangerButtonSx = {
  bgcolor: "#b42318",
  borderRadius: "14px",
  textTransform: "none",
  fontWeight: 800,
  "&:hover": { bgcolor: "#991b12" },
};
