import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { authApi } from "../features/auth";
import { pendingVerificationStorage } from "../features/auth/api/pendingVerificationStorage";
import { getApiMessage } from "../shared/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateVerifyOtpForm({ email, otp }) {
  if (!email) return "Không tìm thấy email đăng ký. Vui lòng đăng ký lại.";
  if (!EMAIL_REGEX.test(email))
    return "Email đăng ký không hợp lệ. Vui lòng đăng ký lại.";
  if (!otp) return "OTP không được để trống";
  return "";
}

function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = useMemo(
    () => location.state?.email || pendingVerificationStorage.getEmail(),
    [location.state?.email],
  );

  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    location.state?.successMessage || "",
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      email: initialEmail.trim(),
      otp: otp.trim(),
    };

    const validationMessage = validateVerifyOtpForm(payload);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      setSuccessMessage("");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    try {
      await authApi.verifyOtp(payload);
      pendingVerificationStorage.clearEmail();
      navigate("/login", {
        state: {
          successMessage: "Xác thực OTP thành công. Bạn có thể đăng nhập ngay.",
        },
        replace: true,
      });
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(
        getApiMessage(
          error,
          "Xác thực OTP thất bại. Vui lòng kiểm tra lại mã OTP.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link
            to="/"
            className="inline-block text-3xl font-light uppercase tracking-[0.22em] text-emerald-600 transition-all duration-300 hover:opacity-75 sm:text-4xl sm:tracking-[0.35em]"
          >
            POLOMAN
          </Link>
          <p className="mt-3 text-sm text-neutral-500 tracking-wide">
            Xác thực email
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {successMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="relative">
            <input
              id="verify-otp"
              type="text"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\s/g, ""));
                setErrorMessage("");
                setSuccessMessage("");
              }}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder=" "
              className="peer w-full h-13 px-4 pt-5 pb-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white outline-none focus:border-emerald-600 transition-all duration-300"
            />
            <label
              htmlFor="verify-otp"
              className="absolute left-4 top-2 text-[11px] text-neutral-400 uppercase tracking-wider transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-emerald-600"
            >
              Mã OTP
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:tracking-widest"
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              "Xác thực OTP"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-neutral-500">
          Chưa có mã OTP?{" "}
          <Link
            to="/register"
            className="text-emerald-600 font-semibold hover:underline underline-offset-4 transition-all"
          >
            Đăng ký lại
          </Link>
        </p>
      </div>
    </div>
  );
}

export default VerifyOtp;
