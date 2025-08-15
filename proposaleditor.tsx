const defaultProposal: Proposal = {
  title: '',
  clientName: '',
  amount: 0,
  dueDate: '',
  status: 'draft',
  notes: '',
}

const ProposalEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [proposal, setProposal] = useState<Proposal>(defaultProposal)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    const signal = controller.signal
    setLoading(true)
    setError('')
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    fetch(`/api/proposals/${id}`, { headers, signal })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.message || 'Failed to fetch proposal')
        }
        return res.json()
      })
      .then((data: Proposal) => {
        let due = ''
        if (typeof data.dueDate === 'string' && data.dueDate.length >= 10) {
          due = data.dueDate.slice(0, 10)
        }
        setProposal({
          ...defaultProposal,
          ...data,
          dueDate: due,
        })
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message)
        }
      })
      .finally(() => {
        setLoading(false)
      })
    return () => {
      controller.abort()
    }
  }, [id])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setProposal(prev => {
      if (name === 'amount') {
        let num = 0
        if (value !== '') {
          const parsed = parseFloat(value)
          num = isNaN(parsed) ? prev.amount : parsed
        }
        return { ...prev, amount: num }
      }
      return { ...prev, [name]: value }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const token = localStorage.getItem('token')
    const method = id ? 'PUT' : 'POST'
    const url = id ? `/api/proposals/${id}` : '/api/proposals'
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(proposal),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((result as any).message || 'Save failed')
      }
      navigate('/proposals')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="proposal-editor">
      <h2>{id ? 'Edit Proposal' : 'New Proposal'}</h2>
      {error && <div className="error">{error}</div>}
      {loading && <div>Loading...</div>}
      {!loading && (
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="title">Title*</label>
            <input
              id="title"
              name="title"
              type="text"
              value={proposal.title}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="clientName">Client Name*</label>
            <input
              id="clientName"
              name="clientName"
              type="text"
              value={proposal.clientName}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="amount">Amount*</label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              value={proposal.amount}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="dueDate">Due Date*</label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              value={proposal.dueDate}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="status">Status*</label>
            <select
              id="status"
              name="status"
              value={proposal.status}
              onChange={handleChange}
              required
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>
          </div>
          <div>
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={proposal.notes}
              onChange={handleChange}
            />
          </div>
          <button type="submit" disabled={loading}>
            {id ? 'Update Proposal' : 'Create Proposal'}
          </button>
        </form>
      )}
    </div>
  )
}

export default ProposalEditor