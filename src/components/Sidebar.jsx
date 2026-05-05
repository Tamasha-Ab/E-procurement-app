import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Divider,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { sidebarConfig } from "../config/sidebarConfig.jsx";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const drawerWidth = 240;

const Sidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.name || "Guest";
  const displayRole = user?.role || "GUEST";

  const menuItems = sidebarConfig[displayRole] || [];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Push below AppBar */}
      <Toolbar />

      {/* ===== MENU ITEMS ===== */}
      <Box sx={{ flexGrow: 1 }}>
        <List>
          {menuItems.map((item, index) => (
            <ListItem
              button
              key={index}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider />

      {/* ===== USER INFO + LOGOUT (BOTTOM) ===== */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <AccountCircleIcon sx={{ mr: 1 }} />
          <Box>
            <Typography variant="body1" fontWeight={500}>
              {displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {displayRole}
            </Typography>
          </Box>
        </Box>

        <ListItem
          button
          onClick={() => console.log("Logout clicked")}
        >
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
