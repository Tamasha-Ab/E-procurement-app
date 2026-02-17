// src/pages/Login/Login.jsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";

// Material UI Icons
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

function Login({ onClose, openRegister }) {
  useEffect(() => {
    document.title = "Astraea - Sign In";

    // Add keyframe animations (same as register page)
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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const onSubmit = async (data) => {
    setLoginError("");
    try {
      const creds = { username: data.username, password: data.password };
      const res = await login(creds);
      if (res?.user?.role === "Admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setLoginError(err.message || "Invalid email or password. Please try again.");
    }
  };

  return (
    <div className="w-full animate-slideUp">
      {/* Branding header - logo left, text right */}
      <div className="px-6 py-4 mx-auto mb-6 bg-white rounded-2xl">
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
            <h1 className="mb-1 text-2xl font-bold text-gray-800">Welcome Back</h1>
            <p className="text-sm text-gray-600">Sign in to manage procurement</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-6">
        <div className="space-y-5 animate-fadeIn">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <PersonIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
              <input
                id="username"
                type="text"
                autoComplete="username"
                {...register("username", {
                  required: "Username is required",
                  minLength: { value: 3, message: "Please enter a valid username" }
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
            {/* <p className="mt-1 text-xs text-gray-500">Use your account username (not your email).</p> */}
          </div>

          {/* Password Field */}
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
                {showPassword ? 
                  <VisibilityOffIcon style={{ fontSize: 18 }} /> : 
                  <VisibilityIcon style={{ fontSize: 18 }} />
                }
              </button>
            </div>
            {errors.password && (
              <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                <ErrorIcon style={{ fontSize: 12 }} /> {errors.password.message}
              </p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={isSubmitting}
              />
              <span className="ml-2">Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => {/* Handle forgot password */}}
              className="font-medium text-blue-600 transition-colors hover:text-blue-800"
              disabled={isSubmitting}
            >
              Forgot password?
            </button>
          </div>

          {/* Login Error */}
          {loginError && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
              <p className="flex items-center gap-2 text-sm text-red-600">
                <ErrorIcon style={{ fontSize: 18 }} /> {loginError}
              </p>
            </div>
          )}

          {/* Submit Button - matching register page style */}
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

        </div>
      </form>

      {/* Register link - matching register page style */}
      <div className="pb-4 text-center">
          <p className="text-sm text-gray-600">
          Don't have an account? {" "}
          <button type="button" onClick={() => openRegister?.()} className="font-medium text-blue-600 transition-colors hover:text-blue-800">Register here</button>
        </p>
      </div>

      {/* Footer - exactly matching register page */}
      <div className="p-6 text-center border-t border-gray-200 bg-gray-50">
        <h5 className="mb-1 text-sm font-semibold text-gray-700">
          Astraea E-Procurement Platform
        </h5>
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Astraea. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default Login;