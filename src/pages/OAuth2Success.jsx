import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { authApi } from '../features/auth'
import { tokenStorage } from '../shared/api'

function OAuth2Success() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const accessToken = searchParams.get('accessToken') || searchParams.get('token')

    if (!accessToken) {
      navigate('/login', {
        replace: true,
        state: {
          errorMessage: 'Đăng nhập Google thất bại. Vui lòng thử lại.',
        },
      })
      return
    }

    if (typeof tokenStorage.setAccessToken === 'function') {
      tokenStorage.setAccessToken(accessToken)
    } else if (typeof tokenStorage.setToken === 'function') {
      tokenStorage.setToken(accessToken)
    } else if (typeof tokenStorage.setTokens === 'function') {
      tokenStorage.setTokens({ accessToken })
    } else {
      throw new Error('tokenStorage chưa có hàm lưu accessToken vào RAM.')
    }

    authApi
      .getMe()
      .catch(() => undefined)
      .finally(() => {
        navigate('/', { replace: true })
      })
  }, [navigate, searchParams])

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 rounded-full border-2 border-neutral-200 border-t-black animate-spin" />
        <p className="text-sm text-neutral-500">Đang đăng nhập bằng Google...</p>
      </div>
    </div>
  )
}

export default OAuth2Success
