export function Navbar(): JSX.Element {
  const { user, company, logout, permissions } = useAuth()
  const navigate = useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const handleToggleDropdown = (): void => {
    setIsDropdownOpen(prev => !prev)
  }

  const handleLogout = async (): Promise<void> => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Logout failed', error)
      alert('Logout failed. Please try again.')
    }
  }

  if (!user || !company) {
    return <nav className="navbar">Loading...</nav>
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', perm: 'view_dashboard' },
    { name: 'Contacts', path: '/contacts', perm: 'view_contacts' },
    { name: 'Deals', path: '/deals', perm: 'view_deals' },
    { name: 'Reports', path: '/reports', perm: 'view_reports' },
    { name: 'Settings', path: '/settings', perm: 'manage_settings' }
  ]

  const dropdownMenuId = 'navbar-dropdown-menu'

  return (
    <nav className="navbar">
      <div className="navbar__brand">
        <span className="navbar__company">{company.name || ''}</span>
      </div>
      <ul className="navbar__links">
        {navItems
          .filter(item => permissions.includes(item.perm))
          .map(item => (
            <li key={item.path} className="navbar__item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  isActive
                    ? 'navbar__link navbar__link--active'
                    : 'navbar__link'
                }
              >
                {item.name}
              </NavLink>
            </li>
          ))}
      </ul>
      <div className="navbar__user">
        <span className="navbar__username">{user.name || ''}</span>
        <div className="navbar__dropdown">
          <button
            id="navbar-dropdown-toggle"
            className="navbar__dropdown-toggle"
            onClick={handleToggleDropdown}
            aria-expanded={isDropdownOpen}
            aria-controls={dropdownMenuId}
          >
            ?
          </button>
          {isDropdownOpen && (
            <ul
              id={dropdownMenuId}
              className="navbar__dropdown-menu"
              role="menu"
              aria-labelledby="navbar-dropdown-toggle"
            >
              <li role="menuitem">
                <NavLink
                  to="/profile"
                  className="navbar__dropdown-item"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  Profile
                </NavLink>
              </li>
              <li role="menuitem">
                <button
                  onClick={handleLogout}
                  className="navbar__dropdown-item"
                >
                  Logout
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </nav>
  )
}