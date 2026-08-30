import { Box } from "@mui/material";
import Header from "./Header";
import Sidebar from "./Sidebar";
import VendorDecisionPopup from "./VendorDecisionPopup";
import Footer from "./Footer";

const Layout = ({ children }) => {
  return (
    <Box className="min-h-screen bg-[linear-gradient(180deg,#f5fbff_0%,#eef4f7_100%)]">
      <Header />
      <Box className="flex">
        <Sidebar />
        <Box component="main" className="min-h-screen min-w-0 flex-1 px-6 pb-10 pt-[78px] md:px-8">
          {children}
        </Box>
      </Box>
      <Footer />
      <VendorDecisionPopup />
    </Box>
  );
};

export default Layout;
