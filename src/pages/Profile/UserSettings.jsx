import { useEffect, useState } from "react";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import { useAuth } from "../../contexts/AuthContext";
import PageHero from "../../components/PageHero";

const inputClass = "w-full rounded-2xl border border-[#d8e6ed] bg-white px-4 py-3 text-sm text-[#10283f] outline-none transition focus:border-[#166e8c] focus:ring-4 focus:ring-[#166e8c]/10";
const cardClass = "rounded-[26px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";

const readJson = async (response) => {
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(body?.message || body?.error || "Request failed");
  return body;
};

export default function UserSettings() {
  const { user, token, updateSession } = useAuth();
  const [profile, setProfile] = useState({ username: "", email: "", firstName: "", lastName: "", phoneNumber: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [profileNotice, setProfileNotice] = useState(null);
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setProfile({
      username: user?.username || "",
      email: user?.email || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phoneNumber: user?.phoneNumber || "",
    });
  }, [user]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);
    try {
      const body = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile),
      }).then(readJson);
      updateSession(body.user, body.token);
      setProfileNotice({ type: "success", text: body.message || "Profile updated successfully." });
    } catch (error) {
      setProfileNotice({ type: "error", text: error.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordNotice(null);
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordNotice({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    setSavingPassword(true);
    try {
      const body = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
      }).then(readJson);
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordNotice({ type: "success", text: body.message || "Password changed successfully." });
    } catch (error) {
      setPasswordNotice({ type: "error", text: error.message });
    } finally {
      setSavingPassword(false);
    }
  };

  const Notice = ({ value }) => value ? (
    <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${value.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {value.text}
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Account settings" title="Profile and security" description="Keep your account details accurate and protect access to your finance workspace." />

      <section className="grid gap-6">
        <form onSubmit={saveProfile} className={cardClass}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf7fb] text-[#166e8c]"><ManageAccountsRoundedIcon /></span>
            <div><h2 className="text-xl font-black text-[#10283f]">Personal information</h2><p className="mt-1 text-sm text-slate-500">Update the details shown across your workspace.</p></div>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {[['First name','firstName'],['Last name','lastName'],['Username','username'],['Email address','email'],['Phone number','phoneNumber']].map(([label, key]) => (
              <label key={key} className={key === "phoneNumber" ? "md:col-span-2" : ""}>
                <span className="mb-2 block text-sm font-bold text-[#28465d]">{label}</span>
                <input className={inputClass} type={key === "email" ? "email" : "text"} value={profile[key]} required={["username", "email"].includes(key)} onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))} />
              </label>
            ))}
          </div>
          <Notice value={profileNotice} />
          <div className="mt-6 flex justify-end"><button disabled={savingProfile} className="rounded-2xl bg-[#166e8c] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#125d77] disabled:opacity-60">{savingProfile ? "Saving..." : "Save profile"}</button></div>
        </form>

        <form onSubmit={changePassword} className={cardClass}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><LockResetRoundedIcon /></span>
            <div><h2 className="text-xl font-black text-[#10283f]">Change password</h2><p className="mt-1 text-sm text-slate-500">Use at least eight characters.</p></div>
          </div>
          <div className="mt-6 space-y-5">
            {[['Current password','currentPassword'],['New password','newPassword'],['Confirm new password','confirmPassword']].map(([label, key]) => (
              <label key={key}><span className="mb-2 block text-sm font-bold text-[#28465d]">{label}</span><input className={inputClass} type="password" minLength={key === "currentPassword" ? undefined : 8} required value={passwords[key]} onChange={(event) => setPasswords((current) => ({ ...current, [key]: event.target.value }))} /></label>
            ))}
          </div>
          <Notice value={passwordNotice} />
          <button disabled={savingPassword} className="mt-6 w-full rounded-2xl bg-[#10283f] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#183c56] disabled:opacity-60">{savingPassword ? "Updating..." : "Update password"}</button>
          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><VerifiedUserRoundedIcon className="mt-0.5 text-[#166e8c]" fontSize="small" />Your current password is verified before any security change is saved.</div>
        </form>
      </section>
    </div>
  );
}
