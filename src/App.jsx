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
import FinanceCategoryRrDetails from "./pages/Bursar/FinanceCategoryRrDetails.jsx";
import ReceivedRrLists from "./pages/Bursar/ReceivedRrLists.jsx";
import BursarTenderWorkspace from "./pages/Bursar/BursarTenderWorkspace.jsx";
import BursarAuditTrail from "./pages/Bursar/BursarAuditTrail.jsx";
import AdminDashboard from "./pages/Admin/AdminDashboard.jsx";
import AdminAuditTrail from "./pages/Admin/AdminAuditTrail.jsx";
import AdminUsers from "./pages/Admin/AdminUsers.jsx";
import AdminFaculties from "./pages/Admin/AdminFaculties.jsx";
import AdminDepartments from "./pages/Admin/AdminDepartments.jsx";
import DpcDashboard from "./pages/Dpc/DpcDashboard.jsx";
import DpcVendorWorkspace from "./pages/Dpc/DpcVendorWorkspace.jsx";
import DpcAuditTrail from "./pages/Dpc/DpcAuditTrail.jsx";
import VendorDashboard from "./pages/Vendor/VendorDashboard.jsx";
import VendorQuotations from "./pages/Vendor/VendorQuotations.jsx";
import VendorObjections from "./pages/Vendor/VendorObjections.jsx";
import VendorRfqDocument from "./pages/Vendor/VendorRfqDocument.jsx";
import VendorPurchaseOrderDetails from "./pages/Vendor/VendorPurchaseOrderDetails.jsx";
import VendorRfqInvitations from "./pages/Vendor/VendorRfqInvitations.jsx";
import VendorQuotationSubmission from "./pages/Vendor/VendorQuotationSubmission.jsx";
import { useAuth } from "./contexts/AuthContext";
import CreateRequisition from "./pages/Staff/CreateRequisition.jsx";
import MyRequisitions from "./pages/Staff/MyRequisitions.jsx";
import StaffAuditTrail from "./pages/Staff/StaffAuditTrail.jsx";
import RequisitionDetails from "./pages/Staff/RequisitionDetails.jsx";
import HodApprovals from "./pages/Approvals/HodApprovals.jsx";
import DeanApprovals from "./pages/Approvals/DeanApprovals.jsx";
import VcApprovals from "./pages/Approvals/VcApprovals.jsx";
import BecApprovals from "./pages/Approvals/BecApprovals.jsx";
import BecCategoryList from "./pages/Approvals/BecCategoryList.jsx";
import BecVendorReview from "./pages/Approvals/BecVendorReview.jsx";
import BecCategoryAssignment from "./pages/Approvals/BecCategoryAssignment.jsx";
import BecAssignedQuotations from "./pages/Approvals/BecAssignedQuotations.jsx";
import BecFinalVendorList from "./pages/Approvals/BecFinalVendorList.jsx";
import BecSelectedVendors from "./pages/Approvals/BecSelectedVendors.jsx";
import QuotationAuthorityApprovals from "./pages/Approvals/QuotationAuthorityApprovals.jsx";
import BecAuditTrail from "./pages/Approvals/BecAuditTrail.jsx";
import HodAuditTrail from "./pages/Approvals/HodAuditTrail.jsx";
import TecApprovals from "./pages/Approvals/TecApprovals.jsx";
import TecAuditTrail from "./pages/Approvals/TecAuditTrail.jsx";
import ProcurementWorkspace from "./pages/Procurement/ProcurementWorkspace.jsx";
import ProcurementRfqList from "./pages/Procurement/ProcurementRfqList.jsx";
import NotificationsPage from "./pages/Notifications/NotificationsPage.jsx";
import TenderDirectory from "./pages/Tenders/TenderDirectory.jsx";
import RoleRequests from "./pages/RoleRequests/RoleRequests.jsx";

const roleCards = [
  {
    title: "Staff Requests",
    text: "Create requisitions, attach item details, and track the approval journey from division to payment.",
  },
  {
    title: "Approval Workflow",
    text: "Move requests through Division Head, TEC, and Bursar with full traceability and audit visibility.",
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
  const [registerDialogSize, setRegisterDialogSize] = useState("sm");
  const isResetPasswordPage = location.pathname === "/reset-password";
  const dashboardElement = user?.mainRole === "ADMIN"
    ? <AdminDashboard />
    : user?.mainRole === "DPC"
      ? <DpcDashboard />
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
            <Route path="/bursar/budgets" element={<BursarBudgetWorkspace />} />
            <Route path="/finance/category-rr/:rrId" element={<FinanceCategoryRrDetails />} />
            <Route path="/finance/received-rr-lists" element={<ReceivedRrLists />} />
            <Route path="/bursar/create-rfq" element={<BursarTenderWorkspace />} />
            <Route path="/bursar/audit-trail" element={<BursarAuditTrail />} />
            <Route path="/finance/audit-trail" element={<BursarAuditTrail />} />
            <Route path="/requisition/create" element={<CreateRequisition />} />
            <Route path="/requisition/create/:rrId" element={<CreateRequisition />} />
            <Route path="/requisitions" element={<MyRequisitions />} />
            <Route path="/staff/audit-trail" element={<StaffAuditTrail />} />
            <Route path="/requisitions/:rrId" element={<RequisitionDetails />} />
            <Route path="/approvals/hod" element={<HodApprovals />} />
            <Route path="/approvals/hod/:rrId" element={<HodApprovals />} />
            <Route path="/approvals/dean" element={<DeanApprovals />} />
            <Route path="/approvals/dean/:rrId" element={<DeanApprovals />} />
            <Route path="/approvals/vc" element={<VcApprovals />} />
            <Route path="/approvals/vc/:rrId" element={<VcApprovals />} />
            <Route path="/approvals/quotation-authority" element={<QuotationAuthorityApprovals />} />
            <Route path="/approvals/bec" element={<BecApprovals />} />
            <Route path="/approvals/bec/:rrId" element={<BecApprovals />} />
            <Route path="/approvals/bec/quotations" element={<ProcurementWorkspace />} />
            <Route path="/approvals/bec/category-assignment" element={<BecCategoryAssignment />} />
            <Route path="/approvals/bec/assigned-quotations" element={<BecAssignedQuotations />} />
            <Route path="/approvals/bec/vendor-review" element={<BecVendorReview />} />
            <Route path="/approvals/bec/vendor-final-list" element={<BecFinalVendorList />} />
            <Route path="/approvals/bec/selected-vendors" element={<BecSelectedVendors />} />
            <Route path="/approvals/bec-category-list" element={<BecCategoryList />} />
            <Route path="/approvals/bec-category-list/:rrId" element={<BecCategoryList />} />
            <Route path="/approvals/bec/audit-trail" element={<BecAuditTrail />} />
            <Route path="/approvals/hod/audit-trail" element={<HodAuditTrail />} />
            <Route path="/approvals/tec" element={<TecApprovals />} />
            <Route path="/approvals/tec/audit-trail" element={<TecAuditTrail />} />
            <Route path="/dpc/quotation-approvals" element={<QuotationAuthorityApprovals />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/notifications/:notificationId" element={<NotificationsPage />} />
            <Route path="/role-requests" element={<RoleRequests />} />
            <Route path="/tenders" element={<TenderDirectory />} />
            <Route path="/tenders/:tenderId" element={<TenderDirectory />} />
            <Route path="/procurement/tenders" element={<ProcurementWorkspace />} />
            <Route path="/procurement/rfqs" element={<ProcurementRfqList />} />
            <Route path="/vendor/quotations" element={<VendorQuotations />} />
            <Route path="/vendor/objections" element={<VendorObjections />} />
            <Route path="/vendor/rfq-invitations" element={<VendorRfqInvitations />} />
            <Route path="/vendor/quotation-submission" element={<VendorQuotationSubmission />} />
            <Route path="/vendor/quotation-submission/rfq-selection" element={<VendorQuotationSubmission />} />
            <Route path="/vendor/quotation-submission/items" element={<VendorQuotationSubmission />} />
            <Route path="/vendor/rfqs/:rfqId/document" element={<VendorRfqDocument />} />
            <Route path="/vendor/purchase-orders/:poId" element={<VendorPurchaseOrderDetails />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/role-requests" element={<RoleRequests />} />
            <Route path="/admin/faculties" element={<AdminFaculties />} />
            <Route path="/admin/departments" element={<AdminDepartments />} />
            <Route path="/admin/divisions" element={<AdminDepartments />} />
            <Route path="/admin/audit-trail" element={<AdminAuditTrail />} />
            <Route path="/dpc/vendors" element={<DpcVendorWorkspace />} />
            <Route path="/dpc/vendors/blacklist" element={<DpcVendorWorkspace fixedStatus="BLACK_LISTED" />} />
            <Route path="/dpc/audit-trail" element={<DpcAuditTrail />} />
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
            onClose={() => {
              setOpenRegister(false);
              setRegisterDialogSize("sm");
            }}
            fullWidth
            maxWidth={registerDialogSize}
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
                onSizeChange={setRegisterDialogSize}
                openLogin={() => {
                  setOpenRegister(false);
                  setRegisterDialogSize("sm");
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
