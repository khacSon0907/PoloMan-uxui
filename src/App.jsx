import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { refreshAccessToken, tokenStorage } from './shared/api'

let authBootstrapPromise = null

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function bootstrapAuth() {
  if (!authBootstrapPromise) {
    tokenStorage.setInitializing(true)

    authBootstrapPromise = Promise.all([
      refreshAccessToken().catch(() => {
        if (!tokenStorage.getAccessToken()) {
          tokenStorage.clearAccessToken()
        }
      }),
      wait(700),
    ]).finally(() => {
      tokenStorage.setInitializing(false)
    })
  }

  return authBootstrapPromise
}

function AppSplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white text-black">
      <div className="text-4xl font-light tracking-[0.35em] uppercase sm:text-6xl">
        POLOMAN
      </div>
      <div className="mt-8 h-8 w-8 rounded-full border-2 border-neutral-200 border-t-black animate-spin" />
    </div>
  )
}

function App() {
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    let isMounted = true

    bootstrapAuth().finally(() => {
      if (!isMounted) return

      setIsBootstrapping(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  if (isBootstrapping) {
    return <AppSplashScreen />
  }

  return (
    <RouterProvider router={router} />
  )
}

export default App
