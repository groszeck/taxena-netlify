function useAdminData(token: string) {
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [usersRes, companiesRes] = await Promise.all([
        apiClient.get<User[]>('/admin/users', { headers, signal: controller.signal }),
        apiClient.get<Company[]>('/admin/companies', { headers, signal: controller.signal })
      ])
      setUsers(usersRes.data)
      setCompanies(companiesRes.data)
    } catch (e: any) {
      if (axios.isCancel(e) || e.name === 'AbortError') return
      setError(e.response?.data?.message || e.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return { users, companies, loading, error, refresh }
}

export default function AdminPanelPage(): JSX.Element {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const { users, companies, loading, error, refresh } = useAdminData(token)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/')
    }
  }, [user, navigate])

  const companyMap = useMemo(() => {
    const map = new Map<string, string>()
    companies.forEach(c => map.set(c.id, c.name))
    return map
  }, [companies])

  if (loading) {
    return <div>Loading admin data...</div>
  }

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    )
  }

  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>
      <button onClick={refresh}>Refresh Data</button>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Company</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{companyMap.get(u.companyId) ?? 'N/A'}</td>
              <td>{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}