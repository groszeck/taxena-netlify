const AccountingInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  updatedAt: z.string(),
})
const AccountingInfoArraySchema = z.array(AccountingInfoSchema)
type AccountingInfo = z.infer<typeof AccountingInfoSchema>

const InformacjeKsiegowePage: React.FC = () => {
  const [data, setData] = useState<AccountingInfo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()
    const token = localStorage.getItem('authToken')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    setLoading(true)
    setError(null)
    const apiBase = import.meta.env.VITE_API_URL ?? ''
    fetch(`${apiBase}/api/informacje-ksiegowe`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          navigate('/login', { replace: true })
          throw new Error('Brak autoryzacji, przekierowanie do logowania')
        }
        if (!res.ok) {
          throw new Error(`B??d serwera: ${res.status} ${res.statusText}`)
        }
        return res.json()
      })
      .then(raw => {
        const result = AccountingInfoArraySchema.safeParse(raw)
        if (!result.success) {
          console.error('Walidacja danych nie powiod?a si?:', result.error)
          throw new Error('Otrzymano nieprawid?owy format danych')
        }
        setData(result.data)
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span>?adowanie danych...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <strong>Wyst?pi? b??d:</strong> {error}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Informacje ksi?gowe</h1>
      {data.length === 0 ? (
        <p>Brak dost?pnych danych ksi?gowych.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">ID</th>
                <th className="px-4 py-2 border">Nazwa</th>
                <th className="px-4 py-2 border">Warto??</th>
                <th className="px-4 py-2 border">Ostatnia aktualizacja</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{item.id}</td>
                  <td className="px-4 py-2 border">{item.name}</td>
                  <td className="px-4 py-2 border">{item.value}</td>
                  <td className="px-4 py-2 border">
                    {new Date(item.updatedAt).toLocaleString()}
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

export default InformacjeKsiegowePage