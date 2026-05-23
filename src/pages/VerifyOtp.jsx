import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { authApi } from '../features/auth'
import { pendingVerificationStorage } from '../features/auth/api/pendingVerificationStorage'
import { getApiMessage } from '../shared/api'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateVerifyOtpForm({ email, otp }) {
  if (!email) return 'Email không được để trống'
  if (!EMAIL_REGEX.test(email)) return 'Email không đúng định dạng'
  if (!otp) return 'OTP không được để trống'
  return ''
}

function VerifyOtp() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialEmail = useMemo(
    () => location.state?.email || pendingVerificationStorage.getEmail(),
    [location.state?.email],
  )

  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState(location.state?.successMessage || '')

  const handleSubmit = async (e) => {
    e.preventDefault()

    const payload = {
      email: email.trim(),
      otp: otp.trim(),
    }

    const validationMessage = validateVerifyOtpForm(payload)
    if (validationMessage) {
      setErrorMessage(validationMessage)
      setSuccessMessage('')
      return
    }

    setErrorMessage('')
    setIsLoading(true)

    try {
      await authApi.verifyOtp(payload)
      pendingVerificationStorage.clearEmail()
      navigate('/login', {
        state: {
          successMessage: 'Xác thực OTP thành công. Bạn có thể đăng nhập ngay.',
        },
        replace: true,
      })
    } catch (error) {
      setSuccessMessage('')
      setErrorMessage(getApiMessage(error, 'Xác thực OTP thất bại. Vui lòng kiểm tra lại mã OTP.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link
            to="/"
            className="text-4xl font-light tracking-[0.35em] text-black uppercase hover:opacity-75 transition-all duration-300 inline-block"
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
              id="verify-email"
              type="email"
              value={email}
              onChange={(e) => {
                const nextEmail = e.target.value
                setEmail(nextEmail)
                pendingVerificationStorage.setEmail(nextEmail.trim())
                setErrorMessage('')
                setSuccessMessage('')
              }}
              required
              placeholder=" "
              className="peer w-full h-13 px-4 pt-5 pb-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white outline-none focus:border-black transition-all duration-300"
            />
            <label
              htmlFor="verify-email"
              className="absolute left-4 top-2 text-[11px] text-neutral-400 uppercase tracking-wider transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-black"
            >
              Email
            </label>
          </div>

          <div className="relative">
            <input
              id="verify-otp"
              type="text"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\s/g, ''))
                setErrorMessage('')
                setSuccessMessage('')
              }}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder=" "
              className="peer w-full h-13 px-4 pt-5 pb-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white outline-none focus:border-black transition-all duration-300"
            />
            <label
              htmlFor="verify-otp"
              className="absolute left-4 top-2 text-[11px] text-neutral-400 uppercase tracking-wider transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-black"
            >
              Mã OTP
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-black text-white text-sm font-semibold uppercase tracking-widest rounded-lg hover:bg-neutral-800 active:scale-[0.98] transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              'Xác thực OTP'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-neutral-500">
          Chưa có mã OTP?{' '}
          <Link
            to="/register"
            className="text-black font-semibold hover:underline underline-offset-4 transition-all"
          >
            Đăng ký lại
          </Link>
        </p>
      </div>
    </div>
  )
}

export default VerifyOtp
