export default function Tasks(): JSX.Element {
  const { token, companyId } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [newTask, setNewTask] = useState<Omit<Task, 'id'>>({
    title: '',
    description: '',
    due_date: '',
    status: 'pending',
    assigned_to: '',
  })
  const [editing, setEditing] = useState<{ [key: number]: boolean }>({})
  const [editValues, setEditValues] = useState<{
    [key: number]: Omit<Task, 'id'>
  }>({})

  const fetchTasks = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/.netlify/functions/tasks?companyId=${companyId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal,
          }
        )
        if (!res.ok) {
          throw new Error(`Failed to load tasks (${res.status})`)
        }
        const data = await res.json()
        setTasks(data.tasks ?? [])
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.name !== 'AbortError') {
            setError(err.message)
          }
        } else {
          setError(String(err))
        }
      } finally {
        setLoading(false)
      }
    },
    [token, companyId]
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchTasks(controller.signal)
    return () => {
      controller.abort()
    }
  }, [fetchTasks])

  const handleNewChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setNewTask(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch(`/.netlify/functions/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...newTask, companyId }),
      })
      if (!res.ok) {
        throw new Error(`Failed to create task (${res.status})`)
      }
      const data = await res.json()
      setTasks(prev => [...prev, data.task])
      setNewTask({
        title: '',
        description: '',
        due_date: '',
        status: 'pending',
        assigned_to: '',
      })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(String(err))
      }
    }
  }

  const toggleEdit = (task: Task) => {
    setEditing(prev => {
      const nextState = !prev[task.id]
      if (nextState) {
        setEditValues(ev => ({
          ...ev,
          [task.id]: {
            title: task.title,
            description: task.description,
            due_date: task.due_date,
            status: task.status,
            assigned_to: task.assigned_to,
          },
        }))
      }
      return { ...prev, [task.id]: nextState }
    })
  }

  const handleEditChange = (
    id: number,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setEditValues(prev => ({
      ...prev,
      [id]: { ...prev[id], [e.target.name]: e.target.value },
    }))
  }

  const handleUpdate = async (id: number) => {
    setError(null)
    try {
      const updated = editValues[id]
      const res = await fetch(`/.netlify/functions/tasks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, companyId, ...updated }),
      })
      if (!res.ok) {
        throw new Error(`Failed to update task (${res.status})`)
      }
      const data = await res.json()
      setTasks(prev => prev.map(t => (t.id === id ? data.task : t)))
      setEditing(prev => ({ ...prev, [id]: false }))
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(String(err))
      }
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this task?'))
      return
    setError(null)
    try {
      const res = await fetch(`/.netlify/functions/tasks`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, companyId }),
      })
      if (!res.ok) {
        throw new Error(`Failed to delete task (${res.status})`)
      }
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(String(err))
      }
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <form onSubmit={handleCreate} className="mb-6 space-y-2">
        <input
          name="title"
          value={newTask.title}
          onChange={handleNewChange}
          placeholder="Title"
          required
          className="border p-2 w-full"
        />
        <textarea
          name="description"
          value={newTask.description}
          onChange={handleNewChange}
          placeholder="Description"
          className="border p-2 w-full"
        />
        <input
          type="date"
          name="due_date"
          value={newTask.due_date}
          onChange={handleNewChange}
          required
          className="border p-2"
        />
        <select
          name="status"
          value={newTask.status}
          onChange={handleNewChange}
          className="border p-2"
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <input
          name="assigned_to"
          value={newTask.assigned_to}
          onChange={handleNewChange}
          placeholder="Assigned To"
          className="border p-2 w-full"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2">
          Add Task
        </button>
      </form>
      {loading ? (
        <div>Loading tasks...</div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2">Title</th>
              <th className="border p-2">Due Date</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Assigned To</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-600">
                  No tasks found.
                </td>
              </tr>
            )}
            {tasks.map(task => (
              <tr key={task.id}>
                <td className="border p-2">
                  {editing[task.id] ? (
                    <input
                      name="title"
                      value={editValues[task.id]?.title || ''}
                      onChange={e => handleEditChange(task.id, e)}
                      className="border p-1 w-full"
                    />
                  ) : (
                    task.title
                  )}
                </td>
                <td className="border p-2">
                  {editing[task.id] ? (
                    <input
                      type="date"
                      name="due_date"
                      value={editValues[task.id]?.due_date || ''}
                      onChange={e => handleEditChange(task.id, e)}
                      className="border p-1"
                    />
                  ) : (
                    task.due_date
                  )}
                </td>
                <td className="border p-2">
                  {editing[task.id] ? (
                    <select
                      name="status"
                      value={editValues[task.id]?.status || 'pending'}
                      onChange={e => handleEditChange(task.id, e)}
                      className="border p-1"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  ) : (
                    task.status
                  )}
                </td>
                <td className="border p-2">
                  {editing[task.id] ? (
                    <input
                      name="assigned_to"
                      value={editValues[task.id]?.assigned_to || ''}
                      onChange={e => handleEditChange(task.id, e)}
                      className="border p-1 w-full"
                    />
                  ) : (
                    task.assigned_to
                  )}
                </td>
                <td className="border p-2 space-x-2">
                  {editing[task.id] ? (
                    <>
                      <button
                        onClick={() => handleUpdate(task.id)}
                        className="bg-green-600 text-white px-2 py-1"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => toggleEdit(task)}
                        className="bg-gray-600 text-white px-2 py-1"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleEdit(task)}
                        className="bg-yellow-500 text-white px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="bg-red-600 text-white px-2 py-1"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}