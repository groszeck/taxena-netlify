const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <FaHome aria-hidden="true" />, roles: ['admin', 'user'] },
  { label: 'Contacts', path: '/contacts', icon: <FaUsers aria-hidden="true" />, roles: ['admin', 'user'] },
  { label: 'Companies', path: '/companies', icon: <FaBuilding aria-hidden="true" />, roles: ['admin'] },
  { label: 'Settings', path: '/settings', icon: <FaCog aria-hidden="true" />, roles: ['admin', 'user'] },
]

const Sidebar: React.FC = (): JSX.Element => {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const toggleCollapse = () => {
    setCollapsed(prev => !prev)
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.topSection}>
        <button
          className={styles.collapseBtn}
          onClick={toggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FaChevronRight aria-hidden="true" /> : <FaChevronLeft aria-hidden="true" />}
        </button>
        {!collapsed && (
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={`${user.name} avatar`} />
              ) : (
                <span>{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className={styles.userName}>{user.name}</div>
          </div>
        )}
      </div>
      <nav className={styles.nav}>
        <ul>
          {navItems
            .filter(item => item.roles.includes(user.role))
            .map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.active : ''}`
                  }
                >
                  <span className={styles.icon}>{item.icon}</span>
                  {!collapsed && <span className={styles.label}>{item.label}</span>}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>
      <div className={styles.bottomSection}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span className={styles.icon}>
            <FaSignOutAlt aria-hidden="true" />
          </span>
          {!collapsed && <span className={styles.label}>Logout</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar