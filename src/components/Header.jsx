import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  Badge,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.jpeg";

const Header = () => {
  const { user } = useAuth();
  const displayName = user?.name || "Guest";
  const displayRole = user?.role || "";

  return (
    <AppBar
      position="fixed"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar>
        {/* ===== LOGO + TITLE ===== */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <img
            src={logo}
            alt="Astraea Logo"
            style={{ height: 36, marginRight: 10 }}
          />
          <Typography variant="h6" noWrap>
            Astraea e-Procurement
          </Typography>
        </Box>

        {/* ===== RIGHT SIDE ICONS ===== */}
        <Box sx={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          {/* Notifications */}
          <IconButton color="inherit">
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* User */}
          <Box sx={{ display: "flex", alignItems: "center", ml: 2 }}>
            <Avatar sx={{ bgcolor: "secondary.main", width: 32, height: 32 }}>
              {displayName.charAt(0)}
            </Avatar>
            <Box sx={{ ml: 1 }}>
              <Typography variant="body2">{displayName}</Typography>
              {displayRole && <Typography variant="caption">{displayRole}</Typography>}
            </Box>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
