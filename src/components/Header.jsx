import { Box, IconButton } from "@mui/material";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import { useAuth } from "../contexts/AuthContext";

const Header = () => {
  const { user } = useAuth();
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Astraea User";
  const displayRole = user?.subRole || user?.mainRole || "";

  return (
    <Box className="fixed inset-x-0 top-0 z-40 border-b border-white/50 bg-white/88 backdrop-blur-xl">
      <Box className="flex items-center justify-between px-6 py-4 md:px-8">
        <Box className="flex items-center gap-4">
          <img
            src="/Images/Logo/Astraea_Logo-removebg-preview.png"
            alt="Astraea Logo"
            className="h-11 w-auto object-contain"
          />
          <Box>
            <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#166e8c]">
              Astraea
            </div>
            <div className="text-lg font-bold text-[#10283f]">E-Procurement Workspace</div>
          </Box>
        </Box>

        <Box className="flex items-center gap-4">
          <IconButton sx={{ color: "#0f2940", backgroundColor: "#eef5f8" }}>
            <NotificationsOutlinedIcon />
          </IconButton>

          <Box className="flex items-center gap-3 rounded-2xl bg-[#0f2940] px-4 py-2 text-white shadow-[0_14px_30px_rgba(15,41,64,0.22)]">
            <Box className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#166e8c] text-base font-bold">
              {displayName.charAt(0).toUpperCase()}
            </Box>
            <Box className="hidden sm:block">
              <div className="text-sm font-semibold">{displayName}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-300">{displayRole}</div>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Header;
