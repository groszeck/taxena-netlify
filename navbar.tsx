const Navbar = (): JSX.Element => {
  const { user, logout } = useAuth()
  const { companies, currentCompany, setCurrentCompany } = useCompany()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async (): Promise<void> => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      alert('Error logging out. Please try again.')
    }
  }

  const baseNavItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { name: 'Dashboard', path: '/' },
      { name: 'Customers', path: '/customers' },
      { name: 'Deals', path: '/deals' },
      { name: 'Reports', path: '/reports' },
    ]
    if (user?.role === 'admin') {
      items.push({ name: 'Admin Panel', path: '/admin' })
    }
    if (user?.role === 'manager') {
      items.push({ name: 'Team', path: '/team' })
    }
    return items
  }, [user?.role])

  return (
    <nav className="navbar">
      <div className="navbar__wrapper">
        <Link to="/" className="navbar__brand">
          Taxena CRM
        </Link>

        <button
          className="navbar__toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(prev => !prev)}
        >
          <span className="navbar__toggle-icon" />
        </button>

        <div className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
          <ul className="navbar__list">
            {baseNavItems.map(item => (
              <li key={item.path} className="navbar__item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    isActive ? 'navbar__link navbar__link--active' : 'navbar__link'
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>

          {companies.length > 1 && (
            <div className="navbar__company-switcher">
              <label htmlFor="company-select" className="sr-only">
                Switch Company
              </label>
              <select
                id="company-select"
                value={currentCompany.id}
                onChange={e => {
                  const selected = companies.find(c => c.id === e.target.value)
                  if (selected) setCurrentCompany(selected)
                }}
                className="navbar__select"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="navbar__profile">
            <button
              className="navbar__profile-button"
              aria-haspopup="true"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen(prev => !prev)}
            >
              {user?.name}
            </button>
            {profileMenuOpen && (
              <ul className="navbar__profile-menu">
                <li>
                  <NavLink
                    to="/profile"
                    className="navbar__profile-link"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      setMenuOpen(false)
                    }}
                  >
                    Profile
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/settings"
                    className="navbar__profile-link"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      setMenuOpen(false)
                    }}
                  >
                    Settings
                  </NavLink>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false)
                      setMenuOpen(false)
                      handleLogout()
                    }}
                    className="navbar__profile-link"
                  >
                    Logout
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar