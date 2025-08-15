const API_BASE = import.meta.env.VITE_API_BASE || ''
const FN_BASE = `${API_BASE}/.netlify/functions`

const AdminPanel: React.FC = () => {
  const navigate = useNavigate()
  const token = localStorage.getItem('token') || ''
  if (!token) {
    navigate('/login')
    return null
  }

  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${FN_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      ...options
    })
    if (!res.ok) {
      let msg = res.statusText
      try {
        const errJson = await res.json()
        if (errJson.message) msg = errJson.message
      } catch {}
      throw new Error(msg)
    }
    if (res.status === 204) {
      return null
    }
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      return res.json()
    }
    return null
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [compData, userData] = await Promise.all([
          apiFetch('/companies'),
          apiFetch('/users')
        ])
        setCompanies(compData || [])
        setUsers(userData || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleCompanyStatus = async (company: Company) => {
    try {
      const newStatus = company.status === 'active' ? 'inactive' : 'active'
      await apiFetch(`/companies/${company.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      })
      setCompanies(prev =>
        prev.map(c => (c.id === company.id ? { ...c, status: newStatus } : c))
      )
    } catch (err: any) {
      alert('Error updating company: ' + err.message)
    }
  }

  const deleteCompany = async (companyId: string) => {
    if (!window.confirm('Delete this company and all its data?')) return
    try {
      await apiFetch(`/companies/${companyId}`, { method: 'DELETE' })
      setCompanies(prev => prev.filter(c => c.id !== companyId))
    } catch (err: any) {
      alert('Error deleting company: ' + err.message)
    }
  }

  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      await apiFetch(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      })
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
      )
    } catch (err: any) {
      alert('Error updating user role: ' + err.message)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!window.confirm('Delete this user?')) return
    try {
      await apiFetch(`/users/${userId}`, { method: 'DELETE' })
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err: any) {
      alert('Error deleting user: ' + err.message)
    }
  }

  if (loading) return <div>Loading admin panel...</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>
      <section>
        <h2>Companies</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.status}</td>
                <td>
                  <button onClick={() => toggleCompanyStatus(c)}>
                    {c.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => deleteCompany(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Users</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Company</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.companyId}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={e => changeUserRole(u.id, e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                  <button onClick={() => deleteUser(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export default AdminPanel