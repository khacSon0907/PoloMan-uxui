import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { authApi } from '../features/auth'
import { tokenStorage } from '../shared/api'

function OAuth2Success() {
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true

    async function completeOAuthLogin() {
      try {
        const code = new URLSearchParams(window.location.search).get('code')

        console.log('[OAuth2Success] url:', window.location.href)
        console.log('[OAuth2Success] code exists:', Boolean(code))

        if (!code) {
          throw new Error('Missing OAuth2 code')
        }

        console.log('[OAuth2Success] exchange started')
        const response = await authApi.exchangeOAuth2Code(code)
        console.log('[OAuth2Success] exchange response:', response)

        const accessToken =
          response?.data?.accessToken ||
          response?.data?.data?.accessToken ||
          response?.accessToken

        if (!accessToken) {
          throw new Error('Missing access token from exchange response')
        }

        tokenStorage.setAccessToken(accessToken)

        console.log('[OAuth2Success] getMe started')
        await authApi.getMe()
        console.log('[OAuth2Success] getMe success')

        if (isMounted) {
          navigate('/', { replace: true })
        }
      } catch (error) {
        console.error('[OAuth2Success] failed:', {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
        })

        tokenStorage.clearAccessToken()

        if (isMounted) {
          navigate('/login', {
            replace: true,
            state: {
              errorMessage: 'Đăng nhập Google không thành công. Vui lòng thử lại.',
            },
          })
        }
      }
    }

    completeOAuthLogin()

    return () => {
      isMounted = false
    }
  }, [navigate])

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
