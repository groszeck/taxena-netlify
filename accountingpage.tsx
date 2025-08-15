const AccountingPage: React.FC = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [amount, setAmount] = useState<number>(0)
  const [type, setType] = useState<'credit' | 'debit'>('credit')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  useEffect(() => {
    const fetchTransactions = async () => {
      setError(null)
      try {
        const res = await fetch('/api/accounting', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        if (!res.ok) {
          throw new Error('Failed to fetch transactions')
        }
        const data: Transaction[] = await res.json()
        setTransactions(data)
      } catch (err: any) {
        setError(err.message || 'Error loading data')
      } finally {
        setLoading(false)
      }
    }
    fetchTransactions()
  }, [token, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    setError(null)
    try {
      const res = await fetch('/api/accounting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date, description, amount, type }),
      })
      if (res.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      if (!res.ok) {
        throw new Error('Failed to add transaction')
      }
      const newTxn: Transaction = await res.json()
      setTransactions(prev => [newTxn, ...prev])
      setDate('')
      setDescription('')
      setAmount(0)
      setType('credit')
    } catch (err: any) {
      setError(err.message || 'Error submitting form')
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="accounting-page">
      <h1>Accounting</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} className="transaction-form">
        <div>
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Amount</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={e => setAmount(parseFloat(e.target.value))}
            required
          />
        </div>
        <div>
          <label>Type</label>
          <select
            value={type}
            onChange={e =>
              setType(e.target.value as 'credit' | 'debit')
            }
          >
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
        </div>
        <button type="submit">Add Transaction</button>
      </form>
      <table className="transactions-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Type</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(txn => (
            <tr key={txn.id}>
              <td>{txn.date}</td>
              <td>{txn.description}</td>
              <td>{txn.type}</td>
              <td>
                {txn.type === 'debit' ? '-' : ''}
                ${txn.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default AccountingPage