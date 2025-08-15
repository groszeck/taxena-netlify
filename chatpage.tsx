export default function ChatPage(): JSX.Element {
  const { token, user, companyId } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const fetchInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    async function loadMessages() {
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller
      try {
        setError(null)
        const res = await fetch(`/api/chat/messages?companyId=${companyId}`, {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        if (res.ok) {
          const data: Message[] = await res.json()
          setMessages(data)
        } else if (res.status === 401) {
          navigate('/login')
        } else {
          const text = await res.text()
          setError(`Error loading messages: ${res.status} ${text}`)
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load messages', err)
          setError('Failed to load messages')
        }
      }
    }

    loadMessages()
    fetchInterval.current = setInterval(loadMessages, 3000)

    return () => {
      abortControllerRef.current?.abort()
      if (fetchInterval.current) clearInterval(fetchInterval.current)
    }
  }, [token, companyId, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId, text }),
      })
      if (res.ok) {
        setInput('')
        const msg: Message = await res.json()
        setMessages(prev => [...prev, msg])
        setError(null)
      } else if (res.status === 401) {
        navigate('/login')
      } else {
        const text = await res.text()
        setError(`Error sending message: ${res.status} ${text}`)
      }
    } catch (err) {
      console.error('Failed to send message', err)
      setError('Failed to send message')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1rem', background: '#f9f9f9' }}>
        {error && (
          <div style={{ color: 'red', textAlign: 'center', marginBottom: '0.5rem' }}>
            {error}
          </div>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              marginBottom: '0.75rem',
              textAlign: msg.userId === user?.id ? 'right' : 'left',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                borderRadius: '1rem',
                background: msg.userId === user?.id ? '#daf1da' : '#ffffff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#555' }}>{msg.userName}</div>
              <div style={{ marginTop: '0.25rem' }}>{msg.text}</div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          padding: '0.5rem',
          borderTop: '1px solid #ddd',
          background: '#fff',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{
            flexGrow: 1,
            padding: '0.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #ccc',
            marginRight: '0.5rem',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: '#007acc',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}