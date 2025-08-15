const NetworkPage: React.FC = () => {
  const { token, logout } = useAuth()
  const [networks, setNetworks] = useState<Network[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Omit logout from deps since it's stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!token) {
      setLoading(false)
      logout()
      return
    }

    const controller = new AbortController()
    const signal = controller.signal

    const fetchNetworks = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/networks', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal,
        })
        if (signal.aborted) return
        if (!response.ok) {
          if (response.status === 401) {
            logout()
            return
          }
          throw new Error(`Server error: ${response.statusText}`)
        }
        const data: Network[] = await response.json()
        if (signal.aborted) return
        setNetworks(data)
      } catch (err: any) {
        if (signal.aborted) return
        setError(err.message || 'Unexpected error')
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchNetworks()

    return () => {
      controller.abort()
    }
  }, [token])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-4">Networks</h1>
      {networks.length === 0 ? (
        <p className="text-gray-600">No networks found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-6 text-left">ID</th>
                <th className="py-3 px-6 text-left">Name</th>
                <th className="py-3 px-6 text-left">Description</th>
                <th className="py-3 px-6 text-left">Created At</th>
              </tr>
            </thead>
            <tbody>
              {networks.map((net) => (
                <tr key={net.id} className="border-b last:border-none">
                  <td className="py-3 px-6">{net.id}</td>
                  <td className="py-3 px-6">{net.name}</td>
                  <td className="py-3 px-6">{net.description || '?'}</td>
                  <td className="py-3 px-6">
                    {new Date(net.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default NetworkPage