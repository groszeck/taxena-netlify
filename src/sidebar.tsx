import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from './contexts/auth'

const Sidebar: React.FC = (): JSX.Element => {
  const { user, logout } = useAuth()

  if (!user) {
    return <div>Loading...</div>
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <aside className="w-64 bg-gray-800 text-white p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold">CRM Taxena</h2>
      </div>
      
      <nav className="mb-8">
        <ul className="space-y-2">
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `block p-2 rounded ${isActive ? 'bg-blue-600' : 'hover:bg-gray-700'}`
              }
            >
              Dashboard
            </NavLink>
          </li>
        </ul>
      </nav>
      
      <div className="mt-auto">
        <button 
          className="w-full p-2 text-left hover:bg-gray-700 rounded"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar