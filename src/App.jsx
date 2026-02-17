import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Login from "./pages/Login/Login.jsx";
import Register from "./pages/Register/Register.jsx";

function App() {
  const [openLogin, setOpenLogin] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          background: "linear-gradient(135deg,#0ea5e9 0%,#7c3aed 100%)",
          color: "white",
        }}
      >
        <Container sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Astraea
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.95 }}>
            University E‑Procurement System — Transparent, auditable, intelligent.
          </Typography>

          <Box sx={{ display: "inline-flex", gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpenLogin(true)}
            >
              Login
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => setOpenRegister(true)}
              sx={{ borderColor: "rgba(255,255,255,0.7)", color: "white" }}
            >
              Sign Up
            </Button>
          </Box>
        </Container>
      </Box>

      <Container sx={{ py: 6 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Core features
        </Typography>
        <Typography color="text.secondary">
          Role-based access, catalog management, approval workflows, bidding portal, and dashboards.
        </Typography>
      </Container>

      {/* Login Dialog */}
      <Dialog open={openLogin} onClose={() => setOpenLogin(false)} fullWidth maxWidth="sm">
        <DialogContent dividers>
          <Login
            onClose={() => setOpenLogin(false)}
            openRegister={() => {
              setOpenLogin(false);
              setOpenRegister(true);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Register Dialog */}
      <Dialog open={openRegister} onClose={() => setOpenRegister(false)} fullWidth maxWidth="sm">
    
        <DialogContent dividers>
          <Register
            onClose={() => setOpenRegister(false)}
            openLogin={() => {
              setOpenRegister(false);
              setOpenLogin(true);
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default App;
