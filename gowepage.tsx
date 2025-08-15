const GoWePage: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated, token, logout } = useAuth()
  const [wepages, setWePages] = useState<WePage[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const controllerRef = useRef<AbortController | null>(null)

  const fetchWePages = useCallback(async () => {
    if (!isAuthenticated) return
    if (controllerRef.current) {
      controllerRef.current.abort()
    }
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/.netlify/functions/get-wepages', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      })
      if (!res.ok) {
        if (res.status === 401) {
          logout()
          navigate('/login')
          return
        }
        throw new Error(`Failed to load pages (${res.status})`)
      }
      const data: WePage[] = await res.json()
      setWePages(data)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, token, logout, navigate])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    fetchWePages()
    return () => {
      controllerRef.current?.abort()
    }
  }, [isAuthenticated, navigate, fetchWePages])

  const handleCreate = () => {
    navigate('/wepage/create')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={fetchWePages}>Retry</button>
      </div>
    )
  }

  return (
    <div className="wepage-container">
      <header className="wepage-header">
        <h1>Your WePages</h1>
        <div className="wepage-actions">
          <button onClick={handleCreate}>Create New Page</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>
      {wepages.length === 0 ? (
        <p>No pages found. Create one to get started.</p>
      ) : (
        <ul className="wepage-list">
          {wepages.map(page => (
            <li key={page.id} className="wepage-item">
              <a href={page.url} target="_blank" rel="noopener noreferrer">
                {page.name}
              </a>
              <span className="wepage-date">
                {new Date(page.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default GoWePage