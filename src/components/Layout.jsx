import { Box } from "@mui/material";
import Header from "./Header";
import Sidebar from "./Sidebar";

const Layout = ({ children }) => {
  return (
    <Box className="min-h-screen bg-[linear-gradient(180deg,#f5fbff_0%,#eef4f7_100%)]">
      <Header />
      <Box className="flex">
        <Sidebar />
        <Box component="main" className="min-h-screen flex-1 px-6 py-24 md:px-8">
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
