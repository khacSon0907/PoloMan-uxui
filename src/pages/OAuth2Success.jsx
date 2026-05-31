import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { authApi } from '../features/auth'
import { tokenStorage } from '../shared/api'

function OAuth2Success() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    let isMounted = true

    async function completeOAuthLogin() {
      const accessToken = searchParams.get('accessToken') || searchParams.get('token')

      try {
        if (accessToken) {
          tokenStorage.setAccessToken(accessToken)
        } else {
          await authApi.refreshToken()
        }

        await authApi.getMe()

        if (isMounted) {
          navigate('/', { replace: true })
        }
      } catch {
        tokenStorage.clearAccessToken()

        if (isMounted) {
          navigate('/login', {
            replace: true,
            state: {
              errorMessage: 'Đăng nhập Google thất bại. Vui lòng thử lại.',
            },
          })
        }
      }
    }

    completeOAuthLogin()

    return () => {
      isMounted = false
    }
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
