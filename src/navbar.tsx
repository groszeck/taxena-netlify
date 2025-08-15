import React from 'react'
import { useAuth } from './contexts/auth'

const Navbar: React.FC = (): JSX.Element => {
  const { user } = useAuth()

  return (
    <nav className="bg-white shadow-sm border-b px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold text-gray-900">
          Dashboard
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <span className="text-gray-700">
              Welcome, {user.email}
            </span>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar