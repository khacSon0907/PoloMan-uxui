import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { getApiMessage } from '../shared/api'
import { authApi } from '../features/auth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateLoginForm({ email, password }) {
  if (!email) return 'Email không được để trống'
  if (!EMAIL_REGEX.test(email)) return 'Email không đúng định dạng'
  if (!password) return 'Mật khẩu không được để trống'
  return ''
}

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    const payload = {
      email: email.trim(),
      password,
    }

    const validationMessage = validateLoginForm(payload)
    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    setErrorMessage('')
    setIsLoading(true)

    try {
      await authApi.login(payload)
      navigate('/')
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.'))
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
            Đăng nhập hoặc tạo tài khoản
          </p>
        </div>

        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 h-12 border border-neutral-300 rounded-lg bg-white text-sm font-medium text-neutral-700 hover:border-black hover:shadow-sm transition-all duration-300 cursor-pointer group"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span className="group-hover:text-black transition-colors">
            Tiếp tục với Google
          </span>
        </button>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-xs text-neutral-400 uppercase tracking-widest">
              hoặc
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="relative">
            <input
              id="login-email"
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
              htmlFor="login-email"
              className="absolute left-4 top-2 text-[11px] text-neutral-400 uppercase tracking-wider transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-black"
            >
              Email
            </label>
          </div>

          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrorMessage('')
              }}
              required
              placeholder=" "
              className="peer w-full h-13 px-4 pt-5 pb-2 pr-12 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white outline-none focus:border-black transition-all duration-300"
            />
            <label
              htmlFor="login-password"
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

          <div className="flex justify-end">
            <a
              href="/forgot-password"
              className="text-xs text-neutral-500 hover:text-black transition-colors underline underline-offset-4"
            >
              Quên mật khẩu?
            </a>
          </div>

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
              'Đăng nhập'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-neutral-500">
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            className="text-black font-semibold hover:underline underline-offset-4 transition-all"
          >
            Đăng ký ngay
          </Link>
        </p>

        <p className="mt-6 text-center text-[11px] text-neutral-400 leading-relaxed">
          Bằng cách tiếp tục, bạn đồng ý với{' '}
          <a href="/terms" className="underline underline-offset-2 hover:text-black transition-colors">
            Điều khoản dịch vụ
          </a>{' '}
          và{' '}
          <a href="/privacy" className="underline underline-offset-2 hover:text-black transition-colors">
            Chính sách bảo mật
          </a>{' '}
          của chúng tôi.
        </p>
      </div>
    </div>
  )
}

export default Login
