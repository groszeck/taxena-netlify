import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: string[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
