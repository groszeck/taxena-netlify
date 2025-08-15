export default function LaunchpadPage(): JSX.Element {
  const [data, setData] = useState<LaunchpadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal

    async function fetchData() {
      try {
        const res = await fetch('/.netlify/functions/launchpad', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          signal,
        })
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`)
        }
        const payload = await res.json()
        if (!signal.aborted) {
          setData(payload)
        }
      } catch (err: any) {
        if (!signal.aborted) {
          setError(err.message || 'Unknown error')
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
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Launchpad</h1>
        <p className="text-red-600">Failed to load data: {error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Launchpad</h1>
        <p className="text-gray-600">No data available.</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Welcome to Your Launchpad</h1>
        <p className="text-gray-600">Quick access to your CRM essentials.</p>
      </header>

      <section>
        <h2 className="text-2xl font-medium mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.quickActions.map(action => (
            <Link
              key={action.id}
              to={action.href}
              className="flex items-center p-6 bg-white rounded-lg shadow hover:shadow-md transition"
            >
              <div className="text-3xl text-blue-600 mr-4">{action.icon}</div>
              <span className="text-lg font-medium">{action.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-medium mb-4">Your Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-lg shadow text-center">
            <p className="text-5xl font-bold">{data.stats.contacts}</p>
            <p className="mt-2 text-gray-600">Contacts</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow text-center">
            <p className="text-5xl font-bold">{data.stats.companies}</p>
            <p className="mt-2 text-gray-600">Companies</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow text-center">
            <p className="text-5xl font-bold">{data.stats.deals}</p>
            <p className="mt-2 text-gray-600">Deals</p>
          </div>
        </div>
      </section>
    </div>
  )
}