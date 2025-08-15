function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debounced
}

export const ContactsPage: React.FC = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState<string>('')
  const debouncedSearch = useDebounce(search, 300)
  const [showForm, setShowForm] = useState<boolean>(false)
  const [formData, setFormData] = useState<Partial<Contact>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!token) {
      navigate('/login')
    }
  }, [token, navigate])

  const fetchContacts = async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const res = await fetch(`/api/contacts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      })
      if (!res.ok) throw new Error('Could not load contacts')
      const json = await res.json()
      setContacts(json.contacts || [])
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setError(e.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    controllerRef.current = controller
    fetchContacts(controller.signal)
    return () => {
      controller.abort()
    }
  }, [debouncedSearch, token])

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const openNewForm = () => {
    setFormData({})
    setEditingId(null)
    setShowForm(true)
  }

  const openEditForm = (c: Contact) => {
    setFormData({ ...c })
    setEditingId(c.id)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setFormData({})
    setEditingId(null)
  }

  const handleFormChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const submitForm = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/contacts/${editingId}` : '/api/contacts'
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error(`Failed to ${editingId ? 'update' : 'create'} contact`)
      closeForm()
      await fetchContacts()
    } catch (e: any) {
      setError(e.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = (id: string) => {
    setDeletingId(id)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/contacts/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete contact')
      setDeletingId(null)
      await fetchContacts()
    } catch (e: any) {
      setError(e.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Contacts</h1>

      <div className="flex items-center mb-4 space-x-2">
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={handleSearchChange}
          className="border px-2 py-1 rounded flex-grow"
        />
        <button
          onClick={openNewForm}
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
        >
          New Contact
        </button>
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading && <div className="mb-2">Loading...</div>}

      {!loading && contacts.length === 0 && <div>No contacts found.</div>}

      {!loading && contacts.length > 0 && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">First Name</th>
              <th className="border px-2 py-1">Last Name</th>
              <th className="border px-2 py-1">Email</th>
              <th className="border px-2 py-1">Phone</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(c => (
              <tr key={c.id}>
                <td className="border px-2 py-1">{c.first_name}</td>
                <td className="border px-2 py-1">{c.last_name}</td>
                <td className="border px-2 py-1">{c.email}</td>
                <td className="border px-2 py-1">{c.phone || '-'}</td>
                <td className="border px-2 py-1 space-x-2">
                  <button
                    onClick={() => openEditForm(c)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => confirmDelete(c.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <form
            onSubmit={submitForm}
            className="bg-white p-6 rounded shadow-lg w-full max-w-md"
          >
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Edit Contact' : 'New Contact'}
            </h2>
            <label className="block mb-2">
              First Name
              <input
                name="first_name"
                value={formData.first_name || ''}
                onChange={handleFormChange}
                required
                className="w-full border px-2 py-1 rounded mt-1"
              />
            </label>
            <label className="block mb-2">
              Last Name
              <input
                name="last_name"
                value={formData.last_name || ''}
                onChange={handleFormChange}
                required
                className="w-full border px-2 py-1 rounded mt-1"
              />
            </label>
            <label className="block mb-2">
              Email
              <input
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleFormChange}
                required
                className="w-full border px-2 py-1 rounded mt-1"
              />
            </label>
            <label className="block mb-4">
              Phone
              <input
                name="phone"
                value={formData.phone || ''}
                onChange={handleFormChange}
                className="w-full border px-2 py-1 rounded mt-1"
              />
            </label>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-1 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm text-center">
            <p className="mb-4">Are you sure you want to delete this contact?</p>
            <div className="space-x-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-1 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}