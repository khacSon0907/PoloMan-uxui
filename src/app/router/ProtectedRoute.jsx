import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { hasRole, tokenStorage } from '../../shared/api'

function ProtectedRoute({ requiredRole }) {
  const location = useLocation()
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  if (authSnapshot.isInitializing) {
    return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-neutral-300 border-t-black animate-spin" />
      </div>
    )
  }

  if (!authSnapshot.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (requiredRole && !hasRole(authSnapshot.user, requiredRole)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
