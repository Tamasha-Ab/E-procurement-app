import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../contexts/AuthContext";

import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import SchoolIcon from "@mui/icons-material/School";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import BadgeIcon from "@mui/icons-material/Badge";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GoogleIcon from "@mui/icons-material/Google";

function getStrength(password) {
  if (!password) return 0;
  return (
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0)
  );
}

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });

// Documents are stored as Base64 in the registration JSON.  Keep the source
// file small enough that the encoded request stays within the API limit.
const MAX_VENDOR_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VENDOR_DOCUMENT_SIZE_LABEL = "5 MB";

const validateVendorDocumentSize = (files) => {
  const file = files?.[0];
  return !file || file.size <= MAX_VENDOR_DOCUMENT_SIZE_BYTES
    || `Each document must be ${MAX_VENDOR_DOCUMENT_SIZE_LABEL} or smaller`;
};

const STRENGTH_CONFIG = [
  { color: "bg-red-400", label: "Weak", textColor: "text-red-500" },
  { color: "bg-orange-400", label: "Fair", textColor: "text-orange-500" },
  { color: "bg-yellow-400", label: "Good", textColor: "text-yellow-600" },
  { color: "bg-emerald-500", label: "Strong", textColor: "text-emerald-600" },
];

const STAFF_ROLE_OPTIONS = [
  { value: "DIVISION_HEAD", label: "Division Head" },
  { value: "STAFF_MEMBER", label: "Staff Member" },
];

const ADMINISTRATIVE_ROLE_OPTIONS = [
  { value: "DEAN", label: "Dean" },
  { value: "STAFF_MEMBER", label: "Staff Member" },
];

const FINANCE_ROLE_OPTIONS = [
  { value: "SENIOR_ASSISTANT_BURSAR", label: "Senior Assistant Bursar" },
  { value: "ASSISTANT_BURSAR", label: "Assistant Bursar" },
  { value: "BURSAR", label: "Bursar" },
  { value: "BEC", label: "BEC (Bid Evaluation Committee)" },
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: "university_staff", label: "University Staff", icon: SchoolIcon },
  { value: "external_vendor", label: "External Vendor", icon: LocalShippingIcon },
  { value: "procurement_entity", label: "Procurement Entity", icon: BadgeIcon },
  { value: "dpc", label: "DPC", icon: CheckCircleIcon },
];

const VENDOR_CATEGORY_OPTIONS = [
  "Air Conditioners & Accessories",
  "Animal Feed & Veterinary Drugs",
  "Audio & Visual Systems",
  "Book Binding & Paper Finishing Materials",
  "Books & Publications",
  "Building & Construction Materials",
  "Cameras & Photography Equipment",
  "Cell Culture & Biological Materials",
  "Cement & Precast Products",
  "CIDA EM1-EM3 Contractors",
  "CIDA Registered Contractors (Bridge)",
  "CIDA Registered Contractors (Building)",
  "CIDA Registered Contractors (Highway)",
  "CIDA Registered Contractors (Water Supply & Drainage)",
  "Computer Hardware & Software",
  "Construction & Maintenance",
  "Curtain Materials & Accessories",
  "Electrical & Electronic Appliances",
  "Electrical Wiring & Fittings",
  "Fertilizers & Agro Chemicals",
  "Fibre Glass & Plastic Products",
  "Fire Safety Equipment",
  "General Hardware & Tools",
  "General Laboratory Chemicals",
  "Kitchen Utensils & Cutlery",
  "Laboratory Chemicals (Specialized)",
  "Laboratory Equipment",
  "Laboratory Glassware & Plasticware",
  "Landscaping",
  "Machinery & Industrial Equipment",
  "Maintenance of Air Conditioners",
  "Medical & Dental Consumables",
  "Medical Equipment",
  "Motor Spare Parts",
  "Office Equipment",
  "Pest Control Service",
  "Photography & Videography",
  "Printing & Binding of Books",
  "Printing & Supply of ID Cards",
  "Rebuilding & Retreading of Tyres",
  "Repair & Maintenance of Computers & Networks",
  "Repair of Electrical Appliances",
  "Repair of Gas Systems",
  "Repair of Laboratory Equipment",
  "Repair of Motor Vehicle",
  "Repair of Motor Cycles",
  "Repair of Office Equipment",
  "Repair of Three Wheelers",
  "Repair of Tractors",
  "Rubber Items, Seals & Stamps",
  "Safety Equipment",
  "Sanitary & Cleaning Items",
  "Sawn Timber & Wood Products",
  "Security Systems",
  "Service & Lubrication of Motor Vehicles",
  "Service & Lubrication of Motorcycles",
  "Service & Lubrication of Three Wheelers",
  "Sports Goods",
  "Stationery & Office Consumables",
  "Steel Furniture",
  "Supply & Operation of Earth Moving Equipment",
  "Teaching & Workshop Equipment",
  "Toner Cartridges & Master Rolls",
  "Transport Services",
  "Tree Removal & Landscaping Services",
  "Tyres & Tubes",
  "Uniform Materials & Accessories",
  "University Ceremony Items",
  "Vehicle & Motorcycle Batteries",
  "Vehicles & Transport Equipment",
  "Wheel Alignment Services",
  "Wooden Furniture",
];

export default function Register({ openLogin, onSizeChange }) {
  const googleButtonRef = useRef(null);
  const googleInitializedRef = useRef(false);
  const googleRegisterPayloadRef = useRef({});
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const { googleRegister } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { accountType: "university_staff", mainRole: "FACULTY_STAFF", subRole: "", categories: [] } });

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState(1);
  const [submitState, setSubmitState] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [divisions, setDivisions] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [divisionError, setDivisionError] = useState("");
  const [facultyError, setFacultyError] = useState("");
  const [vendorCategorySearch, setVendorCategorySearch] = useState("");

  const selectedSubRole = watch("subRole");
  const selectedFacultyId = watch("facultyId");
  const selectedDivisionId = watch("divisionId");
  const accountType = watch("accountType");
  const selectedCategories = watch("categories") || [];
  const password = watch("password");
  const isUniversityStaff = accountType === "university_staff";
  const isExternalVendor = accountType === "external_vendor";
  const isProcurementEntity = accountType === "procurement_entity";
  const isDpc = accountType === "dpc";
  const facultyDivisions = useMemo(() => {
    if (!selectedFacultyId) return [];
    return divisions.filter((division) => String(division.facultyId) === String(selectedFacultyId));
  }, [divisions, selectedFacultyId]);
  const selectedDivision = divisions.find((division) => String(division.divisionId) === String(selectedDivisionId));
  const isAdministrativeDivision = selectedDivision?.divisionName?.trim().toLowerCase() === "administrative";
  const roleOptions = isProcurementEntity
    ? FINANCE_ROLE_OPTIONS
    : isUniversityStaff && isAdministrativeDivision
      ? ADMINISTRATIVE_ROLE_OPTIONS
      : STAFF_ROLE_OPTIONS;
  const filteredVendorCategories = VENDOR_CATEGORY_OPTIONS.filter((category) =>
    category.toLowerCase().includes(vendorCategorySearch.trim().toLowerCase())
  );
  const strength = getStrength(password);
  const strengthConfig = STRENGTH_CONFIG[Math.max(strength - 1, 0)];
  const isRoleReady = isExternalVendor
    || isDpc
    || (isProcurementEntity && !!selectedFacultyId && !!selectedSubRole)
    || (isUniversityStaff && !!selectedFacultyId && !!selectedDivisionId && !!selectedSubRole);
  googleRegisterPayloadRef.current = {
    mainRole: isExternalVendor ? "VENDOR" : isDpc ? "DPC" : isProcurementEntity ? "FINANCE" : "FACULTY_STAFF",
    subRole: isExternalVendor || isDpc ? null : selectedSubRole,
    universityAffiliated: isUniversityStaff || isProcurementEntity,
    registrationType: isExternalVendor ? "VENDOR" : isDpc ? "DPC" : isProcurementEntity ? "PROCUREMENT_ENTITY" : "INTERNAL",
    facultyId: isUniversityStaff || isProcurementEntity ? Number(selectedFacultyId) : null,
    divisionId: isUniversityStaff ? Number(selectedDivisionId) : null,
  };

  useEffect(() => {
    if (isExternalVendor) {
      setValue("mainRole", "VENDOR");
      setValue("subRole", "");
      setValue("facultyId", "");
      setValue("divisionId", "");
    } else if (isDpc) {
      setValue("mainRole", "DPC");
      setValue("subRole", "");
      setValue("facultyId", "");
      setValue("divisionId", "");
    } else if (isProcurementEntity) {
      setValue("mainRole", "FINANCE");
      setValue("divisionId", "");
    } else {
      setValue("mainRole", "FACULTY_STAFF");
    }
  }, [isDpc, isExternalVendor, isProcurementEntity, setValue]);

  useEffect(() => {
    onSizeChange?.(isExternalVendor && step === 2 ? "md" : "sm");
    return () => onSizeChange?.("sm");
  }, [isExternalVendor, onSizeChange, step]);

  useEffect(() => {
    if (!isExternalVendor && !isDpc && selectedSubRole && !roleOptions.some((role) => role.value === selectedSubRole)) {
      setValue("subRole", "");
    }
  }, [isDpc, isExternalVendor, roleOptions, selectedSubRole, setValue]);

  useEffect(() => {
    if (selectedDivisionId && !facultyDivisions.some((division) => String(division.divisionId) === String(selectedDivisionId))) {
      setValue("divisionId", "");
    }
  }, [facultyDivisions, selectedDivisionId, setValue]);

  useEffect(() => {
    let ignore = false;
    const loadLookups = async () => {
      try {
        const [divisionResponse, facultyResponse] = await Promise.all([
          fetch("/api/divisions"),
          fetch("/api/admin/faculties/active"),
        ]);
        const divisionBody = await divisionResponse.json().catch(() => ({}));
        const facultyBody = await facultyResponse.json().catch(() => ({}));
        if (!divisionResponse.ok) {
          throw new Error(divisionBody?.message || "Could not load divisions");
        }
        if (!facultyResponse.ok) {
          throw new Error(facultyBody?.message || "Could not load faculties");
        }
        if (!ignore) {
          setDivisions(Array.isArray(divisionBody?.data) ? divisionBody.data : []);
          setFaculties(Array.isArray(facultyBody?.data) ? facultyBody.data : []);
          setDivisionError("");
          setFacultyError("");
        }
      } catch (error) {
        if (!ignore) {
          setDivisionError(error.message || "Could not load divisions");
          setFacultyError(error.message || "Could not load faculties");
        }
      }
    };
    loadLookups();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    document.title = "Astraea · Create Account";

    const style = document.createElement("style");
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
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current || !isRoleReady) {
      return undefined;
    }

    let cancelled = false;

    const initialiseGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      const handleGoogleCredential = async (response) => {
        setErrorMsg("");
        setIsGoogleLoading(true);

        try {
          const result = await googleRegister({
            idToken: response.credential,
            ...googleRegisterPayloadRef.current,
          });

          setSuccessMessage(result?.message || "Google sign-up submitted. Awaiting admin approval.");
          setSubmitState("success");
        } catch (error) {
          console.error("Google registration failed:", error);
          setErrorMsg(error.message || "Google sign-up failed. Please try again.");
          setSubmitState("error");
        } finally {
          setIsGoogleLoading(false);
        }
      };

      window.__astraeaGoogleIdentityHandler = handleGoogleCredential;
      if (!window.__astraeaGoogleIdentityInitialized) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => window.__astraeaGoogleIdentityHandler?.(response),
        });
        window.__astraeaGoogleIdentityInitialized = true;
        googleInitializedRef.current = true;
      }

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signup_with",
        width: 320,
      });

      setIsGoogleReady(true);
    };

    const existingScript = document.querySelector('script[data-google-identity="true"]');
    if (existingScript && window.google?.accounts?.id) {
      initialiseGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    const script = existingScript || document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = initialiseGoogleButton;
    script.onerror = () => {
      if (!cancelled) {
        setErrorMsg("Google Sign-Up could not be loaded. Check your internet connection.");
      }
    };

    if (!existingScript) {
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [googleClientId, googleRegister, isDpc, isExternalVendor, isProcurementEntity, isRoleReady, isUniversityStaff, selectedDivisionId, selectedFacultyId, selectedSubRole]);

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      setError("confirmPassword", { message: "Passwords do not match" });
      return;
    }

    const businessRegistrationFile = data.businessRegistrationDocument?.[0] || null;
    const vatFile = data.vatDocument?.[0] || null;
    const cidaFile = data.cidaDocument?.[0] || null;

    const oversizedFile = [businessRegistrationFile, vatFile, cidaFile]
      .find((file) => file && file.size > MAX_VENDOR_DOCUMENT_SIZE_BYTES);
    if (oversizedFile) {
      setErrorMsg(`${oversizedFile.name} is larger than ${MAX_VENDOR_DOCUMENT_SIZE_LABEL}. Please upload a smaller PDF.`);
      setSubmitState("error");
      return;
    }

    const payload = {
      username: data.username,
      email: data.email,
      password: data.password,
      universityAffiliated: isUniversityStaff || isProcurementEntity,
      registrationType: isExternalVendor ? "VENDOR" : isDpc ? "DPC" : isProcurementEntity ? "PROCUREMENT_ENTITY" : "INTERNAL",
      mainRole: isExternalVendor ? "VENDOR" : isDpc ? "DPC" : isProcurementEntity ? "FINANCE" : "FACULTY_STAFF",
      subRole: isExternalVendor || isDpc ? null : data.subRole,
      facultyId: isUniversityStaff || isProcurementEntity ? Number(data.facultyId) : null,
      divisionId: isUniversityStaff ? Number(data.divisionId) : null,
      universityId: isExternalVendor ? null : data.universityId,
      vendorName: data.vendorName || null,
      companyRegistrationNumber: data.companyRegistrationNumber || null,
      category: Array.isArray(data.categories) ? data.categories.join(", ") : data.category || null,
      categories: Array.isArray(data.categories) ? data.categories : [],
      otherCategory: data.otherCategory || null,
      contactPerson: data.contactPerson || null,
      phone: data.phone || null,
      address: data.address || null,
      businessRegistrationDocumentName: businessRegistrationFile?.name || null,
      businessRegistrationDocument: isExternalVendor ? await fileToDataUrl(businessRegistrationFile) : null,
      vatDocumentName: vatFile?.name || null,
      vatDocument: isExternalVendor ? await fileToDataUrl(vatFile) : null,
      cidaDocumentName: cidaFile?.name || null,
      cidaDocument: isExternalVendor ? await fileToDataUrl(cidaFile) : null,
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.message || `Server error (${res.status})`);
      }

      setSuccessMessage(body.message || "Registration submitted. Awaiting admin approval.");
      setSubmitState("success");
    } catch (error) {
      setErrorMsg(error.message || "Cannot reach the server. Please check your connection.");
      setSubmitState("error");
    }
  };

  if (submitState === "success") {
    return (
      <div className="w-full px-6 py-6 animate-slideUp md:px-8 md:py-8">
        <div className="max-w-sm px-6 py-5 mx-auto mb-6 border border-[#dbe7ee] bg-[linear-gradient(145deg,#ffffff,#f2f8fb)] rounded-[28px] shadow-[0_18px_38px_rgba(15,41,64,0.08)]">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="flex-shrink-0">
              <img
                src="/Images/Logo/Astraea_Logo-removebg-preview.png"
                alt="Astraea Logo"
                className="object-contain w-44 h-auto sm:w-48"
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="mb-1 text-2xl font-bold text-gray-800">Account Created!</h1>
              <p className="text-sm text-gray-600">Your registration has been submitted for review</p>
            </div>
          </div>
        </div>

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

        <div className="p-5 mt-4 text-center border border-[#dbe7ee] bg-[#f7fbfd] rounded-[24px]">
          <h5 className="mb-1 text-sm font-semibold text-gray-700">Astraea E-Procurement Platform</h5>
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Astraea. All rights reserved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 animate-slideUp md:px-8 md:py-8">
      <div className="px-6 py-5 mx-auto mb-6 border border-[#dbe7ee] bg-[linear-gradient(145deg,#ffffff,#f2f8fb)] rounded-[28px] shadow-[0_18px_38px_rgba(15,41,64,0.08)]">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex-shrink-0">
            <img
              src="/Images/Logo/Astraea_Logo-removebg-preview.png"
              alt="Astraea Logo"
              className="object-contain w-44 h-auto sm:w-48"
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="mb-1 text-2xl font-bold text-gray-800">Create Account</h1>
            <p className="text-sm text-gray-600">Choose your role first, then complete sign-up</p>
          </div>
        </div>
      </div>

      <div className="px-8 pt-2 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>1</div>
            <span className={`text-sm ${step === 1 ? "text-blue-600 font-medium" : "text-gray-400"}`}>
              Role & Access
            </span>
          </div>
          <div className="flex-1 h-0.5 mx-4 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full bg-blue-600 transition-all duration-300 ${step === 2 ? "w-full" : "w-0"}`} />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>2</div>
            <span className={`text-sm ${step === 2 ? "text-blue-600 font-medium" : "text-gray-400"}`}>
              Account Details
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-1 pb-2 md:px-2">
        {step === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">
                Account Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {ACCOUNT_TYPE_OPTIONS.map(({ value, label, icon: OptionIcon }) => (
                  <label key={value} className={`cursor-pointer rounded-xl border-2 p-4 transition ${accountType === value ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}>
                    <input type="radio" value={value} {...register("accountType")} className="sr-only" />
                    <OptionIcon className={accountType === value ? "text-blue-600" : "text-gray-400"} />
                    <p className="mt-2 text-sm font-semibold text-gray-700">{label}</p>
                  </label>
                ))}
              </div>
            </div>

            {(isUniversityStaff || isProcurementEntity) && (
              <div className="space-y-1.5">
                <label htmlFor="facultyId" className="block text-sm font-semibold text-gray-700">
                  Faculty <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <SchoolIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
                  <select
                    id="facultyId"
                    {...register("facultyId", { required: isUniversityStaff || isProcurementEntity ? "Please select your faculty" : false })}
                    className="w-full py-3 pl-10 pr-10 text-sm transition-colors bg-white border-2 border-gray-200 appearance-none rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={isSubmitting}
                  >
                    <option value="">Select your faculty</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id || faculty.facultyId} value={faculty.id || faculty.facultyId}>
                        {faculty.facultyName}
                      </option>
                    ))}
                  </select>
                  <ExpandMoreIcon className="absolute text-gray-400 pointer-events-none right-3" style={{ fontSize: 18 }} />
                </div>
                {facultyError && <p className="text-xs text-red-500">{facultyError}</p>}
                {errors.facultyId && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                    <ErrorIcon style={{ fontSize: 12 }} /> {errors.facultyId.message}
                  </p>
                )}
              </div>
            )}

            {isUniversityStaff && (
              <div className="space-y-1.5">
                <label htmlFor="divisionId" className="block text-sm font-semibold text-gray-700">
                  Division <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <SchoolIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
                  <select
                    id="divisionId"
                    {...register("divisionId", { required: isUniversityStaff ? "Please select your division" : false })}
                    className="w-full py-3 pl-10 pr-10 text-sm transition-colors bg-white border-2 border-gray-200 appearance-none rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={isSubmitting || !selectedFacultyId}
                  >
                    <option value="">{selectedFacultyId ? "Select your division" : "Select a faculty first"}</option>
                    {facultyDivisions.map((division) => (
                      <option key={division.divisionId} value={division.divisionId}>
                        {division.divisionName}
                      </option>
                    ))}
                  </select>
                  <ExpandMoreIcon className="absolute text-gray-400 pointer-events-none right-3" style={{ fontSize: 18 }} />
                </div>
                {divisionError && <p className="text-xs text-red-500">{divisionError}</p>}
                {errors.divisionId && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                    <ErrorIcon style={{ fontSize: 12 }} /> {errors.divisionId.message}
                  </p>
                )}
              </div>
            )}

            {(isUniversityStaff || isProcurementEntity) && (
              <div className="space-y-1.5">
                <label htmlFor="subRole" className="block text-sm font-semibold text-gray-700">
                  {isProcurementEntity ? "Procurement Role" : "Role in Division"} <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <BadgeIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
                  <select
                    id="subRole"
                    {...register("subRole", { required: isUniversityStaff || isProcurementEntity ? "Please select your position" : false })}
                    className="w-full py-3 pl-10 pr-10 text-sm transition-colors bg-white border-2 border-gray-200 appearance-none rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                    disabled={isSubmitting}
                  >
                    <option value="">Select your position</option>
                    {roleOptions.map((subRole) => (
                      <option key={subRole.value} value={subRole.value}>
                        {subRole.label}
                      </option>
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

            {isExternalVendor && (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                Vendor registration documents are submitted for DPC review before catalog and bidding access is enabled.
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!isRoleReady}
                className="flex items-center justify-center w-full gap-2 px-4 py-3 mt-2 font-semibold text-white transition-colors bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Account Details
                <ArrowForwardIcon style={{ fontSize: 18 }} />
              </button>

              <p className="text-sm font-semibold text-gray-700">Sign up with Google</p>
              {!googleClientId && (
                <p className="text-xs text-amber-600">Set `VITE_GOOGLE_CLIENT_ID` to enable Google Sign-Up.</p>
              )}

              {!isRoleReady ? (
                <div title="You must select the role before sign up">
                  <button
                    type="button"
                    disabled
                    className="flex items-center justify-center w-full gap-2 px-4 py-3 font-semibold text-gray-400 transition-colors bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed"
                  >
                    <GoogleIcon style={{ fontSize: 20 }} />
                    Sign up with Google
                  </button>
                </div>
              ) : (
                <>
                  <div
                    ref={googleButtonRef}
                    className={`min-h-[46px] w-full overflow-hidden rounded-xl border border-gray-200 bg-white ${!googleClientId ? "hidden" : ""}`}
                  />
                  {googleClientId && !isGoogleReady && (
                    <div className="flex items-center justify-center w-full px-4 py-3 text-sm text-gray-500 border border-gray-200 rounded-xl">
                      Loading Google Sign-Up...
                    </div>
                  )}
                </>
              )}

              {isGoogleLoading && (
                <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                  <HourglassEmptyIcon style={{ fontSize: 18 }} className="animate-spin" />
                  Registering your Google account...
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-medium tracking-wide text-gray-400 uppercase">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {submitState === "error" && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
                <p className="flex items-center gap-2 text-sm text-red-600">
                  <ErrorIcon style={{ fontSize: 18 }} /> {errorMsg}
                </p>
              </div>
            )}

          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            {!isExternalVendor && (
              <div className="space-y-1.5">
                <label htmlFor="universityId" className="block text-sm font-semibold text-gray-700">
                  University ID / PF Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <BadgeIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
                  <input
                    id="universityId"
                    type="text"
                    {...register("universityId", { required: !isExternalVendor ? "University ID / PF Number is required" : false })}
                    placeholder="Enter your University ID / PF Number"
                    className="w-full py-3 pl-10 pr-4 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.universityId && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                    <ErrorIcon style={{ fontSize: 12 }} /> {errors.universityId.message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <PersonIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
                <input
                  id="username"
                  type="text"
                  {...register("username", {
                    required: "Username is required",
                    minLength: { value: 4, message: "Min 4 characters" },
                    maxLength: { value: 50, message: "Max 50 characters" },
                    pattern: { value: /^[a-zA-Z0-9_]+$/, message: "Only letters, numbers & underscores" },
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

            {isExternalVendor && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="vendorName" className="block text-sm font-semibold text-gray-700">
                    Vendor / Company Name <span className="text-red-500">*</span>
                  </label>
                  <input id="vendorName" type="text" {...register("vendorName", { required: isExternalVendor ? "Vendor name is required" : false })} className="w-full py-3 px-4 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300" disabled={isSubmitting} />
                  {errors.vendorName && <p className="text-xs text-red-500">{errors.vendorName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="companyRegistrationNumber" className="block text-sm font-semibold text-gray-700">Registration Number</label>
                  <input id="companyRegistrationNumber" type="text" {...register("companyRegistrationNumber")} className="w-full py-3 px-4 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300" disabled={isSubmitting} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Supplier Categories <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="search"
                    value={vendorCategorySearch}
                    onChange={(event) => setVendorCategorySearch(event.target.value)}
                    placeholder="Search supplier categories"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:outline-none hover:border-gray-300"
                    disabled={isSubmitting}
                  />
                  <div className="grid max-h-64 gap-2 overflow-y-auto rounded-xl border-2 border-gray-200 bg-white p-3 md:grid-cols-2">
                    {filteredVendorCategories.map((category) => (
                      <label key={category} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-blue-50">
                        <input
                          type="checkbox"
                          value={category}
                          {...register("categories", {
                            validate: (value) => !isExternalVendor || (Array.isArray(value) && value.length > 0) || "Select at least one supplier category",
                          })}
                          className="mt-1"
                          disabled={isSubmitting}
                        />
                        <span>{category}</span>
                      </label>
                    ))}
                    {filteredVendorCategories.length === 0 && (
                      <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500 md:col-span-2">No matching categories.</div>
                    )}
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-700 hover:bg-blue-50">
                      <input type="checkbox" value="Other" {...register("categories")} className="mt-1" disabled={isSubmitting} />
                      <span>Other</span>
                    </label>
                  </div>
                  {selectedCategories.includes("Other") && (
                    <input
                      id="otherCategory"
                      type="text"
                      {...register("otherCategory", { required: selectedCategories.includes("Other") ? "Please enter the other category" : false })}
                      placeholder="Enter other supplier category"
                      className="w-full px-4 py-3 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                      disabled={isSubmitting}
                    />
                  )}
                  {errors.categories && <p className="text-xs text-red-500">{errors.categories.message}</p>}
                  {errors.otherCategory && <p className="text-xs text-red-500">{errors.otherCategory.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="contactPerson" className="block text-sm font-semibold text-gray-700">Contact Person</label>
                  <input id="contactPerson" type="text" {...register("contactPerson")} className="w-full py-3 px-4 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300" disabled={isSubmitting} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">Phone</label>
                  <input id="phone" type="text" {...register("phone")} className="w-full py-3 px-4 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300" disabled={isSubmitting} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="address" className="block text-sm font-semibold text-gray-700">Address</label>
                  <input id="address" type="text" {...register("address")} className="w-full py-3 px-4 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300" disabled={isSubmitting} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="businessRegistrationDocument" className="block text-sm font-semibold text-gray-700">
                    Business Registration Certificate <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="businessRegistrationDocument"
                    type="file"
                    accept="application/pdf"
                    {...register("businessRegistrationDocument", {
                      required: isExternalVendor ? "Business registration certificate is required" : false,
                      validate: validateVendorDocumentSize,
                    })}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-colors file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                    disabled={isSubmitting}
                  />
                  {errors.businessRegistrationDocument && <p className="text-xs text-red-500">{errors.businessRegistrationDocument.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="vatDocument" className="block text-sm font-semibold text-gray-700">
                    VAT Certificate / Exemption Letter
                  </label>
                  <input
                    id="vatDocument"
                    type="file"
                    accept="application/pdf"
                    {...register("vatDocument", { validate: validateVendorDocumentSize })}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-colors file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cidaDocument" className="block text-sm font-semibold text-gray-700">
                    CIDA Certificate
                  </label>
                  <input
                    id="cidaDocument"
                    type="file"
                    accept="application/pdf"
                    {...register("cidaDocument", { validate: validateVendorDocumentSize })}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-colors file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <EmailIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
                <input
                  id="email"
                  type="email"
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email address" },
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
                    required: "Password is required",
                    minLength: { value: 8, message: "Min 8 characters" },
                  })}
                  placeholder="Enter your password"
                  className="w-full py-3 pl-10 pr-10 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute text-gray-400 transition-colors right-3 hover:text-blue-600"
                  disabled={isSubmitting}
                >
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
                    {[0, 1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className={`h-1.5 flex-1 rounded-full transition-all ${index < strength ? strengthConfig.color : "bg-gray-200"}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${strengthConfig.textColor} font-medium`}>
                    Password Strength: {strengthConfig.label}
                  </p>
                </div>
              )}
            </div>

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
                    validate: (value) => value === password || "Passwords do not match",
                  })}
                  placeholder="Confirm your password"
                  className="w-full py-3 pl-10 pr-10 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute text-gray-400 transition-colors right-3 hover:text-blue-600"
                  disabled={isSubmitting}
                >
                  {showConfirm ? <VisibilityOffIcon style={{ fontSize: 18 }} /> : <VisibilityIcon style={{ fontSize: 18 }} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <ErrorIcon style={{ fontSize: 12 }} /> {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {submitState === "error" && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
                <p className="flex items-center gap-2 text-sm text-red-600">
                  <ErrorIcon style={{ fontSize: 18 }} /> {errorMsg}
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center justify-center flex-1 gap-2 px-4 py-3 font-semibold text-gray-600 transition-colors border-2 border-gray-300 rounded-xl hover:border-blue-400 hover:text-blue-600"
                disabled={isSubmitting}
              >
                <ArrowBackIcon style={{ fontSize: 18 }} /> Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting
                  ? <><HourglassEmptyIcon style={{ fontSize: 18 }} className="animate-spin" /> Creating Account...</>
                  : "Create Account"}
              </button>
            </div>
          </div>
        )}
      </form>

      <div className="pb-4 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <button type="button" onClick={() => openLogin?.()} className="font-medium text-blue-600 transition-colors hover:text-blue-800">
            Sign in
          </button>
        </p>
      </div>

      <div className="p-5 mt-3 text-center border border-[#dbe7ee] bg-[#f7fbfd] rounded-[24px]">
        <h5 className="mb-1 text-sm font-semibold text-gray-700">Astraea E-Procurement Platform</h5>
        <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Astraea. All rights reserved.</p>
      </div>
    </div>
  );
}
