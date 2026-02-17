import { Box, Toolbar } from "@mui/material";
import Header from "./Header";

const Layout = ({ children }) => {
  return (
    <Box>
      <Header />
      <Box component="main" sx={{ p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
