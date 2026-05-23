import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { getApiMessage } from '../shared/api'
import { authApi } from '../features/auth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateRegisterForm({ username, email, password, agreeTerms }) {
  if (!username) return 'Tên người dùng không được để trống'
  if (username.length < 3 || username.length > 30) {
    return 'Tên người dùng phải từ 3 đến 30 ký tự'
  }
  if (!email) return 'Email không được để trống'
  if (!EMAIL_REGEX.test(email)) return 'Email không hợp lệ'
  if (!password) return 'Mật khẩu không được để trống'
  if (password.length < 6 || password.length > 50) {
    return 'Mật khẩu phải từ 6 đến 50 ký tự'
  }
  if (!agreeTerms) return 'Bạn cần đồng ý với điều khoản dịch vụ'
  return ''
}

function Register() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    const payload = {
      username: username.trim(),
      email: email.trim(),
      password,
      agreeTerms,
    }

    const validationMessage = validateRegisterForm(payload)
    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    setErrorMessage('')
    setIsLoading(true)

    try {
      await authApi.register({
        username: payload.username,
        email: payload.email,
        password: payload.password,
      })
      navigate('/login')
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.'))
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength =
    (password.length >= 6 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0)

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
            Tạo tài khoản mới
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="relative">
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setErrorMessage('')
              }}
              required
              minLength={3}
              maxLength={30}
              placeholder=" "
              className="peer w-full h-13 px-4 pt-5 pb-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white outline-none focus:border-black transition-all duration-300"
            />
            <label
              htmlFor="register-username"
              className="absolute left-4 top-2 text-[11px] text-neutral-400 uppercase tracking-wider transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-black"
            >
              Tên người dùng
            </label>
          </div>

          <div className="relative">
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrorMessage('')
              }}
              required
              placeholder=" "
              className="peer w-full h-13 px-4 pt-5 pb-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white outline-none focus:border-black transition-all duration-300"
            />
            <label
              htmlFor="register-email"
              className="absolute left-4 top-2 text-[11px] text-neutral-400 uppercase tracking-wider transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-black"
            >
              Email
            </label>
          </div>

          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrorMessage('')
              }}
              required
              minLength={6}
              maxLength={50}
              placeholder=" "
              className="peer w-full h-13 px-4 pt-5 pb-2 pr-12 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white outline-none focus:border-black transition-all duration-300"
            />
            <label
              htmlFor="register-password"
              className="absolute left-4 top-2 text-[11px] text-neutral-400 uppercase tracking-wider transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-black"
            >
              Mật khẩu
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
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

          {password && (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                      level <= passwordStrength
                        ? passwordStrength <= 1
                          ? 'bg-neutral-400'
                          : passwordStrength <= 2
                            ? 'bg-neutral-500'
                            : passwordStrength <= 3
                              ? 'bg-neutral-700'
                              : 'bg-black'
                        : 'bg-neutral-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-neutral-400">
                Mật khẩu phải từ 6 đến 50 ký tự
              </p>
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked)
                  setErrorMessage('')
                }}
                className="sr-only peer"
              />
              <div className="w-5 h-5 border border-neutral-300 rounded transition-all duration-300 peer-checked:bg-black peer-checked:border-black group-hover:border-neutral-500" />
              <svg
                className={`absolute top-0.5 left-0.5 h-4 w-4 text-white transition-all duration-300 ${
                  agreeTerms ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs text-neutral-500 leading-relaxed">
              Tôi đồng ý với{' '}
              <a href="/terms" className="text-black underline underline-offset-2 hover:no-underline">
                Điều khoản dịch vụ
              </a>{' '}
              và{' '}
              <a href="/privacy" className="text-black underline underline-offset-2 hover:no-underline">
                Chính sách bảo mật
              </a>{' '}
              của PoloMan
            </span>
          </label>

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
              'Tạo tài khoản'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-neutral-500">
          Đã có tài khoản?{' '}
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

export default Register
