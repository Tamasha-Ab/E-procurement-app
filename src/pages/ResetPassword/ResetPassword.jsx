import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LockIcon from "@mui/icons-material/Lock";
import ErrorIcon from "@mui/icons-material/Error";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const tokenFromLink = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData(event.currentTarget);
    const resetToken = String(formData.get("resetToken") || "").trim();
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (!resetToken) {
      setError("Reset token is required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPassword(resetToken, newPassword);
      setSuccess(result.message || "Password reset successful.");
      event.currentTarget.reset();
      setTimeout(() => navigate("/"), 1400);
    } catch (submitError) {
      setError(submitError.message || "Could not reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-10 bg-slate-100">
      <div className="w-full max-w-md bg-white shadow-xl rounded-3xl">
        <div className="px-8 py-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Reset Password</h1>
          <p className="mt-2 text-sm text-gray-500">
            Set a new password for your Astraea account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="resetToken" className="block text-sm font-semibold text-gray-700">
              Reset Token
            </label>
            <input
              id="resetToken"
              name="resetToken"
              defaultValue={tokenFromLink}
              className="w-full px-4 py-3 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700">
              New Password
            </label>
            <div className="relative flex items-center">
              <LockIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? "text" : "password"}
                className="w-full py-3 pl-10 pr-10 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute text-gray-400 transition-colors right-3 hover:text-blue-600"
              >
                {showPassword ? <VisibilityOffIcon style={{ fontSize: 18 }} /> : <VisibilityIcon style={{ fontSize: 18 }} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
              Confirm New Password
            </label>
            <div className="relative flex items-center">
              <LockIcon className="absolute text-gray-400 left-3" style={{ fontSize: 18 }} />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="w-full py-3 pl-10 pr-10 text-sm transition-colors border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none hover:border-gray-300"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute text-gray-400 transition-colors right-3 hover:text-blue-600"
              >
                {showConfirmPassword ? <VisibilityOffIcon style={{ fontSize: 18 }} /> : <VisibilityIcon style={{ fontSize: 18 }} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 border border-red-200 bg-red-50 rounded-xl text-sm text-red-600 flex items-center gap-2">
              <ErrorIcon style={{ fontSize: 18 }} /> {error}
            </div>
          )}

          {success && (
            <div className="p-3 border border-emerald-200 bg-emerald-50 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircleIcon style={{ fontSize: 18 }} /> {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center w-full gap-2 px-4 py-3 font-semibold text-white transition-colors bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <HourglassEmptyIcon style={{ fontSize: 18 }} className="animate-spin" />
                Updating Password...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
