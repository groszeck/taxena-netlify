const FormsPage: React.FC = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    const controller = new AbortController()
    const fetchForms = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/forms', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.message || 'Failed to fetch forms')
        }
        const data = await res.json()
        if (isMountedRef.current) {
          setForms(data.forms || [])
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && isMountedRef.current) {
          setError(err.message)
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }
    fetchForms()
    return () => {
      controller.abort()
    }
  }, [token, navigate])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this form?')) return
    try {
      const res = await fetch(`/api/forms/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.message || 'Failed to delete form')
      }
      if (isMountedRef.current) {
        setForms(prev => prev.filter(f => f.id !== id))
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="forms-page">
      <header className="forms-header">
        <h1>Forms</h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/forms/new')}
        >
          + New Form
        </button>
      </header>
      {loading && <p>Loading forms...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && forms.length === 0 && (
        <p>No forms found. Create a new form to get started.</p>
      )}
      {!loading && !error && forms.length > 0 && (
        <table className="forms-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Created</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {forms.map(form => (
              <tr key={form.id}>
                <td>{form.name}</td>
                <td>{form.description || '-'}</td>
                <td>{new Date(form.createdAt).toLocaleDateString()}</td>
                <td>{new Date(form.updatedAt).toLocaleDateString()}</td>
                <td className="actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate(`/forms/${form.id}/edit`)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(form.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default FormsPage