import { Box } from "@mui/material";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";

export default function Footer() {
  return (
    <footer className="w-full overflow-hidden bg-[linear-gradient(100deg,rgba(194,225,237,0.97)_0%,rgba(147,201,220,0.97)_52%,rgba(104,172,198,0.97)_100%)] text-[#10283f] shadow-[0_-8px_24px_rgba(15,68,91,0.10)]">
      <Box className="grid gap-7 px-6 py-7 lg:grid-cols-[1.45fr_0.8fr] lg:px-8">
        <Box>
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#126b89]">Astraea E-Procurement</div>
          <h2 className="mt-2 text-lg font-bold">University procurement, managed with clarity</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#365a6d]">
            Astraea supports the University of Ruhuna procurement lifecycle—from requisition and approval to tender management, vendor evaluation and purchasing—through one secure, transparent workspace.
          </p>
        </Box>

        <Box>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#126b89]">Contact Us</h3>
          <div className="mt-3 space-y-2.5 text-sm text-[#294e62]">
            <div className="flex items-start gap-2.5">
              <LocationOnOutlinedIcon sx={{ fontSize: 18, marginTop: "1px" }} />
              <span>Faculty of Engineering, Hapugala, Galle, Sri Lanka.</span>
            </div>
            <a href="tel:+94912245765" className="flex items-center gap-2.5 transition hover:text-[#0c607e]">
              <CallOutlinedIcon sx={{ fontSize: 18 }} />
              <span>+(94)0 91 2245765/6</span>
            </a>
            <a href="mailto:webmaster@eng.ruh.ac.lk" className="flex items-center gap-2.5 transition hover:text-[#0c607e]">
              <MailOutlineRoundedIcon sx={{ fontSize: 18 }} />
              <span>webmaster@eng.ruh.ac.lk</span>
            </a>
          </div>
        </Box>
      </Box>

      <Box className="border-t border-[#78aec2]/45 px-6 py-3 text-center text-xs text-[#416779] lg:px-8">
        Copyright © Faculty of Engineering, University of Ruhuna 2026. Astraea E-Procurement System.
      </Box>
    </footer>
  );
}
