// src/pages/Register/Register.jsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

// Material UI Icons
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import BusinessIcon from '@mui/icons-material/Business';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PublicIcon from '@mui/icons-material/Public';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import SecurityIcon from '@mui/icons-material/Security';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BadgeIcon from '@mui/icons-material/Badge';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// ─── Role config — values MUST match backend enums exactly ────────────────────
const ROLE_CONFIG = {
  FACULTY_STAFF: {
    label: "Faculty Staff",
    subRoles: [
      { value: "LECTURER", label: "Lecturer" },
      { value: "HOD", label: "Head of Department (HOD)" },
      { value: "DEAN", label: "Dean" },
      { value: "VC", label: "Vice Chancellor (VC)" },
    ],
    requiresSubRole: true,
    icon: SchoolIcon,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    desc: "Academic & research staff",
  },
  FINANCE: {
    label: "Finance / Procurement",
    subRoles: [
      { value: "FINANCE_OFFICER", label: "Finance Officer" },
      { value: "PROCUREMENT_OFFICER", label: "Procurement Officer" },
    ],
    requiresSubRole: true,
    icon: WorkIcon,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    desc: "Finance & procurement",
  },
  VENDOR: {
    label: "Vendor",
    subRoles: [],
    requiresSubRole: false,
    icon: LocalShippingIcon,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    desc: "External supplier",
  },
  ADMIN: {
    label: "Admin",
    subRoles: [],
    requiresSubRole: false,
    icon: SecurityIcon,
    iconColor: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    desc: "System administrator",
  },
};

// ─── Password strength ─────────────────────────────────────────────────────────
function getStrength(pwd) {
  if (!pwd) return 0;
  return (
    (pwd.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(pwd) ? 1 : 0) +
    (/[0-9]/.test(pwd) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(pwd) ? 1 : 0)
  );
}

const STRENGTH_CONFIG = [
  { color: "bg-red-400", label: "Weak", textColor: "text-red-500", bgColor: "bg-red-50" },
  { color: "bg-orange-400", label: "Fair", textColor: "text-orange-500", bgColor: "bg-orange-50" },
  { color: "bg-yellow-400", label: "Good", textColor: "text-yellow-600", bgColor: "bg-yellow-50" },
  { color: "bg-emerald-500", label: "Strong", textColor: "text-emerald-600", bgColor: "bg-emerald-50" },
];

// ─── Main component ────────────────────────────────────────────────────────────
export default function Register({ onClose, openLogin }) {
  useEffect(() => {
    document.title = "Astraea · Create Account";

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateX(10px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .animate-slideUp { animation: slideUp 0.5s ease-out; }
      .animate-fadeIn  { animation: fadeIn 0.3s ease-out; }
      .animate-spin    { animation: spin 1s linear infinite; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const {
    register, handleSubmit, watch, setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { mainRole: "FACULTY_STAFF" } });

  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step,        setStep]        = useState(1);
  const [submitState, setSubmitState] = useState(null);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedRole   = watch("mainRole");
  const password       = watch("password");
  const roleConfig     = ROLE_CONFIG[selectedRole] || {};
  const strength       = getStrength(password);
  const strengthConfig = STRENGTH_CONFIG[strength - 1] || STRENGTH_CONFIG[0];

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      setError("confirmPassword", { message: "Passwords do not match" });
      setStep(1);
      return;
    }

    const subRole = roleConfig.requiresSubRole ? (data.subRole || null) : null;

    const payload = {
      username:     data.username,
      email:        data.email,
      password:     data.password,
      mainRole:     data.mainRole,
      subRole:      subRole,
      facultyId:    null,
      departmentId: null,
      vendorId:     null,
    };

    try {
      const res = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (res.ok) {
        setSuccessMessage(body.message || "Registration submitted. Awaiting admin approval.");
        setSubmitState("success");
      } else {
        const msg  = body.message || `Server error (${res.status})`;
        setErrorMsg(msg);
        setSubmitState("error");
      }
    } catch (err) {
      setErrorMsg("Cannot reach the server. Please check your connection.");
      setSubmitState("error");
    }
  };

  // ── Success ─────────────────────────────────────────────────────────────────
  if (submitState === "success") {
    return (
      // ✅ CHANGED: no outer page wrapper — renders directly inside modal
      <div className="w-full animate-slideUp">
        {/* Branding — narrowed with mx-auto + max-w, rounded on all sides */}
        <div className="max-w-sm px-6 py-4 mx-auto mb-6 bg-white rounded-2xl">
          <div className="flex flex-col items-center gap-4 mb-4 sm:flex-row">
            <div className="flex-shrink-0">
              <img
                src="/Images/Logo/Astraea_Logo-removebg-preview.png"
                alt="Astraea Logo"
                className="object-contain w-48 h-auto"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="mb-1 text-2xl font-bold text-gray-800">Account Created!</h1>
              <p className="text-sm text-gray-600">Your registration has been submitted for review</p>
            </div>
          </div>
        </div>

        {/* Success content */}
        <div className="flex flex-col items-center px-8 pb-4">
          <div className="flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-emerald-100">
            <CheckCircleIcon className="text-emerald-600" style={{ fontSize: 40 }} />
          </div>
          <p className="mb-6 text-center text-gray-600">
            {successMessage || "Your request is under review. You'll receive an email once an administrator activates your account."}
          </p>
          <button
            type="button"
            onClick={() => openLogin?.()}
            className="inline-flex items-center justify-center w-full px-4 py-3 font-semibold text-white transition-colors bg-emerald-500 hover:bg-emerald-600 rounded-xl"
          >
            Back to Sign In
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 mt-4 text-center border-t border-gray-200 bg-gray-50">
          <h5 className="mb-1 text-sm font-semibold text-gray-700">Astraea E-Procurement Platform</h5>
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Astraea. All rights reserved.</p>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
   
    <div className="w-full animate-slideUp">

      {/* ── Branding header — narrowed, centered, rounded ── */}
      <div className="px-6 py-4 mx-auto mb-6 bg-white rounded-2xl full-width">
        <div className="flex flex-col items-center gap-4 mb-4 sm:flex-row">
          <div className="flex-shrink-0">
            <img
              src="/Images/Logo/Astraea_Logo-removebg-preview.png"
              alt="Astraea Logo"
              className="object-contain w-48 h-auto"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="mb-1 text-2xl font-bold text-gray-800">Create Account</h1>
            <p className="text-sm text-gray-600">Join Astraea E-Procurement Platform</p>
          </div>
        </div>
      </div>

      {/* ── Step Indicator ── */}
      <div className="px-8 pt-2 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>1</div>
            <span className={`text-sm ${step === 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              Account Details
            </span>
          </div>
          <div className="flex-1 h-0.5 mx-4 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full bg-blue-600 transition-all duration-300 ${step === 2 ? 'w-full' : 'w-0'}`} />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>2</div>
            <span className={`text-sm ${step === 2 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              Role & Access
            </span>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-6">

        {/* Step 1: Account Details */}
        {step === 1 && (
          <div className="space-y-5 animate-fadeIn">

            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <PersonIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
                <input
                  id="username" type="text"
                  {...register("username", {
                    required:  "Username is required",
                    minLength: { value: 4,  message: "Min 4 characters" },
                    maxLength: { value: 50, message: "Max 50 characters" },
                    pattern:   { value: /^[a-zA-Z0-9_]+$/, message: "Only letters, numbers & underscores" },
                  })}
                  placeholder="Enter your username"
                  className="w-full py-3 pl-10 pr-4 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                  disabled={isSubmitting}
                />
              </div>
              {errors.username && (
                <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <ErrorIcon style={{ fontSize: 12 }} /> {errors.username.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                University Email <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <EmailIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
                <input
                  id="email" type="email"
                  {...register("email", {
                    required: "Email is required",
                    pattern:  { value: /^\S+@\S+\.\S+$/, message: "Invalid email address" },
                  })}
                  placeholder="Enter your email"
                  className="w-full py-3 pl-10 pr-4 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && (
                <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <ErrorIcon style={{ fontSize: 12 }} /> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <LockIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  {...register("password", {
                    required:  "Password is required",
                    minLength: { value: 8, message: "Min 8 characters" },
                  })}
                  placeholder="Enter your password"
                  className="w-full py-3 pl-10 pr-10 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                  disabled={isSubmitting}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute text-gray-400 transition-colors right-3 hover:text-blue-600"
                  disabled={isSubmitting}>
                  {showPwd ? <VisibilityOffIcon style={{ fontSize: 18 }} /> : <VisibilityIcon style={{ fontSize: 18 }} />}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <ErrorIcon style={{ fontSize: 12 }} /> {errors.password.message}
                </p>
              )}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all ${i < strength ? strengthConfig.color : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${strengthConfig.textColor} font-medium`}>
                    Password Strength: {strengthConfig.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <LockIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: v => v === password || "Passwords do not match",
                  })}
                  placeholder="Confirm your password"
                  className="w-full py-3 pl-10 pr-10 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                  disabled={isSubmitting}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute text-gray-400 transition-colors right-3 hover:text-blue-600"
                  disabled={isSubmitting}>
                  {showConfirm ? <VisibilityOffIcon style={{ fontSize: 18 }} /> : <VisibilityIcon style={{ fontSize: 18 }} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <ErrorIcon style={{ fontSize: 12 }} /> {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button type="button" onClick={() => setStep(2)}
              className="flex items-center justify-center w-full gap-2 px-4 py-3 mt-4 font-semibold text-white transition-colors bg-blue-600 hover:bg-blue-700 rounded-xl"
              disabled={isSubmitting}>
              Continue to Role Selection
              <ArrowForwardIcon style={{ fontSize: 18 }} />
            </button>
          </div>
        )}

        {/* Step 2: Role & Access */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">

            {/* Role Selection */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">
                Account Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const isSelected = selectedRole === key;
                  return (
                    <label key={key}
                      className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 bg-white'
                      }`}>
                      <input type="radio" value={key}
                        {...register("mainRole", { required: true })}
                        className="sr-only" />
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-all duration-200 ${
                        isSelected ? 'bg-blue-500 text-white' : `${cfg.bgColor} ${cfg.iconColor}`
                      }`}>
                        <Icon style={{ fontSize: 20 }} />
                      </div>
                      <p className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>{cfg.label}</p>
                      <p className="mt-1 text-xs text-gray-400">{cfg.desc}</p>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircleIcon style={{ fontSize: 16 }} className="text-blue-500" />
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Sub-Role Dropdown */}
            {roleConfig.requiresSubRole && roleConfig.subRoles?.length > 0 && (
              <div className="space-y-1.5">
                <label htmlFor="subRole" className="block text-sm font-semibold text-gray-700">
                  Position <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <BadgeIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
                  <select id="subRole"
                    {...register("subRole", { required: "Please select your position" })}
                    className="w-full py-3 pl-10 pr-10 text-sm transition-colors bg-white border-2 border-gray-200 appearance-none rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                    disabled={isSubmitting}>
                    <option value="">Select your position</option>
                    {roleConfig.subRoles.map(sr => (
                      <option key={sr.value} value={sr.value}>{sr.label}</option>
                    ))}
                  </select>
                  <ExpandMoreIcon className="absolute text-gray-400 pointer-events-none right-3" style={{ fontSize: 18 }} />
                </div>
                {errors.subRole && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                    <ErrorIcon style={{ fontSize: 12 }} /> {errors.subRole.message}
                  </p>
                )}
              </div>
            )}

            {/* Info Notice */}
            {(selectedRole === "VENDOR" || selectedRole === "ADMIN") && (
              <div className="p-4 mt-2 border border-blue-200 bg-blue-50 rounded-xl">
                <p className="flex items-start gap-2 text-sm text-blue-700">
                  <span className="text-lg">ℹ️</span>
                  <span>
                    {selectedRole === "VENDOR"
                      ? "Vendor accounts require pre-approval by the Procurement Office before activation."
                      : "Admin accounts are restricted and require approval from a super-admin."}
                  </span>
                </p>
              </div>
            )}

            {/* Error Message */}
            {submitState === "error" && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
                <p className="flex items-center gap-2 text-sm text-red-600">
                  <ErrorIcon style={{ fontSize: 18 }} /> {errorMsg}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setStep(1)}
                className="flex items-center justify-center flex-1 gap-2 px-4 py-3 font-semibold text-gray-600 transition-colors border-2 border-gray-300 rounded-xl hover:border-blue-400 hover:text-blue-600"
                disabled={isSubmitting}>
                <ArrowBackIcon style={{ fontSize: 18 }} /> Back
              </button>
              <button type="submit" disabled={isSubmitting}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isSubmitting
                  ? <><HourglassEmptyIcon style={{ fontSize: 18 }} className="animate-spin" /> Creating Account...</>
                  : 'Create Account'}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Sign-in link */}
      <div className="pb-4 text-center">
        <p className="text-sm text-gray-600">
          Already have an account? {" "}
          <button type="button" onClick={() => openLogin?.()} className="font-medium text-blue-600 transition-colors hover:text-blue-800">Sign in</button>
        </p>
      </div>

      {/* Footer */}
      <div className="p-6 text-center border-t border-gray-200 bg-gray-50">
        <h5 className="mb-1 text-sm font-semibold text-gray-700">Astraea E-Procurement Platform</h5>
        <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Astraea. All rights reserved.</p>
      </div>
    </div>
  );
}