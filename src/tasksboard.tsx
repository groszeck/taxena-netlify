const STATUSES: { key: Task['status']; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'inprogress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

type Notification = {
  id: number
  type: 'success' | 'error'
  message: string
}

type ConfirmState = {
  isOpen: boolean
  taskId: string | null
}

export default function TasksBoard(): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const [newTitle, setNewTitle] = useState<string>('')
  const [newDescription, setNewDescription] = useState<string>('')
  const [newStatus, setNewStatus] = useState<Task['status']>('todo')

  const [adding, setAdding] = useState<boolean>(false)
  const [updating, setUpdating] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState>({ isOpen: false, taskId: null })

  const nextNotifId = useRef(1)
  const abortController = useRef<AbortController | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    fetchTasks()
    return () => {
      isMounted.current = false
      abortController.current?.abort()
    }
  }, [])

  async function fetchTasks() {
    setLoading(true)
    setError(null)
    abortController.current?.abort()
    const controller = new AbortController()
    abortController.current = controller
    try {
      const res = await fetch('/.netlify/functions/tasks', { signal: controller.signal })
      if (!res.ok) throw new Error(`Error fetching tasks: ${res.statusText}`)
      const data: Task[] = await res.json()
      if (isMounted.current) setTasks(data)
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  function showNotification(type: Notification['type'], message: string) {
    const id = nextNotifId.current++
    setNotifications((n) => [...n, { id, type, message }])
    setTimeout(() => {
      setNotifications((n) => n.filter((x) => x.id !== id))
    }, 3000)
  }

  async function handleAddTask(e: FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || adding) return
    setAdding(true)
    try {
      const res = await fetch('/.netlify/functions/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, description: newDescription, status: newStatus }),
      })
      if (!res.ok) throw new Error(`Error creating task: ${res.statusText}`)
      const created: Task = await res.json()
      setTasks((prev) => [...prev, created])
      setNewTitle('')
      setNewDescription('')
      setNewStatus('todo')
      showNotification('success', 'Task added')
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      if (isMounted.current) setAdding(false)
    }
  }

  function confirmDelete(taskId: string) {
    setConfirmState({ isOpen: true, taskId })
  }

  async function doDeleteTask(id: string) {
    if (deleting[id]) return
    setDeleting((d) => ({ ...d, [id]: true }))
    setConfirmState({ isOpen: false, taskId: null })
    try {
      const res = await fetch(`/.netlify/functions/tasks?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Error deleting task: ${res.statusText}`)
      setTasks((prev) => prev.filter((t) => t.id !== id))
      showNotification('success', 'Task deleted')
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      if (isMounted.current) setDeleting((d) => ({ ...d, [id]: false }))
    }
  }

  async function handleStatusChange(id: string, status: Task['status']) {
    if (updating[id]) return
    setUpdating((u) => ({ ...u, [id]: true }))
    try {
      const res = await fetch(`/.netlify/functions/tasks?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(`Error updating task: ${res.statusText}`)
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
      showNotification('success', 'Task updated')
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      if (isMounted.current) setUpdating((u) => ({ ...u, [id]: false }))
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Tasks Board</h2>

      {notifications.map((n) => (
        <div
          key={n.id}
          style={{
            padding: '8px 12px',
            marginBottom: 8,
            borderRadius: 4,
            color: '#fff',
            backgroundColor: n.type === 'success' ? 'green' : 'red',
          }}
        >
          {n.message}
        </div>
      ))}

      <form onSubmit={handleAddTask} style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label htmlFor="title-input">
          <span className="sr-only">Title</span>
          <input
            id="title-input"
            type="text"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            disabled={adding}
            style={{ padding: 4 }}
          />
        </label>
        <label htmlFor="description-input">
          <span className="sr-only">Description</span>
          <input
            id="description-input"
            type="text"
            placeholder="Description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            disabled={adding}
            style={{ padding: 4 }}
          />
        </label>
        <label htmlFor="status-select">
          <span className="sr-only">Status</span>
          <select
            id="status-select"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as Task['status'])}
            disabled={adding}
            style={{ padding: 4 }}
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={adding}>
          {adding ? 'Adding...' : 'Add Task'}
        </button>
      </form>

      {loading && <p>Loading tasks...</p>}
      {error && (
        <p style={{ color: 'red' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 16 }}>
        {STATUSES.map((status) => (
          <div
            key={status.key}
            style={{
              flex: 1,
              border: '1px solid #ddd',
              borderRadius: 4,
              padding: 8,
            }}
          >
            <h3>{status.label}</h3>
            {tasks
              .filter((t) => t.status === status.key)
              .map((task) => (
                <div
                  key={task.id}
                  style={{
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    padding: 8,
                    marginBottom: 8,
                  }}
                >
                  <strong>{task.title}</strong>
                  <p>{task.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                      disabled={updating[task.id]}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => confirmDelete(task.id)} disabled={deleting[task.id]}>
                      {deleting[task.id] ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>

      {confirmState.isOpen && confirmState.taskId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 4, maxWidth: 300 }}>
            <p>Delete this task?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setConfirmState({ isOpen: false, taskId: null })}>Cancel</button>
              <button onClick={() => doDeleteTask(confirmState.taskId!)}>Yes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}