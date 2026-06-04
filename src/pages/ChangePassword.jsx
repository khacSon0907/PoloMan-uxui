import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { authApi } from '../features/auth'
import { canChangePassword, getApiMessage, tokenStorage } from '../shared/api'

function PasswordField({
  autoComplete,
  id,
  label,
  onChange,
  showPassword,
  value,
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required
        autoComplete={autoComplete}
        placeholder=" "
        className="peer h-13 w-full rounded-xl border border-emerald-100 bg-white px-4 pb-2 pt-5 text-sm text-emerald-950 outline-none transition-all duration-300 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
      />
      <label
        htmlFor={id}
        className="absolute left-4 top-2 text-[11px] uppercase tracking-wider text-emerald-700/60 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-emerald-900"
      >
        {label}
      </label>
    </div>
  )
}

function ChangePassword() {
  const navigate = useNavigate()
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  if (!authSnapshot.isAuthenticated && !authSnapshot.isInitializing) {
    return <Navigate to="/login" replace />
  }

  if (authSnapshot.isAuthenticated && !canChangePassword(authSnapshot.user)) {
    return <Navigate to="/account" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!currentPassword) {
      setErrorMessage('Mật khẩu cũ không được để trống')
      setSuccessMessage('')
      return
    }

    if (!newPassword) {
      setErrorMessage('Mật khẩu mới không được để trống')
      setSuccessMessage('')
      return
    }

    if (newPassword.length < 8) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 8 ký tự')
      setSuccessMessage('')
      return
    }

    if (!confirmPassword) {
      setErrorMessage('Xác nhận mật khẩu không được để trống')
      setSuccessMessage('')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Xác nhận mật khẩu không khớp')
      setSuccessMessage('')
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccessMessage('Đổi mật khẩu thành công.')
    } catch (error) {
      setErrorMessage(
        getApiMessage(
          error,
          'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.'
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-96px)] bg-gradient-to-b from-white via-emerald-50/40 to-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700/60">
              Bảo mật tài khoản
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-emerald-950 sm:text-3xl">
              Đổi mật khẩu
            </h1>
            <p className="mt-3 text-sm leading-6 text-emerald-900/55">
              Cập nhật mật khẩu mới để bảo vệ tài khoản của bạn an toàn hơn.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-emerald-100 bg-white/95 p-5 shadow-[0_24px_80px_rgba(20,83,45,0.12)] backdrop-blur sm:p-8"
            noValidate
          >
            <div className="mb-6 border-b border-emerald-100 pb-5">
              <h2 className="text-base font-semibold text-emerald-950">
                Thông tin mật khẩu
              </h2>
              <p className="mt-1 text-sm text-emerald-900/55">
                Mật khẩu mới nên có ít nhất 8 ký tự.
              </p>
            </div>

            <div className="space-y-5">
              {successMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errorMessage}
                </div>
              )}

              <PasswordField
                id="current-password"
                label="Mật khẩu cũ"
                value={currentPassword}
                showPassword={showPassword}
                autoComplete="current-password"
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  setErrorMessage('')
                  setSuccessMessage('')
                }}
              />

              <PasswordField
                id="new-password"
                label="Mật khẩu mới"
                value={newPassword}
                showPassword={showPassword}
                autoComplete="new-password"
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setErrorMessage('')
                  setSuccessMessage('')
                }}
              />

              <PasswordField
                id="confirm-password"
                label="Xác nhận mật khẩu"
                value={confirmPassword}
                showPassword={showPassword}
                autoComplete="new-password"
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setErrorMessage('')
                  setSuccessMessage('')
                }}
              />

              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-emerald-900/65">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-4 w-4 rounded border-emerald-200 text-emerald-800 focus:ring-emerald-700"
                />
                Hiện mật khẩu
              </label>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-12 flex-1 items-center justify-center rounded-xl bg-emerald-900 px-6 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_35px_rgba(20,83,45,0.22)] transition-all duration-300 hover:bg-emerald-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:tracking-widest"
                >
                  {isLoading ? (
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
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
                    'Đổi mật khẩu'
                  )}
                </button>

                <Link
                  to="/account"
                  className="flex h-12 items-center justify-center rounded-xl border border-emerald-100 px-6 text-sm font-semibold text-emerald-900 transition-colors hover:border-emerald-700 hover:bg-emerald-50"
                >
                  Quay lại
                </Link>
              </div>

              {successMessage && (
                <button
                  type="button"
                  onClick={() => navigate('/account')}
                  className="text-sm font-semibold text-emerald-900 underline underline-offset-4 transition-colors hover:text-emerald-700"
                >
                  Về tài khoản của tôi
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword