const ProposalSchema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.number(),
  status: z.string(),
  created_at: z.string(),
})
const ProposalsArraySchema = z.array(ProposalSchema)
const ProposalsResponseSchema = z.union([ProposalsArraySchema, z.object({ proposals: ProposalsArraySchema })])

export default function Proposals(): JSX.Element {
  const { token } = useAuth()
  const [proposals, setProposals] = useState<z.infer<typeof ProposalSchema>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!token) {
      if (isMountedRef.current) {
        setProposals([])
        setLoading(false)
        setError(null)
      }
      return
    }
    const controller = new AbortController()
    const fetchProposals = async () => {
      if (!isMountedRef.current) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/proposals', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || `Error ${res.status}`)
        }
        const json = await res.json()
        const parsed = ProposalsResponseSchema.safeParse(json)
        if (!parsed.success) throw new Error('Invalid response format')
        const data = parsed.data
        const list = Array.isArray(data) ? data : data.proposals
        if (isMountedRef.current) setProposals(list)
      } catch (err: any) {
        if (err.name !== 'AbortError' && isMountedRef.current) {
          setError(err.message || 'Failed to load proposals.')
        }
      } finally {
        if (isMountedRef.current) setLoading(false)
      }
    }
    fetchProposals()
    return () => controller.abort()
  }, [token])

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id)
  }

  const confirmDelete = async () => {
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    if (!id || !token) return
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `Error ${res.status}`)
      }
      if (isMountedRef.current) {
        setProposals(prev => prev.filter(p => p.id !== id))
      }
    } catch (err: any) {
      if (isMountedRef.current) setError(err.message || 'Failed to delete proposal.')
    }
  }

  const cancelDelete = () => {
    setConfirmDeleteId(null)
  }

  return (
    <div className="proposals-page">
      <div className="page-header">
        <h1>Proposals</h1>
        <Link to="/proposals/new" className="button primary">New Proposal</Link>
      </div>

      {loading && <div>Loading proposals...</div>}

      {error && (
        <div className="error">
          Error: {error}
          <button onClick={() => setError(null)} className="button small">Dismiss</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {proposals.length === 0 ? (
            <p>No proposals found.</p>
          ) : (
            <table className="proposal-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map(p => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td>${p.amount.toFixed(2)}</td>
                    <td>{p.status}</td>
                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="actions">
                      <Link to={`/proposals/${p.id}`} className="button small">View</Link>
                      <Link to={`/proposals/edit/${p.id}`} className="button small">Edit</Link>
                      <button onClick={() => handleDeleteClick(p.id)} className="button small danger">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {confirmDeleteId && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <p>Are you sure you want to delete this proposal?</p>
            <div className="confirm-actions">
              <button onClick={confirmDelete} className="button danger">Delete</button>
              <button onClick={cancelDelete} className="button">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}