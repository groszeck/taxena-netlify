const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <HomeIcon className="h-6 w-6" /> },
  { label: 'Contacts', path: '/contacts', icon: <UsersIcon className="h-6 w-6" /> },
  { label: 'Companies', path: '/companies', icon: <OfficeBuildingIcon className="h-6 w-6" /> },
  { label: 'Deals', path: '/deals', icon: <CurrencyDollarIcon className="h-6 w-6" /> },
  {
    label: 'Reports',
    path: '/reports',
    icon: <ChartBarIcon className="h-6 w-6" />,
    roles: ['admin', 'manager']
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: <CogIcon className="h-6 w-6" />,
    roles: ['admin']
  }
]

export function initSidebar(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem('sidebarCollapsed') === 'true'
  } catch {
    return false
  }
}

const Sidebar: React.FC = () => {
  const { user } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState<boolean>(false)

  useEffect(() => {
    setCollapsed(initSidebar())
  }, [])

  const toggleSidebar = () => {
    const next = !collapsed
    setCollapsed(next)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sidebarCollapsed', next.toString())
      } catch {}
    }
  }

  return (
    <aside
      className={`flex flex-col h-full bg-gray-800 text-gray-100 transition-[width] duration-200 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && <span className="text-lg font-semibold">Taxena CRM</span>}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-gray-700 focus:outline-none"
          aria-label="Toggle sidebar"
          aria-expanded={!collapsed}
        >
          <MenuIcon className="h-6 w-6" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {navItems
          .filter(item => !item.roles || (user?.role != null && item.roles.includes(user.role)))
          .map(item => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors ${
                  isActive ? 'bg-gray-700 font-medium' : ''
                }`}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        {!collapsed && (
          <div className="text-sm text-gray-400">
            Logged in as{' '}
            <span className="font-medium text-gray-200">{user?.name || 'Guest'}</span>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar