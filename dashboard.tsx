export default function Dashboard() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  useEffect(() => {
    if (!token) {
      setError('You must be logged in to view the dashboard.')
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const signal = controller.signal

    const sanitizeError = (err: unknown) => {
      if (err instanceof Error) {
        const msg = err.message.toLowerCase()
        if (msg.includes('401') || msg.includes('token')) {
          return 'Your session has expired. Please log in again.'
        }
        if (msg.includes('403')) {
          return 'You do not have permission to access this resource.'
        }
        if (msg.includes('network')) {
          return 'Network error. Please check your connection.'
        }
      }
      return 'An unexpected error occurred. Please try again later.'
    }

    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal,
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `Request failed with status ${res.status}`)
        }
        const json: DashboardResponse = await res.json()
        if (!signal.aborted) {
          setData(json)
        }
      } catch (err) {
        if (!signal.aborted) {
          setError(sanitizeError(err))
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      controller.abort()
    }
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-500">Loading dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-6">
        Welcome back, {user?.firstName || user?.email}
      </h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white shadow rounded-lg p-5">
          <h2 className="text-lg font-medium text-gray-700">Contacts</h2>
          <p className="mt-2 text-2xl font-bold">{data?.totalContacts ?? 0}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-5">
          <h2 className="text-lg font-medium text-gray-700">Leads</h2>
          <p className="mt-2 text-2xl font-bold">{data?.totalLeads ?? 0}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-5">
          <h2 className="text-lg font-medium text-gray-700">Deals</h2>
          <p className="mt-2 text-2xl font-bold">{data?.totalDeals ?? 0}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-5">
          <h2 className="text-lg font-medium text-gray-700">Companies</h2>
          <p className="mt-2 text-2xl font-bold">{data?.totalCompanies ?? 0}</p>
        </div>
      </div>
    </div>
  )
}