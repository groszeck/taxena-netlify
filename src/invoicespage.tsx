const InvoicesPage: React.FC = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    const controller = new AbortController()
    const fetchInvoices = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/.netlify/functions/getInvoices', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!res.ok) {
          let msg = 'Failed to fetch invoices'
          try {
            const errData = await res.json()
            msg = errData.message || msg
          } catch {}
          throw new Error(msg)
        }
        let data: any
        try {
          data = await res.json()
        } catch {
          throw new Error('Invalid server response')
        }
        setInvoices(data.invoices || [])
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchInvoices()
    return () => {
      controller.abort()
    }
  }, [token, navigate])

  const handleDelete = async (id: string) => {
    if (!token) return
    if (!window.confirm('Are you sure you want to delete this invoice?')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/.netlify/functions/deleteInvoice', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        let msg = 'Failed to delete invoice'
        try {
          const errData = await res.json()
          msg = errData.message || msg
        } catch {}
        throw new Error(msg)
      }
      setInvoices(prev => prev.filter(inv => inv.id !== id))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return null
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <Link
          to="/invoices/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          New Invoice
        </Link>
      </div>
      {loading && <p>Loading invoices...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <>
          {invoices.length === 0 ? (
            <p>No invoices found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white shadow rounded">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Number</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="border-t">
                      <td className="px-4 py-2">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {invoice.number}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">{invoice.customerName}</td>
                      <td className="px-4 py-2 text-right">
                        ${invoice.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">{invoice.status}</td>
                      <td className="px-4 py-2 text-center">
                        <Link
                          to={`/invoices/${invoice.id}/edit`}
                          className="text-green-600 hover:underline mr-2"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          disabled={loading}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default InvoicesPage