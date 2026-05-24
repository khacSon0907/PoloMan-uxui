import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { authApi } from '../features/auth'
import { getApiData, getApiMessage } from '../shared/api'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTP_LENGTH = 6

function getResetToken(response) {
  const data = getApiData(response)
  return data?.resetToken || data?.token || ''
}

function ForgotPassword() {
  const navigate = useNavigate()
  const otpInputRefs = useRef([])
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''))
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSendOtp = async (e) => {
    e.preventDefault()

    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      setErrorMessage('Email không được để trống')
      setSuccessMessage('')
      return
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setErrorMessage('Email không đúng định dạng')
      setSuccessMessage('')
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      await authApi.forgotPassword({ email: normalizedEmail })
      setSubmittedEmail(normalizedEmail)
      setOtpDigits(Array(OTP_LENGTH).fill(''))
      setStep('otp')
      setSuccessMessage('Mã xác nhận đã được gửi đến email của bạn.')
      window.setTimeout(() => {
        otpInputRefs.current[0]?.focus()
      }, 0)
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Gửi mã xác nhận thất bại. Vui lòng kiểm tra lại email.'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const nextDigits = [...otpDigits]

    nextDigits[index] = digit
    setOtpDigits(nextDigits)
    setErrorMessage('')

    if (digit && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key !== 'Backspace' || otpDigits[index] || index === 0) return

    otpInputRefs.current[index - 1]?.focus()
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()

    const pastedOtp = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pastedOtp) return

    const nextDigits = Array(OTP_LENGTH).fill('')
    pastedOtp.split('').forEach((digit, index) => {
      nextDigits[index] = digit
    })

    setOtpDigits(nextDigits)
    otpInputRefs.current[Math.min(pastedOtp.length, OTP_LENGTH) - 1]?.focus()
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const otp = otpDigits.join('')

    if (otp.length !== OTP_LENGTH) {
      setErrorMessage('Vui lòng nhập đủ 6 chữ số OTP')
      setSuccessMessage('')
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      const response = await authApi.verifyForgotPasswordOtp({
        email: submittedEmail,
        otp,
      })
      const token = getResetToken(response)

      if (!token) {
        throw new Error('Không tìm thấy reset token')
      }

      setResetToken(token)
      setStep('reset')
      setSuccessMessage('Xác thực OTP thành công. Vui lòng đặt mật khẩu mới.')
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Xác thực OTP thất bại. Vui lòng kiểm tra lại mã OTP.'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()

    if (!newPassword) {
      setErrorMessage('Mật khẩu mới không được để trống')
      setSuccessMessage('')
      return
    }

    if (newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
      setSuccessMessage('')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp')
      setSuccessMessage('')
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      await authApi.resetPassword({
        email: submittedEmail,
        resetToken,
        newPassword,
      })
      navigate('/login', {
        state: {
          successMessage: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
        },
        replace: true,
      })
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.'))
    } finally {
      setIsLoading(false)
    }
  }

  const resetToEmailStep = () => {
    setStep('email')
    setSubmittedEmail('')
    setOtpDigits(Array(OTP_LENGTH).fill(''))
    setResetToken('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccessMessage('')
    setErrorMessage('')
  }

  const titleByStep = {
    email: 'Khôi phục mật khẩu tài khoản',
    otp: 'Nhập mã xác nhận',
    reset: 'Đặt mật khẩu mới',
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
            {titleByStep[step]}
          </p>
        </div>

        <form
          onSubmit={
            step === 'email'
              ? handleSendOtp
              : step === 'otp'
                ? handleVerifyOtp
                : handleResetPassword
          }
          className="space-y-5"
          noValidate
        >
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

          {step === 'email' && (
            <div className="relative">
              <input
                id="forgot-password-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrorMessage('')
                  setSuccessMessage('')
                }}
                required
                placeholder=" "
                className="peer w-full h-13 px-4 pt-5 pb-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white outline-none focus:border-black transition-all duration-300"
              />
              <label
                htmlFor="forgot-password-email"
                className="absolute left-4 top-2 text-[11px] text-neutral-400 uppercase tracking-wider transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-black"
              >
                Email
              </label>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-5">
              <div className="grid grid-cols-6 gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(input) => {
                      otpInputRefs.current[index] = input
                    }}
                    type="text"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    aria-label={`OTP digit ${index + 1}`}
                    className="aspect-square w-full rounded-lg border border-neutral-300 bg-white text-center text-xl font-semibold text-neutral-950 outline-none transition-all duration-300 focus:border-black focus:ring-1 focus:ring-black"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={resetToEmailStep}
                className="text-xs text-neutral-500 underline underline-offset-4 transition-colors hover:text-black"
              >
                Nhập lại email
              </button>
            </div>
          )}

          {step === 'reset' && (
            <div className="space-y-5">
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setErrorMessage('')
                    setSuccessMessage('')
                  }}
                  required
                  placeholder=" "
                  className="peer w-full h-13 px-4 pt-5 pb-2 pr-12 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white outline-none focus:border-black transition-all duration-300"
                />
                <label
                  htmlFor="new-password"
                  className="absolute left-4 top-2 text-[11px] text-neutral-400 uppercase tracking-wider transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-black"
                >
                  Mật khẩu mới
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setErrorMessage('')
                    setSuccessMessage('')
                  }}
                  required
                  placeholder=" "
                  className="peer w-full h-13 px-4 pt-5 pb-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white outline-none focus:border-black transition-all duration-300"
                />
                <label
                  htmlFor="confirm-new-password"
                  className="absolute left-4 top-2 text-[11px] text-neutral-400 uppercase tracking-wider transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-black"
                >
                  Xác nhận mật khẩu
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-black text-white text-sm font-semibold uppercase tracking-widest rounded-lg hover:bg-neutral-800 active:scale-[0.98] transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              step === 'email' ? 'Gửi mã OTP' : step === 'otp' ? 'Xác nhận OTP' : 'Đặt lại mật khẩu'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-neutral-500">
          Nhớ mật khẩu rồi?{' '}
          <Link
            to="/login"
            className="text-black font-semibold hover:underline underline-offset-4 transition-all"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
