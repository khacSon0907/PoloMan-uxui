import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { authApi } from '../features/auth'
import { getApiMessage, tokenStorage } from '../shared/api'

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
        className="peer w-full h-13 px-4 pt-5 pb-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white outline-none focus:border-black transition-all duration-300"
      />
      <label
        htmlFor={id}
        className="absolute left-4 top-2 text-[11px] text-neutral-400 uppercase tracking-wider transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-black"
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
      setErrorMessage(getApiMessage(error, 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="py-8">
      <div className="mb-8 border-b border-neutral-200 pb-8">
        <p className="text-sm uppercase tracking-[0.18em] text-neutral-400">Bảo mật tài khoản</p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-950">Đổi mật khẩu</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md space-y-5" noValidate>
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

        <label className="flex items-center gap-3 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
          />
          Hiện mật khẩu
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={isLoading}
            className="h-12 flex-1 rounded-lg bg-black px-6 text-sm font-semibold uppercase tracking-widest text-white transition-all duration-300 hover:bg-neutral-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              'Đổi mật khẩu'
            )}
          </button>

          <Link
            to="/account"
            className="h-12 rounded-lg border border-neutral-300 px-6 text-sm font-semibold text-neutral-700 transition-colors hover:border-black hover:text-black flex items-center justify-center"
          >
            Quay lại
          </Link>
        </div>

        {successMessage && (
          <button
            type="button"
            onClick={() => navigate('/account')}
            className="text-sm font-semibold text-black underline underline-offset-4"
          >
            Về tài khoản của tôi
          </button>
        )}
      </form>
    </div>
  )
}

export default ChangePassword
