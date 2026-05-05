import React, { useState } from "react";
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

const App = () => {
  const location = useLocation();
  const [openLogin, setOpenLogin] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);
  const isResetPasswordPage = location.pathname === "/reset-password";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {!isResetPasswordPage && (
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
              University E-Procurement System - Transparent, auditable, intelligent.
            </Typography>

            <Box sx={{ display: "inline-flex", gap: 2 }}>
              <Button variant="contained" color="primary" onClick={() => setOpenLogin(true)}>
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
      )}

      <Dialog open={!isResetPasswordPage && openLogin} onClose={() => setOpenLogin(false)} fullWidth maxWidth="sm">
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

      <Dialog open={!isResetPasswordPage && openRegister} onClose={() => setOpenRegister(false)} fullWidth maxWidth="sm">
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

      {isResetPasswordPage ? (
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      ) : (
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </Layout>
      )}
    </Box>
  );
};

export default App;
