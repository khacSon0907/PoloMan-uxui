import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { refreshAccessToken, tokenStorage } from './shared/api'

function App() {
  useEffect(() => {
    refreshAccessToken().catch(() => {
      tokenStorage.clearAccessToken()
    })
  }, [])

  return (
    <RouterProvider router={router} />
  )
}

export default App
