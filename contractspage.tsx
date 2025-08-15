const ContractsPage = (): JSX.Element => {
  const { token } = useContext(AuthContext)
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState<string>('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const fetchContracts = async () => {
      setError(null)
      setLoading(true)
      try {
        const res = await fetch('/.netlify/functions/getContracts', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })
        if (!res.ok) {
          const errText = await res.text()
          throw new Error(errText || `Error ${res.status}`)
        }
        const data: Contract[] = await res.json()
        setContracts(data)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchContracts()
    return () => {
      controller.abort()
    }
  }, [token])

  const requestDelete = (id: string) => {
    setDeleteError(null)
    setConfirmDeleteId(id)
  }

  const performDelete = async () => {
    if (!confirmDeleteId) return
    setDeleteError(null)
    try {
      const res = await fetch('/.netlify/functions/deleteContract', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: confirmDeleteId }),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || `Delete failed: ${res.status}`)
      }
      setContracts((prev) => prev.filter((c) => c.id !== confirmDeleteId))
      setConfirmDeleteId(null)
    } catch (err: any) {
      setDeleteError(err.message)
    }
  }

  const filtered = contracts.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  if (!token) {
    return (
      <div className="contracts-page">
        <p>Please log in to view contracts.</p>
      </div>
    )
  }

  return (
    <div className="contracts-page">
      <header className="contracts-header">
        <h1>Contracts</h1>
        <button onClick={() => navigate('/contracts/new')} className="btn-primary">
          New Contract
        </button>
      </header>
      <div className="contracts-controls">
        <label htmlFor="searchContracts" className="visually-hidden">
          Search Contracts
        </label>
        <input
          id="searchContracts"
          type="text"
          placeholder="Search by title"
          aria-label="Search by title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading && <p>Loading contracts...</p>}
      {error && <p className="error">Error: {error}</p>}
      {deleteError && <p className="error">Delete Error: {deleteError}</p>}
      {!loading && !error && filtered.length === 0 && <p>No contracts found.</p>}
      {!loading && !error && filtered.length > 0 && (
        <table className="contracts-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td>{new Date(c.start_date).toLocaleDateString()}</td>
                <td>{new Date(c.end_date).toLocaleDateString()}</td>
                <td>{c.status}</td>
                <td>
                  <button onClick={() => navigate(`/contracts/${c.id}`)} className="btn-small">
                    View
                  </button>
                  <button onClick={() => navigate(`/contracts/${c.id}/edit`)} className="btn-small">
                    Edit
                  </button>
                  <button onClick={() => requestDelete(c.id)} className="btn-small btn-danger">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {confirmDeleteId && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <p>Are you sure you want to delete this contract?</p>
            <div className="modal-actions">
              <button onClick={performDelete} className="btn-danger">
                Yes, Delete
              </button>
              <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContractsPage