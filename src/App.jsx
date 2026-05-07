import React, { useMemo, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Dialog,
  DialogContent,
} from "@mui/material";
import { Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login/Login.jsx";
import Register from "./pages/Register/Register.jsx";
import ResetPassword from "./pages/ResetPassword/ResetPassword.jsx";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard/dashboard.jsx";
import BursarBudgetWorkspace from "./pages/Bursar/BursarBudgetWorkspace.jsx";
import BursarAuditTrail from "./pages/Bursar/BursarAuditTrail.jsx";
import AdminDashboard from "./pages/Admin/AdminDashboard.jsx";
import AdminUsers from "./pages/Admin/AdminUsers.jsx";
import AdminFaculties from "./pages/Admin/AdminFaculties.jsx";
import AdminDepartments from "./pages/Admin/AdminDepartments.jsx";
import VendorDashboard from "./pages/Vendor/VendorDashboard.jsx";
import { useAuth } from "./contexts/AuthContext";
import CreateRequisition from "./pages/Staff/CreateRequisition.jsx";
import MyRequisitions from "./pages/Staff/MyRequisitions.jsx";
import RequisitionDetails from "./pages/Staff/RequisitionDetails.jsx";
import HodApprovals from "./pages/Approvals/HodApprovals.jsx";
import DeanApprovals from "./pages/Approvals/DeanApprovals.jsx";
import TecApprovals from "./pages/Approvals/TecApprovals.jsx";
import VcApprovals from "./pages/Approvals/VcApprovals.jsx";
import ProcurementWorkspace from "./pages/Procurement/ProcurementWorkspace.jsx";

const roleCards = [
  {
    title: "Staff Requests",
    text: "Create requisitions, attach item details, and track the approval journey from department to payment.",
  },
  {
    title: "Approval Workflow",
    text: "Move requests through HOD, Dean, TEC, VC, and Bursar with full traceability and audit visibility.",
  },
  {
    title: "Procurement Control",
    text: "Handle supplier quotations, purchase orders, GRN records, and payment readiness in one secure platform.",
  },
];

function LandingPage({ onOpenLogin, onOpenRegister }) {
  return (
    <Box className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(27,94,123,0.16),_transparent_42%),linear-gradient(180deg,#f8fcff_0%,#edf4f8_100%)]">
      <Box className="absolute inset-x-0 top-0 h-64 bg-[linear-gradient(135deg,rgba(9,44,66,0.82),rgba(22,110,140,0.62))]" />

      <Container maxWidth="lg" className="relative z-10 px-6 py-8 md:py-10">
        <Box className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Box className="flex items-center gap-4">
            <img
              src="/Images/Logo/Astraea_Logo-removebg-preview.png"
              alt="Astraea Logo"
              className="object-contain h-16 md:h-20 drop-shadow-[0_12px_30px_rgba(9,44,66,0.3)]"
            />
            <Box>
              <Typography className="!text-xs !font-semibold !tracking-[0.28em] !text-white/75">
                ASTRAEA UNIVERSITY
              </Typography>
              <Typography className="!text-2xl !font-bold !text-white md:!text-3xl">
                E-Procurement System
              </Typography>
            </Box>
          </Box>

          <Box className="flex gap-3">
            <Button
              variant="outlined"
              onClick={onOpenLogin}
              sx={{
                borderColor: "rgba(255,255,255,0.55)",
                color: "#fff",
                px: 3,
                py: 1.2,
                borderRadius: "999px",
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Login
            </Button>
            <Button
              variant="contained"
              onClick={onOpenRegister}
              sx={{
                backgroundColor: "#f6c453",
                color: "#0f2940",
                px: 3,
                py: 1.2,
                borderRadius: "999px",
                textTransform: "none",
                fontWeight: 800,
                boxShadow: "0 16px 30px rgba(15, 41, 64, 0.2)",
                "&:hover": { backgroundColor: "#f0b93a" },
              }}
            >
              Sign Up
            </Button>
          </Box>
        </Box>

        <Box className="grid items-center gap-10 pt-10 pb-10 md:grid-cols-[1.25fr_0.95fr] md:pt-14">
          <Box className="max-w-3xl">
            <Typography className="!mb-4 !text-sm !font-semibold !uppercase !tracking-[0.3em] !text-white/80">
              Transparent. Accountable. Fast.
            </Typography>
            <Typography className="!mt-20 !text-4xl !font-black !leading-tight !text-[#166e8c] md:!mt-24 md:!text-6xl">
              Procurement built for university approvals, budgets, and supplier trust.
            </Typography>
            <Typography className="!mt-6 !max-w-2xl !text-base !leading-8 !text-green-900 md:!text-lg">
              Astraea connects requisition requests, institutional approvals, vendor quotations, purchase orders,
              goods receiving, and payment readiness in one secure workflow.
            </Typography>

            <Box className="flex flex-col gap-4 mt-8 sm:flex-row">
              <Button
                variant="contained"
                onClick={onOpenLogin}
                sx={{
                  backgroundColor: "#166e8c",
                  px: 3.2,
                  py: 1.5,
                  borderRadius: "18px",
                  textTransform: "none",
                  fontWeight: 700,
                  boxShadow: "0 18px 36px rgba(8, 54, 82, 0.28)",
                  "&:hover": { backgroundColor: "#145f79" },
                }}
              >
                Access Dashboard
              </Button>
              <Button
                variant="text"
                onClick={onOpenRegister}
                sx={{
                  color: "#f6c453",
                  px: 1,
                  textTransform: "none",
                  fontWeight: 700,
                  justifyContent: "flex-start",
                }}
              >
                Create your account
              </Button>
            </Box>
          </Box>

          <Box className="overflow-hidden rounded-[30px] bg-transparent shadow-[0_34px_80px_rgba(11,33,51,0.26)]">
            <img
              src="/Images/Design.png"
              alt="Astraea procurement workflow design"
              className="h-[520px] w-full rounded-[30px] object-cover object-center md:h-[620px]"
            />
          </Box>
        </Box>
      </Container>

      <Container maxWidth="lg" className="relative z-10 px-6 pb-16">
        <Box className="grid gap-5 md:grid-cols-3">
          {roleCards.map((card) => (
            <Box
              key={card.title}
              className="rounded-[28px] border border-[#d9e6ee] bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,41,64,0.08)]"
            >
              <Typography className="!text-xl !font-bold !text-[#10283f]">{card.title}</Typography>
              <Typography className="!mt-3 !text-sm !leading-7 !text-slate-600">{card.text}</Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

const App = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [openLogin, setOpenLogin] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);
  const isResetPasswordPage = location.pathname === "/reset-password";
  const dashboardElement = user?.mainRole === "ADMIN"
    ? <AdminDashboard />
    : user?.mainRole === "VENDOR"
      ? <VendorDashboard />
      : <Dashboard />;

  const landing = useMemo(
    () => (
      <LandingPage
        onOpenLogin={() => setOpenLogin(true)}
        onOpenRegister={() => setOpenRegister(true)}
      />
    ),
    []
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {isResetPasswordPage ? (
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      ) : isAuthenticated ? (
        <Layout>
          <Routes>
            <Route path="/" element={dashboardElement} />
            <Route path="/dashboard" element={dashboardElement} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bursar/budgets" element={<BursarBudgetWorkspace />} />
            <Route path="/bursar/audit-trail" element={<BursarAuditTrail />} />
            <Route path="/requisition/create" element={<CreateRequisition />} />
            <Route path="/requisitions" element={<MyRequisitions />} />
            <Route path="/requisitions/:rrId" element={<RequisitionDetails />} />
            <Route path="/approvals/hod" element={<HodApprovals />} />
            <Route path="/approvals/dean" element={<DeanApprovals />} />
            <Route path="/approvals/tec" element={<TecApprovals />} />
            <Route path="/approvals/vc" element={<VcApprovals />} />
            <Route path="/procurement/tenders" element={<ProcurementWorkspace />} />
            <Route path="/vendor/tenders" element={<ProcurementWorkspace />} />
            <Route path="*" element={<Dashboard />} />
            <Route path="/" element={user?.mainRole === "ADMIN" ? <AdminDashboard /> : <Dashboard />} />
            <Route path="/dashboard" element={user?.mainRole === "ADMIN" ? <AdminDashboard /> : <Dashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/faculties" element={<AdminFaculties />} />
            <Route path="/admin/departments" element={<AdminDepartments />} />
            <Route path="/vendor/opportunities" element={<ProcurementWorkspace />} />
            <Route path="/vendor/submissions" element={<ProcurementWorkspace />} />
            <Route path="/vendor/purchase-orders" element={<ProcurementWorkspace />} />
            <Route path="*" element={dashboardElement} />
          </Routes>
        </Layout>
      ) : (
        <>
          <Dialog
            open={openLogin}
            onClose={() => setOpenLogin(false)}
            fullWidth
            maxWidth="sm"
            PaperProps={{
              sx: {
                borderRadius: "30px",
                overflow: "hidden",
                background: "linear-gradient(180deg, #ffffff 0%, #f6fbff 100%)",
                boxShadow: "0 32px 90px rgba(15, 41, 64, 0.28)",
              },
            }}
          >
            <DialogContent
              dividers
              sx={{
                p: 0,
                borderColor: "rgba(15, 41, 64, 0.08)",
                background: "transparent",
              }}
            >
              <Login
                onClose={() => setOpenLogin(false)}
                openRegister={() => {
                  setOpenLogin(false);
                  setOpenRegister(true);
                }}
              />
            </DialogContent>
          </Dialog>

          <Dialog
            open={openRegister}
            onClose={() => setOpenRegister(false)}
            fullWidth
            maxWidth="sm"
            PaperProps={{
              sx: {
                borderRadius: "30px",
                overflow: "hidden",
                background: "linear-gradient(180deg, #ffffff 0%, #f6fbff 100%)",
                boxShadow: "0 32px 90px rgba(15, 41, 64, 0.28)",
              },
            }}
          >
            <DialogContent
              dividers
              sx={{
                p: 0,
                borderColor: "rgba(15, 41, 64, 0.08)",
                background: "transparent",
              }}
            >
              <Register
                onClose={() => setOpenRegister(false)}
                openLogin={() => {
                  setOpenRegister(false);
                  setOpenLogin(true);
                }}
              />
            </DialogContent>
          </Dialog>

          <Routes>
            <Route path="/" element={landing} />
            <Route path="/dashboard" element={landing} />
            <Route path="*" element={landing} />
          </Routes>
        </>
      )}
    </Box>
  );
};

export default App;
