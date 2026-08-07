import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LockIcon from "@mui/icons-material/Lock";
import EmailIcon from "@mui/icons-material/Email";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

function Login({ onClose, openRegister }) {
  const googleButtonRef = useRef(null);
  const googleInitializedRef = useRef(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const { login, googleLogin, forgotPassword } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Astraea - Sign In";

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

  const navigateByRole = (user) => {
    if (user?.mainRole === "ADMIN") {
      navigate("/admin");
      return;
    }

    navigate("/dashboard");
    onClose?.();
  };

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return undefined;
    }

    let cancelled = false;

    const initialiseGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      if (!googleInitializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
          setLoginError("");
          setIsGoogleLoading(true);

          try {
            const result = await googleLogin(response.credential);
            if (!result?.token) {
              setLoginError(result?.message || "Your account is pending admin approval.");
              return;
            }
            navigateByRole(result.user);
          } catch (error) {
            console.error("Google login failed:", error);
            setLoginError(error.message || "Google sign-in failed. Please try again.");
          } finally {
            setIsGoogleLoading(false);
          }
        },
        });
        googleInitializedRef.current = true;
      }

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
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
        setLoginError("Google Sign-In could not be loaded. Check your internet connection.");
      }
    };

    if (!existingScript) {
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [googleClientId, googleLogin]);

  const onSubmit = async (data) => {
    setLoginError("");
    try {
      const creds = { email: data.email, password: data.password };
      const result = await login(creds);
      navigateByRole(result?.user);
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError(error.message || "Invalid email or password. Please try again.");
    }
  };

  const resetForgotState = () => {
    setShowForgotPassword(false);
    setForgotEmail("");
    setForgotMessage("");
    setForgotError("");
  };

  const handleForgotPasswordRequest = async (event) => {
    event.preventDefault();
    setForgotError("");
    setForgotMessage("");

    if (!forgotEmail.trim()) {
      setForgotError("Email is required");
      return;
    }

    setIsForgotSubmitting(true);
    try {
      const result = await forgotPassword(forgotEmail.trim());
      setForgotMessage(result.message || "Password reset email sent.");
    } catch (error) {
      setForgotError(error.message || "Could not send password reset email.");
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  return (
    <div className="w-full px-6 py-6 animate-slideUp md:px-8 md:py-8">
      <div className="mx-auto mb-6 rounded-[28px] border border-[#dbe7ee] bg-[linear-gradient(145deg,#ffffff,#f2f8fb)] px-6 py-5 shadow-[0_18px_38px_rgba(15,41,64,0.08)]">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex-shrink-0">
            <img
              src="/Images/Logo/Astraea_Logo-removebg-preview.png"
              alt="Astraea Logo"
              className="object-contain w-44 h-auto sm:w-48"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="mb-1 text-2xl font-bold text-gray-800">Welcome Back</h1>
            <p className="text-sm text-gray-600">Sign in to manage procurement</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-1 pb-2 md:px-2">
        <div className="space-y-5 animate-fadeIn">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <EmailIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Please enter a valid email address"
                  }
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
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters"
                  }
                })}
                placeholder="Enter your password"
                className="w-full py-3 pl-10 pr-10 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute text-gray-400 transition-colors right-3 hover:text-blue-600"
                disabled={isSubmitting}
              >
                {showPassword ? <VisibilityOffIcon style={{ fontSize: 18 }} /> : <VisibilityIcon style={{ fontSize: 18 }} />}
              </button>
            </div>
            {errors.password && (
              <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                <ErrorIcon style={{ fontSize: 12 }} /> {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end text-sm">
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setForgotEmail(watch("email") || "");
                setForgotError("");
                setForgotMessage("");
              }}
              className="font-medium text-blue-600 transition-colors hover:text-blue-800"
              disabled={isSubmitting}
            >
              Forgot password?
            </button>
          </div>

          {loginError && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
              <p className="flex items-center gap-2 text-sm text-red-600">
                <ErrorIcon style={{ fontSize: 18 }} /> {loginError}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center w-full gap-2 px-4 py-3 mt-4 font-semibold text-white transition-colors bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <HourglassEmptyIcon style={{ fontSize: 18 }} className="animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowForwardIcon style={{ fontSize: 18 }} />
              </>
            )}
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium tracking-wide text-gray-400 uppercase">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="space-y-2">
            {!googleClientId && (
              <p className="text-xs text-amber-600">
                Set `VITE_GOOGLE_CLIENT_ID` to enable Google Sign-In.
              </p>
            )}
            <div
              ref={googleButtonRef}
              className={`min-h-[46px] w-full overflow-hidden rounded-xl border border-gray-200 bg-white ${!googleClientId ? "hidden" : ""}`}
            />
            {googleClientId && !isGoogleReady && (
              <div className="flex items-center justify-center w-full px-4 py-3 text-sm text-gray-500 border border-gray-200 rounded-xl">
                Loading Google Sign-In...
              </div>
            )}
            {isGoogleLoading && (
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                <HourglassEmptyIcon style={{ fontSize: 18 }} className="animate-spin" />
                Verifying Google account...
              </div>
            )}
          </div>
        </div>
      </form>

      <div className="pt-2 pb-4 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <button type="button" onClick={() => openRegister?.()} className="font-medium text-blue-600 transition-colors hover:text-blue-800">
            Register here
          </button>
        </p>
      </div>

      <div className="mt-3 rounded-[24px] border border-[#dbe7ee] bg-[#f7fbfd] p-5 text-center">
        <h5 className="mb-1 text-sm font-semibold text-gray-700">
          Astraea E-Procurement Platform
        </h5>
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Astraea. All rights reserved.
        </p>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">Forgot Password</h3>
              <p className="mt-1 text-sm text-gray-500">
                Enter your email and we&apos;ll send you a password reset link.
              </p>
            </div>

            <div className="px-6 py-5">
              <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="forgotEmail" className="block text-sm font-semibold text-gray-700">
                    Email
                  </label>
                  <div className="relative flex items-center">
                    <EmailIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
                    <input
                      id="forgotEmail"
                      type="email"
                      value={forgotEmail}
                      onChange={(event) => setForgotEmail(event.target.value)}
                      placeholder="Enter your account email"
                      className="w-full py-3 pl-10 pr-4 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                      disabled={isForgotSubmitting}
                    />
                  </div>
                </div>

                {forgotMessage && (
                  <div className="p-3 border border-emerald-200 bg-emerald-50 rounded-xl text-sm text-emerald-700">
                    {forgotMessage}
                  </div>
                )}

                {forgotError && (
                  <div className="p-3 border border-red-200 bg-red-50 rounded-xl text-sm text-red-600">
                    {forgotError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetForgotState}
                    className="flex-1 px-4 py-3 font-semibold text-gray-600 transition-colors border-2 border-gray-300 rounded-xl hover:border-blue-400 hover:text-blue-600"
                    disabled={isForgotSubmitting}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="flex items-center justify-center flex-1 gap-2 px-4 py-3 font-semibold text-white transition-colors bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
                    disabled={isForgotSubmitting}
                  >
                    {isForgotSubmitting ? (
                      <>
                        <HourglassEmptyIcon style={{ fontSize: 18 }} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
