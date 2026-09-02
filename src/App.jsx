

import React, { useMemo, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Dialog,
  DialogContent,
} from "@mui/material";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login/Login.jsx";
import Register from "./pages/Register/Register.jsx";
import ResetPassword from "./pages/ResetPassword/ResetPassword.jsx";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard/dashboard.jsx";
import BursarBudgetWorkspace from "./pages/Bursar/BursarBudgetWorkspace.jsx";
import TenderDrafts from "./pages/Bursar/TenderDrafts.jsx";
import FinanceCategoryRrDetails from "./pages/Bursar/FinanceCategoryRrDetails.jsx";
import ReceivedRrLists from "./pages/Bursar/ReceivedRrLists.jsx";
import CreatedRfqs from "./pages/Bursar/CreatedRfqs.jsx";
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
import VendorOfferLetters from "./pages/Vendor/VendorOfferLetters.jsx";
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
import BecSelectedVendors from "./pages/Approvals/BecSelectedVendors.jsx";
import BecCategoryAssignment from "./pages/Approvals/BecCategoryAssignment.jsx";
import BecAssignedQuotations from "./pages/Approvals/BecAssignedQuotations.jsx";
import BecFinalVendorList from "./pages/Approvals/BecFinalVendorList.jsx";
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
import UserSettings from "./pages/Profile/UserSettings.jsx";
import DeanAuditTrail from "./pages/Approvals/DeanAuditTrail.jsx";
import VcAuditTrail from "./pages/Approvals/VcAuditTrail.jsx";
import BecMemberDashboard from "./pages/Dashboard/BecMemberDashboard.jsx";
import BecMemberAuditTrail from "./pages/Approvals/BecMemberAuditTrail.jsx";
import Footer from "./components/Footer.jsx";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import { adminPath, becHeadPath, becPath, deanPath, divisionHeadPath, dpcPath, getDashboardPath, isStaffMember, seniorAssistantBursarPath, staffMemberPath, vcPath, vendorPath } from "./utils/roleRoutes.js";

function LandingPage({ onOpenLogin, onOpenRegister }) {
const featureCards = [
  "Requisition Management",
  "University Approval Flow",
  "Supplier & Tender Control",
];

  return (
    <Box className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#f4f8fb] text-[#123047]">
      <Box className="absolute right-[-180px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[#f0b73f]/20 blur-3xl" />
      <Box className="absolute left-[-220px] top-[220px] h-[420px] w-[420px] rounded-full bg-[#2d8fb3]/15 blur-3xl" />

      <Box className="relative z-20 w-full bg-[linear-gradient(100deg,rgba(194,225,237,0.97)_0%,rgba(147,201,220,0.97)_52%,rgba(104,172,198,0.97)_100%)] shadow-[0_4px_14px_rgba(15,68,91,0.09)]">
        <Box className="flex items-center justify-between gap-5 px-4 py-2.5 sm:px-6 md:px-8">
          <Box className="flex items-center gap-4">
            <img src="/Images/Logo/Astraea_Logo-removebg-preview.png" alt="Astraea Logo" className="h-12 w-auto object-contain" />
            <Box className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#166e8c]">Astraea</div>
              <div className="truncate text-sm font-bold text-[#10283f] sm:text-base">E-Procurement Workspace</div>
            </Box>
          </Box>

          <Box className="flex items-center gap-3 text-xs font-semibold text-[#173c52] lg:gap-6 lg:text-sm">
            <Box className="hidden items-center gap-6 xl:flex">
              <a href="tel:+94912245765" className="flex items-center gap-2 transition hover:text-[#0c607e]">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/60 text-[#126b89]"><CallOutlinedIcon sx={{ fontSize: 17 }} /></span>
                <span><span className="text-[#557486]">Call us:</span> +(94)0 91 2245765/6</span>
              </a>
              <a href="mailto:webmaster@eng.ruh.ac.lk" className="flex items-center gap-2 transition hover:text-[#0c607e]">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/60 text-[#126b89]"><MailOutlineRoundedIcon sx={{ fontSize: 17 }} /></span>
                <span><span className="text-[#557486]">E-mail:</span> webmaster@eng.ruh.ac.lk</span>
              </a>
            </Box>
            <Button variant="outlined" onClick={onOpenLogin} sx={{ borderColor: "#166e8c", color: "#10283f", borderRadius: "12px", textTransform: "none", fontWeight: 800 }}>Login</Button>
            <Button variant="contained" onClick={onOpenRegister} sx={{ bgcolor: "#f0b73f", color: "#10283f", borderRadius: "12px", textTransform: "none", fontWeight: 900, boxShadow: "none", "&:hover": { bgcolor: "#dca432" } }}>Registration</Button>
          </Box>
        </Box>
      </Box>

      <Container maxWidth="xl" className="relative z-10 px-4 py-3 md:px-6">
        <Box>
          <Box className="hidden">
            <Box className="flex items-center gap-4">
              <Box className="flex items-center justify-center w-16 h-16 rounded-2xl">
                <img
                  src="/Images/uor Logo.png"
                  alt="University of Ruhuna Logo"
                  className="object-contain h-20 md:h-24"
                />
              </Box>

              <Box>
                <Typography className="!text-xs !font-bold !uppercase !tracking-[0.25em] !text-[#1c6f8d]">
                  University of Ruhuna
                </Typography>

                <Typography className="!mt-1 !text-2xl !font-black !leading-tight !text-[#123047] md:!text-3xl">
                  ASTRAEA E-Procurement System
                </Typography>

                <Typography className="!mt-1 !text-xs !font-medium !text-[#557083] md:!text-sm">
                  Transparent purchasing workflow for academic and administrative operations
                </Typography>
              </Box>

            <Box className="relative w-40 h-16">
  <img
    src="/Images/Logo/Astraea_Logo-removebg-preview.png"
    alt="Astraea Logo"
    className="absolute left-0 top-1/2 hidden h-28 -translate-y-1/2 object-contain drop-shadow-[0_18px_35px_rgba(28,111,141,0.25)] lg:block"
  />
</Box>
            </Box>

            <Box className="flex gap-3">
              <Button
                variant="outlined"
                onClick={onOpenLogin}
                sx={{
                  borderColor: "#1c6f8d",
                  color: "#1c6f8d",
                  px: 3,
                  py: 1,
                  borderRadius: "14px",
                  textTransform: "none",
                  fontWeight: 800,
                }}
              >
                Login
              </Button>

              <Button
                variant="contained"
                onClick={onOpenRegister}
                sx={{
                  backgroundColor: "#f0b73f",
                  color: "#123047",
                  px: 3,
                  py: 1,
                  borderRadius: "14px",
                  textTransform: "none",
                  fontWeight: 900,
                  boxShadow: "0 12px 24px rgba(240, 183, 63, 0.28)",
                  "&:hover": { backgroundColor: "#dca432" },
                }}
              >
                Registration
              </Button>
            </Box>
          </Box>

          <Box className="grid gap-5 px-1 py-4 md:grid-cols-[1.02fr_0.98fr] md:px-2 md:py-5 lg:gap-7">
            <Box className="flex flex-col justify-center">
              <Typography className="!text-3xl !font-black !leading-[1.02] !tracking-[-0.04em] !text-[#123047] md:!text-5xl">
                Modern Procurement System for University of Ruhuna
              </Typography>

              <Typography className="!mt-8 !max-w-2xl !text-sm !leading-6 !text-[#516b7d] md:!text-base">
                A professional digital workspace for requisitions, approvals, vendor quotations, tenders, purchase
                orders, goods receiving, and payment readiness across the university procurement lifecycle.
              </Typography>

  <Box className="grid gap-2 mt-16 sm:grid-cols-3">
  {featureCards.map((title) => (
    <Box
      key={title}
      className="rounded-2xl border border-[#d9e6ee] bg-white px-3 py-3 shadow-[0_10px_24px_rgba(7,34,54,0.05)]"
    >
      <Box className="mb-2 h-1 w-12 rounded-full bg-[linear-gradient(90deg,#1c6f8d,#f0b73f)]" />

      <Typography className="!text-sm !font-black !leading-5 !text-[#123047]">
        {title}
      </Typography>
    </Box>
  ))}
</Box>
            </Box>

            <Box className="relative flex items-center">
              <Box className="w-full overflow-hidden rounded-[24px] shadow-[0_0_35px_rgba(28,111,141,0.30)] backdrop-blur-sm">
                <img
                  src="/Images/Design.png"
                  alt="Astraea procurement system interface"
                  className="h-[270px] w-full rounded-[18px] object-cover object-center md:h-[390px] lg:h-[420px]"
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>

      <Box className="relative z-10 mt-auto pt-3">
        <Footer />
      </Box>

      {false && <Container maxWidth="xl" className="relative z-10 px-4 pb-3 md:px-6">
        <Box className="rounded-[20px] bg-[linear-gradient(135deg,#123047,#1c6f8d)] p-3 text-white shadow-[0_10px_28px_rgba(7,34,54,0.12)] md:p-4">
          <Box className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <Box>
              <Typography className="!text-xs !font-black !uppercase !tracking-[0.24em] !text-[#f0b73f]">
                Contact
              </Typography>

              <Typography className="!mt-1 !text-sm !font-black !uppercase !text-white md:!text-base">
                University of Ruhuna,
              </Typography>

              <Typography className="!mt-0.5 !text-xs !font-semibold !uppercase !leading-4 !text-white/80">
                Wellamadama, Matara, Sri Lanka.
              </Typography>

              <Typography className="!mt-1 !text-sm !font-black !text-[#f0b73f]">
                (+94) 41-2033250
              </Typography>
            </Box>

            <Typography className="!text-xs !font-semibold !text-white/75 md:!text-right">
              © 2026 Department of Computer Engineering. All Rights Reserved.
            </Typography>
          </Box>
        </Box>
      </Container>}
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

  const dashboardElement =
    user?.mainRole === "ADMIN" ? (
      <AdminDashboard />
    ) : user?.mainRole === "DPC" ? (
      <DpcDashboard />
    ) : user?.mainRole === "VENDOR" ? (
      <VendorDashboard />
    ) : (
      <Dashboard />
    );
  const dashboardPath = getDashboardPath(user);
  const defaultAuthenticatedElement = dashboardPath === "/dashboard"
    ? dashboardElement
    : <Navigate to={dashboardPath} replace />;
  const staffDashboardElement = isStaffMember(user)
    ? dashboardElement
    : <Navigate to={dashboardPath} replace />;

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
            <Route path="/" element={defaultAuthenticatedElement} />
            <Route path="/dashboard" element={defaultAuthenticatedElement} />
            <Route path={seniorAssistantBursarPath("dashboard")} element={dashboardElement} />
            <Route path={seniorAssistantBursarPath("tender-creation")} element={<BursarBudgetWorkspace />} />
            <Route path={seniorAssistantBursarPath("tender-drafts")} element={<TenderDrafts />} />
            <Route path={seniorAssistantBursarPath("tender-records")} element={<TenderDirectory />} />
            <Route path={`${seniorAssistantBursarPath("tender-records")}/:tenderId`} element={<TenderDirectory />} />
            <Route path={seniorAssistantBursarPath("received-rr-lists")} element={<ReceivedRrLists />} />
            <Route path={seniorAssistantBursarPath("created-rfqs")} element={<CreatedRfqs />} />
            <Route path={`${seniorAssistantBursarPath("received-rr")}/:rrId`} element={<FinanceCategoryRrDetails />} />
            <Route path={seniorAssistantBursarPath("rfq-creation")} element={<BursarTenderWorkspace />} />
            <Route path={seniorAssistantBursarPath("role-requests")} element={<RoleRequests />} />
            <Route path={seniorAssistantBursarPath("audit-trail")} element={<BursarAuditTrail />} />
            <Route path={seniorAssistantBursarPath("notifications")} element={<NotificationsPage />} />
            <Route path={`${seniorAssistantBursarPath("notifications")}/:notificationId`} element={<NotificationsPage />} />
            <Route path={seniorAssistantBursarPath("settings")} element={<UserSettings />} />
            <Route path={staffMemberPath("dashboard")} element={staffDashboardElement} />
            <Route path={staffMemberPath("create-requisition")} element={<CreateRequisition />} />
            <Route path={`${staffMemberPath("create-requisition")}/:rrId`} element={<CreateRequisition />} />
            <Route path={staffMemberPath("my-requisitions")} element={<MyRequisitions />} />
            <Route path={`${staffMemberPath("my-requisitions")}/:rrId`} element={<RequisitionDetails />} />
            <Route path={staffMemberPath("tenders")} element={<TenderDirectory />} />
            <Route path={`${staffMemberPath("tenders")}/:tenderId`} element={<TenderDirectory />} />
            <Route path={staffMemberPath("role-requests")} element={<RoleRequests />} />
            <Route path={staffMemberPath("audit-trail")} element={<StaffAuditTrail />} />
            <Route path={staffMemberPath("notifications")} element={<NotificationsPage />} />
            <Route path={`${staffMemberPath("notifications")}/:notificationId`} element={<NotificationsPage />} />
            <Route path={staffMemberPath("settings")} element={<UserSettings />} />
            <Route path={divisionHeadPath("dashboard")} element={dashboardElement} />
            <Route path={divisionHeadPath("approvals")} element={<HodApprovals />} />
            <Route path={`${divisionHeadPath("approvals")}/:rrId`} element={<HodApprovals />} />
            <Route path={divisionHeadPath("audit-trail")} element={<HodAuditTrail />} />
            <Route path={divisionHeadPath("tenders")} element={<TenderDirectory />} />
            <Route path={`${divisionHeadPath("tenders")}/:tenderId`} element={<TenderDirectory />} />
            <Route path={divisionHeadPath("role-requests")} element={<RoleRequests />} />
            <Route path={divisionHeadPath("notifications")} element={<NotificationsPage />} />
            <Route path={`${divisionHeadPath("notifications")}/:notificationId`} element={<NotificationsPage />} />
            <Route path={divisionHeadPath("settings")} element={<UserSettings />} />
            <Route path={deanPath("dashboard")} element={dashboardElement} />
            <Route path={deanPath("approvals")} element={<DeanApprovals />} />
            <Route path={`${deanPath("approvals")}/:rrId`} element={<DeanApprovals />} />
            <Route path={deanPath("audit-trail")} element={<DeanAuditTrail />} />
            <Route path={deanPath("quotation-approval")} element={<QuotationAuthorityApprovals />} />
            <Route path={deanPath("tenders")} element={<TenderDirectory />} />
            <Route path={`${deanPath("tenders")}/:tenderId`} element={<TenderDirectory />} />
            <Route path={deanPath("role-requests")} element={<RoleRequests />} />
            <Route path={deanPath("notifications")} element={<NotificationsPage />} />
            <Route path={`${deanPath("notifications")}/:notificationId`} element={<NotificationsPage />} />
            <Route path={deanPath("settings")} element={<UserSettings />} />
            <Route path={vcPath("dashboard")} element={dashboardElement} />
            <Route path={vcPath("approvals")} element={<VcApprovals />} />
            <Route path={`${vcPath("approvals")}/:rrId`} element={<VcApprovals />} />
            <Route path={vcPath("quotation-approval")} element={<QuotationAuthorityApprovals />} />
            <Route path={vcPath("role-requests")} element={<RoleRequests />} />
            <Route path={vcPath("notifications")} element={<NotificationsPage />} />
            <Route path={`${vcPath("notifications")}/:notificationId`} element={<NotificationsPage />} />
            <Route path={vcPath("audit-trail")} element={<VcAuditTrail />} />
            <Route path={vcPath("settings")} element={<UserSettings />} />
            <Route path={becHeadPath("dashboard")} element={dashboardElement} />
            <Route path={becHeadPath("approvals")} element={<BecApprovals />} />
            <Route path={`${becHeadPath("approvals")}/:rrId`} element={<BecApprovals />} />
            <Route path={becHeadPath("category-lists")} element={<BecCategoryList />} />
            <Route path={`${becHeadPath("category-lists")}/:rrId`} element={<BecCategoryList />} />
            <Route path={becHeadPath("category-assignment")} element={<BecCategoryAssignment />} />
            <Route path={becHeadPath("quotation-review")} element={<ProcurementWorkspace />} />
            <Route path={becHeadPath("assigned-quotations")} element={<BecAssignedQuotations />} />
            <Route path={becHeadPath("vendor-review")} element={<BecVendorReview />} />
            <Route path={becHeadPath("vendor-final-list")} element={<BecFinalVendorList />} />
            <Route path={becHeadPath("selected-vendors")} element={<BecSelectedVendors />} />
            <Route path={becHeadPath("role-requests")} element={<RoleRequests />} />
            <Route path={becHeadPath("audit-trail")} element={<BursarAuditTrail />} />
            <Route path={becHeadPath("notifications")} element={<NotificationsPage />} />
            <Route path={`${becHeadPath("notifications")}/:notificationId`} element={<NotificationsPage />} />
            <Route path={becHeadPath("tenders")} element={<TenderDirectory />} />
            <Route path={`${becHeadPath("tenders")}/:tenderId`} element={<TenderDirectory />} />
            <Route path={becHeadPath("settings")} element={<UserSettings />} />
            <Route path={becPath("dashboard")} element={<BecMemberDashboard />} />
            <Route path={becPath("assigned-quotations")} element={<BecAssignedQuotations />} />
            <Route path={becPath("approved-quotations")} element={<BecAssignedQuotations approvedOnly />} />
            <Route path={becPath("audit-trail")} element={<BecMemberAuditTrail />} />
            <Route path={becPath("role-requests")} element={<RoleRequests />} />
            <Route path={becPath("notifications")} element={<NotificationsPage />} />
            <Route path={`${becPath("notifications")}/:notificationId`} element={<NotificationsPage />} />
            <Route path={becPath("settings")} element={<UserSettings />} />
            <Route path={adminPath("dashboard")} element={<AdminDashboard />} />
            <Route path={adminPath("notifications")} element={<NotificationsPage />} />
            <Route path={`${adminPath("notifications")}/:notificationId`} element={<NotificationsPage />} />
            <Route path={adminPath("settings")} element={<UserSettings />} />
            <Route path={dpcPath("dashboard")} element={<DpcDashboard />} />
            <Route path={dpcPath("tenders")} element={<TenderDirectory />} />
            <Route path={`${dpcPath("tenders")}/:tenderId`} element={<TenderDirectory />} />
            <Route path={dpcPath("vendors")} element={<DpcVendorWorkspace />} />
            <Route path={dpcPath("vendors/blacklist")} element={<DpcVendorWorkspace fixedStatus="BLACK_LISTED" />} />
            <Route path={dpcPath("quotation-approvals")} element={<QuotationAuthorityApprovals />} />
            <Route path={dpcPath("notifications")} element={<NotificationsPage />} />
            <Route path={`${dpcPath("notifications")}/:notificationId`} element={<NotificationsPage />} />
            <Route path={dpcPath("audit-trail")} element={<DpcAuditTrail />} />
            <Route path={dpcPath("settings")} element={<UserSettings />} />
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
            <Route path="/approvals/bec/assigned-quotations" element={<BecAssignedQuotations />} />
            <Route path="/approvals/bec/:rrId" element={<BecApprovals />} />
            <Route path="/approvals/bec/quotations" element={<ProcurementWorkspace />} />
            <Route path="/approvals/bec/vendor-review" element={<BecVendorReview />} />
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
            <Route path="/tenders" element={<TenderDirectory />} />
            <Route path="/tenders/:tenderId" element={<TenderDirectory />} />
            <Route path="/procurement/tenders" element={<ProcurementWorkspace />} />
            <Route path="/procurement/rfqs" element={<ProcurementRfqList />} />
            <Route path={vendorPath("dashboard")} element={<VendorDashboard />} />
            <Route path={vendorPath("notifications")} element={<NotificationsPage />} />
            <Route path={`${vendorPath("notifications")}/:notificationId`} element={<NotificationsPage />} />
            <Route path={vendorPath("settings")} element={<UserSettings />} />
            <Route path="/vendor/quotations" element={<VendorQuotations />} />
            <Route path={vendorPath("offer-letters")} element={<VendorOfferLetters />} />
            <Route path={vendorPath("purchase-orders")} element={<VendorPurchaseOrderDetails />} />
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
            <Route path="*" element={defaultAuthenticatedElement} />
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
